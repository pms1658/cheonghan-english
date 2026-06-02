import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { gradeSubjectiveRequestSchema } from '@/schemas/api';
import { getSubjectiveGradingPrompt } from '@/services/geminiPrompts';
import { extractJSON } from '@/lib/aiUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key is missing.' }, { status: 500 });
        }

        const body = await req.json();
        validateRequest(gradeSubjectiveRequestSchema, body, 'grade-subjective');
        const { problems, answers, passage } = body;

        if (!problems || !answers || !passage) {
            return NextResponse.json({ error: 'Problems, answers, and passage are required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        console.log(`[Subjective Grade] Grading ${problems.length} problems`);

        const prompt = getSubjectiveGradingPrompt(problems, answers, passage);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        console.log(`[Subjective Grade] Response length: ${responseText.length}`);

        const data = extractJSON(responseText);
        const results = data.results || [];

        // Ensure all problems have a result
        const finalResults = problems.map((p: any, i: number) => {
            const gradeResult = results.find((r: any) => r.problemId === p.id) || results[i];
            if (gradeResult) {
                return {
                    problemId: p.id,
                    score: typeof gradeResult.score === 'number' ? gradeResult.score : 0,
                    feedback: typeof gradeResult.feedback === 'string' ? gradeResult.feedback : '채점 결과를 불러올 수 없습니다.',
                    modelAnswer: gradeResult.modelAnswer || p.modelAnswer || p.transformedAnswer || p.blankAnswer || '',
                    detailedScores: gradeResult.detailedScores || {}
                };
            }
            return {
                problemId: p.id,
                score: 0,
                feedback: '채점에 실패했습니다. 다시 시도해주세요.',
                modelAnswer: '',
                detailedScores: {}
            };
        });

        // Calculate total score (weighted by points)
        const totalPoints = problems.reduce((sum: number, p: any) => sum + (p.points || 0), 0);
        const weightedScore = totalPoints > 0
            ? Math.round(finalResults.reduce((sum: number, r: any, i: number) => {
                const problemPoints = problems[i]?.points || 0;
                return sum + (r.score / 100) * problemPoints;
              }, 0))
            : 0;

        console.log(`[Subjective Grade] Completed. Total: ${weightedScore}/${totalPoints}`);

        return NextResponse.json({
            results: finalResults,
            totalScore: weightedScore,
            totalPoints
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to grade subjective problems');
    }
}
