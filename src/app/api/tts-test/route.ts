import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/apiMiddleware';

/**
 * TTS ì§„ë‹¨ ?ŒìŠ¤???”ë“œ?¬ì¸??
 * GET /api/tts-test
 * 
 * ë¸Œë¼?°ì??ì„œ ì§ì ‘ ?‘ê·¼?˜ì—¬ Google Cloud TTS ?íƒœë¥??•ì¸
 * M(?¨ì„±), W(?¬ì„±), N(?œêµ­?? ê°ê° ?ŒìŠ¤??
 */

const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
    M: { languageCode: 'en-US', name: 'en-US-Studio-Q' },
    W: { languageCode: 'en-US', name: 'en-US-Studio-O' },
    N: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' },
};

const TEST_TEXTS: Record<string, string> = {
    M: 'Hello, I am a male speaker. Can you hear me clearly?',
    W: 'Hello, I am a female speaker. Can you hear me clearly?',
    N: '?ˆë…•?˜ì„¸?? ?œêµ­???Œì„± ?ŒìŠ¤?¸ì…?ˆë‹¤.',
};

export async function GET() {
    // Note: Origin check skipped for this diagnostic endpoint (GET, browser-accessible)
    try {
    const apiKey = process.env.GOOGLE_TTS_API_KEY
        || process.env.GEMINI_API_KEY
        || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        || '';

    const results: Record<string, any> = {
        apiKeyFound: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING',
        tests: {},
    };

    for (const [speaker, voiceConfig] of Object.entries(VOICE_MAP)) {
        const text = TEST_TEXTS[speaker];
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
                            audioEncoding: 'LINEAR16',
                            sampleRateHertz: 16000,
                            speakingRate: 0.95,
                        }
                    }),
                }
            );

            if (res.ok) {
                const data = await res.json();
                results.tests[speaker] = {
                    status: '???±ê³µ',
                    voice: voiceConfig.name,
                    audioSize: data.audioContent ? `${Math.round(data.audioContent.length * 0.75 / 1024)}KB` : 'no data',
                };
            } else {
                const errText = await res.text();
                results.tests[speaker] = {
                    status: '???¤íŒ¨',
                    voice: voiceConfig.name,
                    httpStatus: res.status,
                    error: errText.substring(0, 300),
                };
            }
        } catch (err: any) {
            results.tests[speaker] = {
                status: '???ëŸ¬',
                voice: voiceConfig.name,
                error: err.message,
            };
        }
    }

    // Summary
    const allSuccess = Object.values(results.tests).every((t: any) => t.status === '???±ê³µ');
    results.summary = allSuccess
        ? '??Google Cloud TTS ?•ìƒ ?‘ë™! Studio ?¨ë? ?Œì„± ?¬ìš© ê°€??'
        : '??Google Cloud TTS ë¬¸ì œ ë°œê²¬! ?„ë˜ ?ëŸ¬ë¥??•ì¸?˜ì„¸?? GCP ì½˜ì†”?ì„œ "Cloud Text-to-Speech API"ê°€ ?œì„±?”ë˜???ˆëŠ”ì§€ ?•ì¸?˜ì„¸??';

    return NextResponse.json(results, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
    } catch (error) {
        return createErrorResponse(error, 'TTS test failed');
    }
}
