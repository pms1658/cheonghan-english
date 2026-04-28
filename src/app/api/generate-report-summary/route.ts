import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateReportSummaryRequestSchema } from '@/schemas/api';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(generateReportSummaryRequestSchema, body, 'generate-report-summary');
        const { studentName, yearMonth, vocabScore, grammarScore, readingScore, vocab, grammar, reading, growth } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `당신은 한국의 영어 교육 전문가입니다. 학생의 월간 학습 데이터를 바탕으로 격려하고 구체적인 학습 제안을 포함한 총평을 작성해주세요.

## 학생 정보
- 이름: ${studentName}
- 기간: ${yearMonth}

## 학습 데이터
### 어휘 (${vocabScore}점/100)
- 이번 달 학습 단어: ${vocab.monthlyWordsLearned}개
- 누적 학습 단어: ${vocab.totalWordsLearned}개
- 첫 시도 통과율: ${vocab.firstTryPassRate}%
- 100점까지 평균 시도: ${vocab.avgAttemptsToPass}회
- 추세: ${growth.vocabTrend === 'up' ? '상승' : growth.vocabTrend === 'stable' ? '유지' : '하락'}

### 문법 (${grammarScore}점/100)
- 시도 구문: ${grammar.sessionsAttempted}개
- 통과 구문: ${grammar.sessionsPassed}개
- 1차 시도 평균: ${grammar.avgFirstAttemptScore}점
- 약점: ${grammar.weakSessions.map((s: any) => s.title).join(', ') || '없음'}
- 강점: ${grammar.strongSessions.map((s: any) => s.title).join(', ') || '없음'}
- 추세: ${growth.grammarTrend === 'up' ? '상승' : growth.grammarTrend === 'stable' ? '유지' : '하락'}

### 독해 (${readingScore}점/100)
- 해석 포함 제출: ${reading.withTranslation}건
- 평균 점수: ${reading.avgScore}점
- 추세: ${growth.readingTrend === 'up' ? '상승' : growth.readingTrend === 'stable' ? '유지' : '하락'}

### 보완 필요 영역
${growth.improvements.join('\n')}

## 작성 규칙
1. 3문단으로 작성 (현재 수준 → 성장 포인트 → 학습 제안)
2. 구체적인 수치를 인용하여 설득력 있게
3. 격려하되 현실적으로 (잘하는 부분 칭찬 + 부족한 부분 부드럽게 언급)
4. 존댓말 사용 (학생과 학부모가 읽을 수 있으므로)
5. 전체 200자~400자 사이

## 응답 형식
{ "summary": "총평 내용" }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            return NextResponse.json({ summary: parsed.summary || '' });
        } catch {
            return NextResponse.json({ summary: cleaned });
        }
    } catch (error) {
        return createErrorResponse(error, 'Failed to generate report summary');
    }
}
