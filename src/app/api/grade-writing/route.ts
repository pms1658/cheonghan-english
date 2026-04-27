import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { targetGrammar, koreanSentence, studentAnswer, correctAnswer } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `당신은 한국 고등학교 영어 내신 채점 교사입니다. 영작 채점을 해주세요.

## 채점 대상
- 목표 구문: ${targetGrammar}
- 한국어 문장: ${koreanSentence}
- 정답 예시: ${correctAnswer}
- 학생 답안: ${studentAnswer}

## 채점 기준 (100점 만점)
1. **구문 정확도 (40점)**: 목표 구문을 정확히 사용했는가?
2. **문법 정확도 (30점)**: 시제, 수일치, 관사, 전치사 등 문법이 맞는가?
3. **의미 전달 (20점)**: 한국어 의미가 정확히 전달되었는가?
4. **자연스러움 (10점)**: 영어로서 자연스러운 표현인가?

## 채점 원칙
- 정답과 완전히 다른 구문을 사용했으면 구문 점수는 0점
- 정답과 다른 표현이라도 문법적으로 맞고 의미가 같으면 관대하게 채점
- 사소한 관사/전치사 실수는 약간만 감점 (-5~10점)
- 핵심 구문의 구조적 오류는 크게 감점 (-20~40점)

## 피드백 가이드
- 반드시 한국어로 작성
- 친절하고 격려하는 톤으로
- 잘한 점을 먼저 언급하고, 개선점을 알려주기
- 정답과 학생 답안의 차이를 구체적으로 설명

## 응답 형식 (JSON)
{
  "score": number,
  "feedback": "한국어 피드백 (2-3문장)",
  "correctedSentence": "수정된 정답 문장 (학생 답이 틀렸을 경우)",
  "grammarNotes": "핵심 문법 포인트 한 줄 설명"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            // Sanitize
            return NextResponse.json({
                score: typeof parsed.score === 'number' ? parsed.score : 0,
                feedback: typeof parsed.feedback === 'string' ? parsed.feedback : String(parsed.feedback || ''),
                correctedSentence: typeof parsed.correctedSentence === 'string' ? parsed.correctedSentence : String(parsed.correctedSentence || ''),
                grammarNotes: typeof parsed.grammarNotes === 'string' ? parsed.grammarNotes : String(parsed.grammarNotes || ''),
            });
        } catch {
            console.error('[GradeWriting] JSON parse error:', cleaned);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: cleaned }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[GradeWriting] Error:', error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
