import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateWritingProblemsRequestSchema } from '@/schemas/api';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(generateWritingProblemsRequestSchema, body, 'generate-writing-problems');
        const { sessionTitle, sessionFormula, sessionDescription, sessionExample, level, targetGrade, problemCount, bidirectional } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        // Grade-specific vocabulary/complexity instruction — very detailed to ensure AI differentiates clearly
        const gradeLabels: Record<string, string> = {
            'e4': `초등 4학년 수준.
  - 어휘: 초등 필수 어휘만 사용 (dog, happy, school, like, want 수준). 단어 수 제한 없이 가장 쉬운 단어만.
  - 정답 문장 길이: 5~8단어. 절대 10단어를 넘지 마세요.
  - 문맥: 학교, 가족, 동물, 음식
  - 금지: 추상 명사, 복합 수식어, 분사구, 관계절 (목표 구문 외의 복잡한 문법 사용 금지)`,
            'e5': `초등 5학년 수준.
  - 어휘: 초등 교과서 수준 (important, exercise, foreign, popular 수준). 중학 이상 어휘 사용 금지.
  - 정답 문장 길이: 6~10단어.
  - 문맥: 취미, 학교생활, 일상, 자연
  - 금지: 학술 어휘, 복합 종속절 (목표 구문 1개만 사용)`,
            'e6': `초등 6학년 수준.
  - 어휘: 초등~중1 교과서 수준 (experience, environment, healthy, necessary 수준).
  - 정답 문장 길이: 7~12단어.
  - 문맥: 환경, 건강, 학교행사, 꿈
  - 금지: 고급 학술 어휘, 이중 종속절`,
            'm1': `중등 1학년 수준.
  - 어휘: 중1 교과서 수준 (communicate, tradition, advantage, realize 수준).
  - 정답 문장 길이: 8~14단어.
  - 문맥: 문화, 여행, 직업, 우정
  - 허용: 목표 구문 + 간단한 수식어구 1개`,
            'm2': `중등 2학년 수준.
  - 어휘: 중2 교과서 수준 (opportunity, contribute, significant, demonstrate 수준).
  - 정답 문장 길이: 10~16단어.
  - 문맥: 사회, 기술, 교육, 환경
  - 허용: 목표 구문 + 형용사절 또는 부사구 1개 추가 가능`,
            'm3': `중등 3학년 수준.
  - 어휘: 중3~고1 교과서 수준 (perspective, fundamental, consequence, initiative 수준).
  - 정답 문장 길이: 12~18단어.
  - 문맥: 과학, 사회문제, 역사, 진로
  - 허용: 목표 구문 + 부사절 또는 분사구문 추가 가능`,
            '1': `고등 1학년 수준.
  - 어휘: 고1 교과서 수준 (acknowledge, sustainable, diversity, coincide 수준).
  - 정답 문장 길이: 14~20단어.
  - 문맥: 교과서 지문 주제 (환경, 기술, 문화 다양성)
  - 허용: 목표 구문 + 복합 수식어, 종속절 조합 가능`,
            '2': `고등 2학년 수준.
  - 어휘: 모의고사/EBS 수준 (inevitable, sophisticated, underlying, distinguish 수준).
  - 정답 문장 길이: 15~25단어.
  - 문맥: 모의고사 빈출 주제 (인지과학, 경제, 예술, 철학)
  - 허용: 목표 구문 + 관계절/분사구문/부사절 복합`,
            '3': `고등 3학년·수능 수준.
  - 어휘: 수능 빈출 어휘 (unprecedented, inherently, perpetuate, exacerbate 수준).
  - 정답 문장 길이: 18~30단어.
  - 문맥: 수능 지문 주제 (추상적 개념, 학술 논증, 사회 비평)
  - 허용: 다중 구문 조합, 삽입절, 복합 종속절`,
        };
        const gradeInstruction = `## 대상 학년 및 난이도 (반드시 준수)
${gradeLabels[targetGrade] || gradeLabels['2']}
⚠️ 위의 어휘 수준, 문장 길이, 문맥 제한을 반드시 지키세요. 학년보다 어렵거나 쉬운 문제를 내면 안 됩니다.`;

        const hintInstruction = level === 'bronze'
            ? '각 문제의 해석 끝에 괄호로 핵심 영어 단어 3-5개를 힌트로 제공하세요. 예: "나는 매일 운동하는 것을 규칙으로 삼는다. (make, rule, exercise)"'
            : level === 'silver'
                ? '각 문제의 해석 끝에 괄호로 가장 핵심적인 영어 단어 1-2개만 힌트로 제공하세요. 예: "나는 매일 운동하는 것을 규칙으로 삼는다. (make, rule)"'
                : '힌트 단어를 제공하지 마세요. 한국어 해석만 제공하세요.';

        const bidirectionalInstruction = bidirectional
            ? `양방향 문제를 포함하세요. 예를 들어 능동→수동 전환과 수동→능동 전환 문제를 각각 포함하거나, 구문 A→B 변환과 B→A 변환을 모두 다루세요. 총 ${problemCount}문제 중 절반은 한 방향, 나머지는 반대 방향입니다.`
            : '';

        const prompt = `당신은 한국 영어 내신 시험 출제 전문가입니다.

다음 영작 구문에 대한 연습 문제를 ${problemCount}개 생성하세요.

## 구문 정보
- 구문명: ${sessionTitle}
- 설명: ${sessionDescription}
- 공식: ${sessionFormula}
- 예시: ${sessionExample}

${gradeInstruction}

## 출제 규칙
1. ${hintInstruction}
2. ${bidirectionalInstruction}
3. 각 문제는 자연스러운 한국어 문장을 제시하고, 학생이 해당 구문을 활용하여 영작해야 합니다.
4. 문제마다 정답(영어 문장)을 반드시 포함하세요.
5. 같은 패턴의 반복이 아니라, 다양한 문맥과 어휘를 활용하세요.
6. 문장은 실생활이나 교과서에서 볼 법한 자연스러운 문장이어야 합니다.
7. 위에서 지정된 학년 수준의 어휘와 문장 길이를 반드시 준수하세요.

## 응답 형식 (JSON)
{
  "problems": [
    {
      "id": 1,
      "korean": "한국어 해석 (필요시 힌트 단어 괄호 포함)",
      "answer": "정답 영어 문장",
      "keyGrammar": "이 문제에서 핵심적으로 사용되는 문법 포인트 한 줄"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleaned);
            return NextResponse.json(parsed);
        } catch {
            console.error('[GenerateWriting] JSON parse error:', cleaned);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: cleaned }, { status: 500 });
        }
    } catch (error) {
        return createErrorResponse(error, 'Failed to generate writing problems');
    }
}
