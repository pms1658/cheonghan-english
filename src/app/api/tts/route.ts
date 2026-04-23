import { NextResponse } from 'next/server';

/**
 * Gemini TTS API 프록시 (서버 캐시 포함)
 * POST /api/tts
 * Body: { text, speaker ('M'|'W'|'N'), lang ('en'|'ko') }
 * Returns: { audioContent: base64 WAV }
 *
 * Uses Gemini 2.5 Flash TTS — works with the standard GEMINI_API_KEY!
 * No separate Google Cloud TTS API key needed.
 */

// ── Server-side audio cache ──
const audioCache = new Map<string, { base64: string; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2시간

function getCachedAudio(key: string): string | null {
    const entry = audioCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        audioCache.delete(key);
        return null;
    }
    return entry.base64;
}

function setCachedAudio(key: string, base64: string) {
    if (audioCache.size > 500) {
        const oldest = [...audioCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, 100);
        oldest.forEach(([k]) => audioCache.delete(k));
    }
    audioCache.set(key, { base64, timestamp: Date.now() });
}

// ── WAV header for PCM 16-bit 16kHz mono ──
function createWavHeader(pcmLength: number, sampleRate = 16000, channels = 1, bitsPerSample = 16): Buffer {
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);       // Subchunk1Size
    header.writeUInt16LE(1, 20);        // AudioFormat (PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmLength, 40);

    return header;
}

// ── Voice name mapping for Google Cloud TTS ──
// Studio = Google's highest quality tier (most natural, human-like)
// Korean uses Neural2 (Studio not available for ko-KR)
const VOICE_MAP: Record<string, { languageCode: string, name: string }> = {
    M: { languageCode: 'en-US', name: 'en-US-Studio-Q' },  // Natural Male
    W: { languageCode: 'en-US', name: 'en-US-Studio-O' },  // Natural Female
    N: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' }, // Korean narrator
};

export async function POST(req: Request) {
    try {
        const { text, speaker = 'M', lang } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        let voiceKey = speaker;
        if (lang === 'ko' || speaker === 'N') {
            voiceKey = 'N';
        }
        const voiceConfig = VOICE_MAP[voiceKey] || VOICE_MAP['M'];

        // ── Check server cache ──
        const cacheKey = `${voiceKey}_${text}`;
        const cached = getCachedAudio(cacheKey);
        if (cached) {
            return NextResponse.json({ audioContent: cached, cached: true });
        }

        // Use GOOGLE_TTS_API_KEY first, then GEMINI API KEY as fallback
        const apiKey = process.env.GOOGLE_TTS_API_KEY
            || process.env.GEMINI_API_KEY
            || process.env.NEXT_PUBLIC_GEMINI_API_KEY
            || '';

        if (!apiKey) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        console.log(`[TTS] Generating: speaker=${voiceKey}, voice=${voiceConfig.name}, text="${text.substring(0, 40)}..."`);

        // ── Call Google Cloud TTS API ──
        const ttsResponse = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text },
                    voice: voiceConfig,
                    audioConfig: {
                        audioEncoding: 'LINEAR16',      // Raw PCM
                        sampleRateHertz: 16000,          // 16kHz (Studio 품질 유지, 용량 감소)
                        speakingRate: 0.95,
                    }
                }),
            }
        );

        if (!ttsResponse.ok) {
            const err = await ttsResponse.text();
            console.error('[TTS] Google Cloud TTS error:', err);
            return NextResponse.json({
                error: 'Google Cloud TTS failed. Make sure "Cloud Text-to-Speech API" is enabled in GCP Console.',
                details: err
            }, { status: ttsResponse.status });
        }

        const data = await ttsResponse.json();
        const pcmBase64 = data.audioContent;

        if (!pcmBase64) {
            console.error('[TTS] No audio data in response');
            return NextResponse.json({ error: 'No audio data returned' }, { status: 500 });
        }

        // ── Wrap raw PCM in WAV header (for browser AudioContext.decodeAudioData) ──
        const pcmBuffer = Buffer.from(pcmBase64, 'base64');
        const wavHeader = createWavHeader(pcmBuffer.length);
        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
        const wavBase64 = wavBuffer.toString('base64');

        // ── Cache the WAV ──
        setCachedAudio(cacheKey, wavBase64);

        return NextResponse.json({
            audioContent: wavBase64,
        });

    } catch (error: any) {
        console.error('[TTS] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
