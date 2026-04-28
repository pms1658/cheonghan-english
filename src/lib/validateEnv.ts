/**
 * 환경변수 검증 유틸리티
 * 서버 사이드에서 필수 환경변수의 존재 여부를 확인합니다.
 */

/** 필수 환경변수가 설정되어 있는지 확인 */
export function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`[ENV] Missing required environment variable: ${key}`);
    }
    return value;
}

/** Gemini API 키 존재 확인 (여러 env var 폴백 지원) */
export function getGeminiApiKey(): string {
    const key = process.env.GEMINI_API_KEY
        || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        || '';
    return key;
}

/** Gemini API 키가 반드시 필요한 경우 */
export function requireGeminiApiKey(): string {
    const key = getGeminiApiKey();
    if (!key) {
        throw new Error('[ENV] Gemini API Key is missing. Set GEMINI_API_KEY in .env.local');
    }
    return key;
}

/** TTS API 키 (Google Cloud TTS 또는 Gemini 폴백) */
export function getTtsApiKey(): string {
    return process.env.GOOGLE_TTS_API_KEY
        || process.env.GEMINI_API_KEY
        || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        || '';
}
