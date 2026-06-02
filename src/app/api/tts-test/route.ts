import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/apiMiddleware';

/**
 * TTS 진단 테스트 엔드포인트
 * GET /api/tts-test
 * 
 * 브라우저에서 직접 접근하여 Google Cloud TTS 상태를 확인
 * M(남성), W(여성), N(한국어) 각각 테스트
 */

const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
    M: { languageCode: 'en-US', name: 'en-US-Studio-Q' },
    W: { languageCode: 'en-US', name: 'en-US-Studio-O' },
    N: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' },
};

const TEST_TEXTS: Record<string, string> = {
    M: 'Hello, I am a male speaker. Can you hear me clearly?',
    W: 'Hello, I am a female speaker. Can you hear me clearly?',
    N: '안녕하세요. 한국어 음성 테스트입니다.',
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
                    status: '✅ 성공',
                    voice: voiceConfig.name,
                    audioSize: data.audioContent ? `${Math.round(data.audioContent.length * 0.75 / 1024)}KB` : 'no data',
                };
            } else {
                const errText = await res.text();
                results.tests[speaker] = {
                    status: '❌ 실패',
                    voice: voiceConfig.name,
                    httpStatus: res.status,
                    error: errText.substring(0, 300),
                };
            }
        } catch (err: any) {
            results.tests[speaker] = {
                status: '❌ 에러',
                voice: voiceConfig.name,
                error: err.message,
            };
        }
    }

    // Summary
    const allSuccess = Object.values(results.tests).every((t: any) => t.status === '✅ 성공');
    results.summary = allSuccess
        ? '✅ Google Cloud TTS 정상 작동! Studio 남녀 음성 사용 가능.'
        : '❌ Google Cloud TTS 문제 발견! 아래 에러를 확인하세요. GCP 콘솔에서 "Cloud Text-to-Speech API"가 활성화되어 있는지 확인하세요.';

    return NextResponse.json(results, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
    } catch (error) {
        return createErrorResponse(error, 'TTS test failed');
    }
}
