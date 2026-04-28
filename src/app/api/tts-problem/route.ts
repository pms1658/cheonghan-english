import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { ttsProblemRequestSchema } from '@/schemas/api';

// Vercel Hobby plan max: 60s
export const maxDuration = 60;

/**
 * TTS 문제별 합성 API — Google Cloud TTS (Studio 음성 16kHz)
 * POST /api/tts-problem
 * Body: { lines: { speaker, text, lang }[], problemNumber: number }
 * Returns: { audioContent: base64 WAV }
 *
 * 각 문제의 대본(script)을 한 번에 합성하여 하나의 WAV로 반환.
 * 관리자가 과제 생성 시 사전 캐싱용으로 사용.
 *
 * ★ Studio 16kHz = 기존 24kHz 대비 33% 용량 감소, 품질 유지
 *   M: en-US-Studio-Q (남성), W: en-US-Studio-O (여성), N: ko-KR-Neural2-B (한국어)
 */

// ── Voice config — Google Cloud TTS Studio (same as /api/tts) ──
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
    M: { languageCode: 'en-US', name: 'en-US-Studio-Q' },  // Natural Male
    W: { languageCode: 'en-US', name: 'en-US-Studio-O' },  // Natural Female
    N: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' }, // Korean narrator
};

// 한자어 숫자 변환 (TTS가 "일번" "십육번"으로 정확히 읽도록)
const SINO_KOREAN: Record<number, string> = {
    0: '영', 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오',
    6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십',
    11: '십일', 12: '십이', 13: '십삼', 14: '십사', 15: '십오',
    16: '십육', 17: '십칠',
};

function toSinoKorean(n: number): string {
    if (SINO_KOREAN[n]) return SINO_KOREAN[n];
    if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        const tensStr = tens === 1 ? '십' : (SINO_KOREAN[tens] || tens) + '십';
        const onesStr = ones === 0 ? '' : (SINO_KOREAN[ones] || String(ones));
        return tensStr + onesStr;
    }
    return String(n);
}

function convertNumbersInKorean(text: string): string {
    return text.replace(/(\d+)번/g, (_, numStr) => {
        return toSinoKorean(parseInt(numStr, 10)) + '번';
    }).replace(/(\d+)교시/g, (_, numStr) => {
        return toSinoKorean(parseInt(numStr, 10)) + '교시';
    });
}

// ══════════════════════════════════════
// 무대지시(Stage Direction) 필터링
// [Pause], [Cell phone rings.], [Tapping sound] 등을 TTS에서 제거
// ══════════════════════════════════════

/** 전체가 무대지시인 라인인지 판별 (예: "[Cell phone rings.]") */
function isStagDirectionOnly(text: string): boolean {
    const trimmed = text.trim();
    // 전체가 [...]로만 이루어진 경우
    return /^\[.+\]\s*$/.test(trimmed);
}

/** 텍스트 내 인라인 무대지시 제거 (예: "Let me check. [Pause] Oh..." → "Let me check. Oh...") */
function stripStageDirections(text: string): string {
    return text
        .replace(/\[Pause\]/gi, ' ')
        .replace(/\[Cell phone rings\.?\]/gi, ' ')
        .replace(/\[Telephone rings\.?\]/gi, ' ')
        .replace(/\[Tapping sound\]/gi, ' ')
        .replace(/\[Typing sounds?\]/gi, ' ')
        .replace(/\[Mouse clicking sound\]/gi, ' ')
        .replace(/\[Knocking( sound)?\]/gi, ' ')
        .replace(/\[Doorbell( rings)?\.?\]/gi, ' ')
        .replace(/\[\w[^\]]*\]/g, ' ')  // 기타 모든 [대괄호 내용] 제거
        .replace(/\s{2,}/g, ' ')         // 다중 공백 정리
        .trim();
}

/** 무대지시 라인에 대응하는 침묵 시간(ms) */
function getStageDirectionSilenceMs(text: string): number {
    const t = text.trim().toLowerCase();
    if (t.includes('pause')) return 1500;
    if (t.includes('phone rings') || t.includes('telephone rings')) return 2000;
    if (t.includes('tapping') || t.includes('typing') || t.includes('clicking')) return 1500;
    if (t.includes('knock') || t.includes('doorbell')) return 1500;
    return 1000; // 기타 효과음
}

// WAV header for PCM 16-bit 24kHz mono
function createWavHeader(pcmLength: number, sampleRate = 16000, channels = 1, bitsPerSample = 16): Buffer {
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmLength, 40);

    return header;
}

// Generate silence buffer (PCM 16-bit 16kHz mono)
function createSilence(durationMs: number, sampleRate = 16000): Buffer {
    const samples = Math.floor((durationMs / 1000) * sampleRate);
    return Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample
}

// ★ Noise Gate + Fade: 세그먼트 경계 클릭/틱 소리 완전 제거
// 1) threshold 이하의 작은 노이즈를 앞뒤에서 잘라냄 (noise gate)
// 2) 부드러운 fade-in/out으로 파형 불연속 제거
function applyFade(pcm: Buffer, fadeSamples = 250, threshold = 150): Buffer {
    const result = Buffer.from(pcm); // 원본 보존
    const totalSamples = Math.floor(result.length / 2);
    if (totalSamples < fadeSamples * 2) return result;

    // ── Noise Gate: 앞쪽에서 threshold 이하인 샘플 제거 ──
    let trimStart = 0;
    for (let i = 0; i < Math.min(fadeSamples * 2, totalSamples); i++) {
        const sample = Math.abs(result.readInt16LE(i * 2));
        if (sample > threshold) break;
        result.writeInt16LE(0, i * 2);
        trimStart = i;
    }

    // ── Noise Gate: 뒤쪽에서 threshold 이하인 샘플 제거 ──
    for (let i = totalSamples - 1; i > Math.max(totalSamples - fadeSamples * 2, 0); i--) {
        const sample = Math.abs(result.readInt16LE(i * 2));
        if (sample > threshold) break;
        result.writeInt16LE(0, i * 2);
    }

    // ── Fade-in (처음 fadeSamples개) ──
    for (let i = 0; i < fadeSamples; i++) {
        const offset = i * 2;
        const sample = result.readInt16LE(offset);
        const factor = i / fadeSamples; // 0 → 1
        result.writeInt16LE(Math.round(sample * factor), offset);
    }

    // ── Fade-out (마지막 fadeSamples개) ──
    for (let i = 0; i < fadeSamples; i++) {
        const offset = (totalSamples - fadeSamples + i) * 2;
        const sample = result.readInt16LE(offset);
        const factor = (fadeSamples - i) / fadeSamples; // 1 → 0
        result.writeInt16LE(Math.round(sample * factor), offset);
    }

    return result;
}

// ── Call Google Cloud TTS for a single text ──
async function generateTTS(
    text: string,
    voiceConfig: { languageCode: string; name: string },
    apiKey: string,
): Promise<Buffer | null> {
    try {
        const res = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text },
                    voice: voiceConfig,
                    audioConfig: {
                        audioEncoding: 'LINEAR16',      // Raw PCM — compatible with concat
                        sampleRateHertz: 16000,          // 16kHz (학교 스피커 충분)
                        speakingRate: 0.90,              // ★ 수능 속도 (살짝 느림)
                    }
                }),
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[TTS-Problem] Google Cloud TTS error ${res.status}:`, errText);
            return null;
        }

        const data = await res.json();
        const pcmBase64 = data.audioContent;
        if (!pcmBase64) return null;

        return Buffer.from(pcmBase64, 'base64');
    } catch (err: any) {
        console.error('[TTS-Problem] Error:', err.message);
        return null;
    }
}

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(ttsProblemRequestSchema, body, 'tts-problem');
        const { lines, problemNumber } = body;

        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ error: 'Lines are required' }, { status: 400 });
        }

        // Use GOOGLE_TTS_API_KEY first (same priority as /api/tts)
        const apiKey = process.env.GOOGLE_TTS_API_KEY
            || process.env.GEMINI_API_KEY
            || process.env.NEXT_PUBLIC_GEMINI_API_KEY
            || '';

        if (!apiKey) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        console.log(`[TTS-Problem] Generating audio for problem ${problemNumber}: ${lines.length} lines (Google Cloud TTS Studio)`);

        // Pre-process all lines (★ 무대지시 필터링 포함)
        const lineConfigs = lines.map((line: any) => {
            const rawText = line.text || '';

            // ★ 전체가 무대지시인 라인 → 침묵으로 대체
            if (isStagDirectionOnly(rawText)) {
                return {
                    textToSpeak: null, // TTS 호출 안 함
                    silenceMs: getStageDirectionSilenceMs(rawText),
                    voiceConfig: null,
                    speaker: line.speaker,
                    isStageDirection: true,
                };
            }

            // ★ 인라인 무대지시 제거 (예: "Let me check. [Pause] Oh...")
            let textToSpeak = stripStageDirections(rawText);
            if (line.lang === 'ko' || line.speaker === 'N') {
                textToSpeak = convertNumbersInKorean(textToSpeak);
            }

            // 필터링 후 텍스트가 비었으면 침묵 처리
            if (!textToSpeak.trim()) {
                return {
                    textToSpeak: null,
                    silenceMs: 500,
                    voiceConfig: null,
                    speaker: line.speaker,
                    isStageDirection: true,
                };
            }

            let voiceKey = line.speaker || 'M';
            if (line.lang === 'ko' || voiceKey === 'N') voiceKey = 'N';
            const voiceConfig = VOICE_MAP[voiceKey] || VOICE_MAP['M'];
            return { textToSpeak, voiceConfig, speaker: line.speaker, isStageDirection: false };
        });

        // Generate all lines in parallel batches (★ 무대지시는 침묵 버퍼로 대체)
        const BATCH_SIZE = 5;
        const lineResults: (Buffer | null)[] = new Array(lines.length).fill(null);

        for (let batchStart = 0; batchStart < lineConfigs.length; batchStart += BATCH_SIZE) {
            const batch = lineConfigs.slice(batchStart, batchStart + BATCH_SIZE);
            const promises = batch.map((cfg: any) => {
                if (cfg.isStageDirection) {
                    // ★ 무대지시 → 침묵 버퍼 생성 (TTS 호출 안 함)
                    return Promise.resolve(createSilence(cfg.silenceMs || 1000));
                }
                return generateTTS(cfg.textToSpeak, cfg.voiceConfig, apiKey);
            });
            const results = await Promise.all(promises);
            results.forEach((pcm, i) => {
                lineResults[batchStart + i] = pcm;
            });
        }

        // Assemble PCM in order with gaps (★ fade 적용하여 딸깍 소리 제거)
        const pcmBuffers: Buffer[] = [];
        for (let i = 0; i < lineResults.length; i++) {
            if (lineResults[i]) {
                pcmBuffers.push(applyFade(lineResults[i]!));
            }
            // Add gap between lines
            if (i < lineResults.length - 1) {
                const nextSpeaker = lines[i + 1]?.speaker;
                const gapMs = nextSpeaker && nextSpeaker !== lines[i].speaker ? 400 : 200;
                pcmBuffers.push(createSilence(gapMs));
            }
        }

        if (pcmBuffers.length === 0) {
            return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
        }

        // Combine all PCM buffers + WAV header
        const combinedPcm = Buffer.concat(pcmBuffers);
        const wavHeader = createWavHeader(combinedPcm.length);
        const wavBuffer = Buffer.concat([wavHeader, combinedPcm]);
        const wavBase64 = wavBuffer.toString('base64');

        console.log(`[TTS-Problem] Problem ${problemNumber}: ${lines.length} lines → ${(wavBuffer.length / 1024).toFixed(0)}KB WAV (Studio 16kHz)`);

        return NextResponse.json({
            audioContent: wavBase64,
            format: 'wav',
            problemNumber,
            sizeBytes: wavBuffer.length,
        });

    } catch (error) {
        return createErrorResponse(error, 'TTS problem generation failed');
    }
}
