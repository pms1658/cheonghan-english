// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn('Gemini API key is not configured');
}

/**
 * Gemini API를 사용하여 학생의 구조독해를 채점합니다.
 * 
 * @param originalSentence 원본 영어 문장
 * @param studentAnalysis 학생이 작성한 구조 분석
 * @returns 채점 결과 (통과 여부, 피드백 등)
 */
export async function gradeStructureAnalysis(
    originalSentence: string,
    studentAnalysis: string
): Promise<{ passed: boolean; feedback: string; score: number }> {
    // TODO: Gemini API 연동 구현
    // 현재는 placeholder 함수

    console.log('Grading:', { originalSentence, studentAnalysis });

    return {
        passed: true,
        feedback: 'Gemini API 연동 예정',
        score: 100,
    };
}

/**
 * 지문을 문장별로 분리합니다.
 * 
 * @param passage 영어 지문
 * @returns 분리된 문장 배열
 */
export function splitIntoSentences(passage: string): string[] {
    // 마침표, 느낌표, 물음표를 기준으로 문장 분리
    const sentences = passage
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    return sentences;
}
