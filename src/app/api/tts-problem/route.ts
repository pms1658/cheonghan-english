import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { ttsProblemRequestSchema } from '@/schemas/api';

// Vercel Hobby plan max: 60s
export const maxDuration = 60;

/**
 * TTS ë¬¸ì œë³??©ì„± API ??Google Cloud TTS (Studio ?Œì„± 16kHz)
 * POST /api/tts-problem
 * Body: { lines: { speaker, text, lang }[], problemNumber: number }
 * Returns: { audioContent: base64 WAV }
 *
 * ê°?ë¬¸ì œ???€ë³?script)????ë²ˆì— ?©ì„±?˜ì—¬ ?˜ë‚˜??WAVë¡?ë°˜í™˜.
 * ê´€ë¦¬ìê°€ ê³¼ì œ ?ì„± ???¬ì „ ìºì‹±?©ìœ¼ë¡??¬ìš©.
 *
 * ??Studio 16kHz = ê¸°ì¡´ 24kHz ?€ë¹?33% ?©ëŸ‰ ê°ì†Œ, ?ˆì§ˆ ? ì?
 *   M: en-US-Studio-Q (?¨ì„±), W: en-US-Studio-O (?¬ì„±), N: ko-KR-Neural2-B (?œêµ­??
 */

// ?€?€ Voice config ??Google Cloud TTS Studio (same as /api/tts) ?€?€
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
    M: { languageCode: 'en-US', name: 'en-US-Studio-Q' },  // Natural Male
    W: { languageCode: 'en-US', name: 'en-US-Studio-O' },  // Natural Female
    N: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' }, // Korean narrator
};

// ?œì???«ì ë³€??(TTSê°€ "?¼ë²ˆ" "??œ¡ë²??¼ë¡œ ?•í™•???½ë„ë¡?
const SINO_KOREAN: Record<number, string> = {
    0: '??, 1: '??, 2: '??, 3: '??, 4: '??, 5: '??,
    6: '??, 7: 'ì¹?, 8: '??, 9: 'êµ?, 10: '??,
    11: '??¼', 12: '??´', 13: '??‚¼', 14: '??‚¬', 15: '??˜¤',
    16: '??œ¡', 17: '??¹ ',
};

function toSinoKorean(n: number): string {
    if (SINO_KOREAN[n]) return SINO_KOREAN[n];
    if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        const tensStr = tens === 1 ? '?? : (SINO_KOREAN[tens] || tens) + '??;
        const onesStr = ones === 0 ? '' : (SINO_KOREAN[ones] || String(ones));
        return tensStr + onesStr;
    }
    return String(n);
}

function convertNumbersInKorean(text: string): string {
    return text.replace(/(\d+)ë²?g, (_, numStr) => {
        return toSinoKorean(parseInt(numStr, 10)) + 'ë²?;
    }).replace(/(\d+)êµì‹œ/g, (_, numStr) => {
        return toSinoKorean(parseInt(numStr, 10)) + 'êµì‹œ';
    });
}

// ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•
// ë¬´ë?ì§€??Stage Direction) ?„í„°ë§?
// [Pause], [Cell phone rings.], [Tapping sound] ?±ì„ TTS?ì„œ ?œê±°
// ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•

/** ?„ì²´ê°€ ë¬´ë?ì§€?œì¸ ?¼ì¸?¸ì? ?ë³„ (?? "[Cell phone rings.]") */
function isStagDirectionOnly(text: string): boolean {
    const trimmed = text.trim();
    // ?„ì²´ê°€ [...]ë¡œë§Œ ?´ë£¨?´ì§„ ê²½ìš°
    return /^\[.+\]\s*$/.test(trimmed);
}

/** ?ìŠ¤?????¸ë¼??ë¬´ë?ì§€???œê±° (?? "Let me check. [Pause] Oh..." ??"Let me check. Oh...") */
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
        .replace(/\[\w[^\]]*\]/g, ' ')  // ê¸°í? ëª¨ë“  [?€ê´„í˜¸ ?´ìš©] ?œê±°
        .replace(/\s{2,}/g, ' ')         // ?¤ì¤‘ ê³µë°± ?•ë¦¬
        .trim();
}

/** ë¬´ë?ì§€???¼ì¸???€?‘í•˜??ì¹¨ë¬µ ?œê°„(ms) */
function getStageDirectionSilenceMs(text: string): number {
    const t = text.trim().toLowerCase();
    if (t.includes('pause')) return 1500;
    if (t.includes('phone rings') || t.includes('telephone rings')) return 2000;
    if (t.includes('tapping') || t.includes('typing') || t.includes('clicking')) return 1500;
    if (t.includes('knock') || t.includes('doorbell')) return 1500;
    return 1000; // ê¸°í? ?¨ê³¼??
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

// ??Noise Gate + Fade: ?¸ê·¸ë¨¼íŠ¸ ê²½ê³„ ?´ë¦­/???Œë¦¬ ?„ì „ ?œê±°
// 1) threshold ?´í•˜???‘ì? ?¸ì´ì¦ˆë? ?ë’¤?ì„œ ?˜ë¼??(noise gate)
// 2) ë¶€?œëŸ¬??fade-in/out?¼ë¡œ ?Œí˜• ë¶ˆì—°???œê±°
function applyFade(pcm: Buffer, fadeSamples = 250, threshold = 150): Buffer {
    const result = Buffer.from(pcm); // ?ë³¸ ë³´ì¡´
    const totalSamples = Math.floor(result.length / 2);
    if (totalSamples < fadeSamples * 2) return result;

    // ?€?€ Noise Gate: ?ìª½?ì„œ threshold ?´í•˜???˜í”Œ ?œê±° ?€?€
    let trimStart = 0;
    for (let i = 0; i < Math.min(fadeSamples * 2, totalSamples); i++) {
        const sample = Math.abs(result.readInt16LE(i * 2));
        if (sample > threshold) break;
        result.writeInt16LE(0, i * 2);
        trimStart = i;
    }

    // ?€?€ Noise Gate: ?¤ìª½?ì„œ threshold ?´í•˜???˜í”Œ ?œê±° ?€?€
    for (let i = totalSamples - 1; i > Math.max(totalSamples - fadeSamples * 2, 0); i--) {
        const sample = Math.abs(result.readInt16LE(i * 2));
        if (sample > threshold) break;
        result.writeInt16LE(0, i * 2);
    }

    // ?€?€ Fade-in (ì²˜ìŒ fadeSamplesê°? ?€?€
    for (let i = 0; i < fadeSamples; i++) {
        const offset = i * 2;
        const sample = result.readInt16LE(offset);
        const factor = i / fadeSamples; // 0 ??1
        result.writeInt16LE(Math.round(sample * factor), offset);
    }

    // ?€?€ Fade-out (ë§ˆì?ë§?fadeSamplesê°? ?€?€
    for (let i = 0; i < fadeSamples; i++) {
        const offset = (totalSamples - fadeSamples + i) * 2;
        const sample = result.readInt16LE(offset);
        const factor = (fadeSamples - i) / fadeSamples; // 1 ??0
        result.writeInt16LE(Math.round(sample * factor), offset);
    }

    return result;
}

// ?€?€ Call Google Cloud TTS for a single text ?€?€
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
                        audioEncoding: 'LINEAR16',      // Raw PCM ??compatible with concat
                        sampleRateHertz: 16000,          // 16kHz (?™êµ ?¤í”¼ì»?ì¶©ë¶„)
                        speakingRate: 0.90,              // ???˜ëŠ¥ ?ë„ (?´ì§ ?ë¦¼)
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

        // Pre-process all lines (??ë¬´ë?ì§€???„í„°ë§??¬í•¨)
        const lineConfigs = lines.map((line: any) => {
            const rawText = line.text || '';

            // ???„ì²´ê°€ ë¬´ë?ì§€?œì¸ ?¼ì¸ ??ì¹¨ë¬µ?¼ë¡œ ?€ì²?
            if (isStagDirectionOnly(rawText)) {
                return {
                    textToSpeak: null, // TTS ?¸ì¶œ ????
                    silenceMs: getStageDirectionSilenceMs(rawText),
                    voiceConfig: null,
                    speaker: line.speaker,
                    isStageDirection: true,
                };
            }

            // ???¸ë¼??ë¬´ë?ì§€???œê±° (?? "Let me check. [Pause] Oh...")
            let textToSpeak = stripStageDirections(rawText);
            if (line.lang === 'ko' || line.speaker === 'N') {
                textToSpeak = convertNumbersInKorean(textToSpeak);
            }

            // ?„í„°ë§????ìŠ¤?¸ê? ë¹„ì—ˆ?¼ë©´ ì¹¨ë¬µ ì²˜ë¦¬
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

        // Generate all lines in parallel batches (??ë¬´ë?ì§€?œëŠ” ì¹¨ë¬µ ë²„í¼ë¡??€ì²?
        const BATCH_SIZE = 5;
        const lineResults: (Buffer | null)[] = new Array(lines.length).fill(null);

        for (let batchStart = 0; batchStart < lineConfigs.length; batchStart += BATCH_SIZE) {
            const batch = lineConfigs.slice(batchStart, batchStart + BATCH_SIZE);
            const promises = batch.map((cfg: any) => {
                if (cfg.isStageDirection) {
                    // ??ë¬´ë?ì§€????ì¹¨ë¬µ ë²„í¼ ?ì„± (TTS ?¸ì¶œ ????
                    return Promise.resolve(createSilence(cfg.silenceMs || 1000));
                }
                return generateTTS(cfg.textToSpeak, cfg.voiceConfig, apiKey);
            });
            const results = await Promise.all(promises);
            results.forEach((pcm, i) => {
                lineResults[batchStart + i] = pcm;
            });
        }

        // Assemble PCM in order with gaps (??fade ?ìš©?˜ì—¬ ?¸ê¹ ?Œë¦¬ ?œê±°)
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

        console.log(`[TTS-Problem] Problem ${problemNumber}: ${lines.length} lines ??${(wavBuffer.length / 1024).toFixed(0)}KB WAV (Studio 16kHz)`);

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
