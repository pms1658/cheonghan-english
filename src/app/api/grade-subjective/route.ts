import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { gradeSubjectiveRequestSchema } from '@/schemas/api';
import { getSubjectiveGradingPrompt } from '@/services/geminiPrompts';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Robust JSON parser
function extractJSON(text: string) {
    if (!text || text.trim().length === 0) throw new Error('Empty AI response');

    let sanitized = text.trim();
    const markdownMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) sanitized = markdownMatch[1].trim();

    try { return JSON.parse(sanitized); } catch (e) { /* continue */ }

    const firstBrace = sanitized.indexOf('{');
    const lastBrace = sanitized.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = sanitized.substring(firstBrace, lastBrace + 1);

        const ESC_N = '\\' + 'n';
        const ESC_T = '\\' + 't';
        let fixed = '';
        let inString = false;
        let i = 0;
        while (i < jsonSubstring.length) {
            const ch = jsonSubstring[i];
            if (inString && ch === '\\') {
                fixed += ch;
                if (i + 1 < jsonSubstring.length) { fixed += jsonSubstring[i + 1]; i += 2; } else { i++; }
                continue;
            }
            if (ch === '"') { inString = !inString; fixed += ch; i++; continue; }
            if (inString) {
                const code = ch.charCodeAt(0);
                if (code === 0x0A) { fixed += ESC_N; i++; continue; }
                if (code === 0x0D) { i++; continue; }
                if (code === 0x09) { fixed += ESC_T; i++; continue; }
            }
            fixed += ch;
            i++;
        }

        try { return JSON.parse(fixed); } catch (e) {
            try { const fn = new Function('return ' + jsonSubstring); return fn(); } catch (e2) { /* fall through */ }
        }
    }

    throw new Error('Could not parse AI response: ' + text.substring(0, 200));
}

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
                    feedback: typeof gradeResult.feedback === 'string' ? gradeResult.feedback : 'ì±„ì  ê²°ê³¼ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.',
                    modelAnswer: gradeResult.modelAnswer || p.modelAnswer || p.transformedAnswer || p.blankAnswer || '',
                    detailedScores: gradeResult.detailedScores || {}
                };
            }
            return {
                problemId: p.id,
                score: 0,
                feedback: 'ì±„ì ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.',
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
