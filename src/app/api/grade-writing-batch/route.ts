import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse } from '@/lib/apiMiddleware';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        const { problems, targetGrammar, level } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        if (!Array.isArray(problems) || problems.length === 0) {
            return NextResponse.json({ error: 'No problems provided' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const problemsText = problems.map((p: any, i: number) => 
            `### 문제 ${i + 1}
- 한국어: ${p.korean}
- 정답 예시: ${p.correctAnswer}
- 학생 답안: ${p.studentAnswer}
- 핵심 문법: ${p.keyGrammar}`
        ).join('\n\n');

        const prompt = `당신은 한국 고등학교 영어 내신 채점 교사입니다. 아래 ${problems.length}개 영작 문제를 한꺼번에 채점해주세요.

## 과제 정보
- 목표 구문: ${targetGrammar}
- 난이도: ${level}

## 채점할 문제들

${problemsText}

## 채점 기준 (100점 만점, 문제당)
1. **구문 정확도 (40점)**: 목표 구문을 정확히 사용했는가?
2. **문법 정확도 (30점)**: 시제, 수일치, 관사, 전치사 등 문법이 맞는가?
3. **의미 전달 (20점)**: 한국어 의미가 정확히 전달되었는가?
4. **자연스러움 (10점)**: 영어로서 자연스러운 표현인가?

## 채점 원칙
- 정답과 완전히 다른 구문을 사용했으면 구문 점수는 0점
- 정답과 다른 표현이라도 문법적으로 맞고 의미가 같으면 관대하게 채점
- 사소한 관사/전치사 실수는 약간만 감점 (-5~10점)
- 핵심 구문의 구조적 오류는 크게 감점 (-20~40점)
- 답안이 비어있거나 의미없는 답이면 0점

## 피드백 가이드
- 반드시 한국어로 작성
- 친절하고 격려하는 톤으로
- 잘한 점을 먼저 언급하고, 개선점을 알려주기

## 응답 형식 (JSON)
{
  "results": [
    {
      "score": number,
      "feedback": "한국어 피드백 (2-3문장)",
      "correctedSentence": "수정된 정답 문장",
      "grammarNotes": "핵심 문법 포인트 한 줄 설명"
    }
  ]
}

results 배열은 반드시 ${problems.length}개여야 합니다. 문제 순서대로 채점해주세요.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            
            if (!Array.isArray(parsed.results) || parsed.results.length !== problems.length) {
                console.error('[GradeWritingBatch] Result count mismatch:', parsed.results?.length, 'vs', problems.length);
                // Try to pad or trim
                const results = Array.isArray(parsed.results) ? parsed.results : [];
                while (results.length < problems.length) {
                    results.push({ score: 0, feedback: '채점 오류가 발생했습니다.', correctedSentence: '', grammarNotes: '' });
                }
                return NextResponse.json({ results: results.slice(0, problems.length) });
            }

            // Sanitize each result
            const sanitized = parsed.results.map((r: any) => ({
                score: typeof r.score === 'number' ? Math.min(100, Math.max(0, r.score)) : 0,
                feedback: typeof r.feedback === 'string' ? r.feedback : String(r.feedback || ''),
                correctedSentence: typeof r.correctedSentence === 'string' ? r.correctedSentence : String(r.correctedSentence || ''),
                grammarNotes: typeof r.grammarNotes === 'string' ? r.grammarNotes : String(r.grammarNotes || ''),
            }));

            return NextResponse.json({ results: sanitized });
        } catch {
            console.error('[GradeWritingBatch] JSON parse error:', cleaned);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: cleaned }, { status: 500 });
        }
    } catch (error) {
        return createErrorResponse(error, 'Failed to grade writing batch');
    }
}
