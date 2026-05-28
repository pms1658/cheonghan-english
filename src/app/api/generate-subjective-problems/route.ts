import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateSubjectiveRequestSchema } from '@/schemas/api';
import { getSubjectiveProblemsPrompt } from '@/services/geminiPrompts';
import { cleanPassageMarkers } from '@/utils/textUtils';
import { extractJSON } from '@/lib/aiUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key is missing.' }, { status: 500 });
        }

        const body = await req.json();
        validateRequest(generateSubjectiveRequestSchema, body, 'generate-subjective-problems');
        const { passage: rawPassage, targetGrade = '3', mode = 'auto', problemTypes, source } = body;
        const passage = cleanPassageMarkers(rawPassage);

        if (!passage) {
            return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        // Generate subjective problems
        const typesToGenerate = mode === 'manual' && problemTypes?.length > 0 ? problemTypes : undefined;
        const prompt = getSubjectiveProblemsPrompt(passage, targetGrade, typesToGenerate, source);

        console.log(`[Subjective Gen] Generating problems, mode=${mode}, types=${typesToGenerate?.join(',') || 'all'}`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
            safetySettings,
        });

        const response = result.response;
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('Safety blocked or empty response');
        }

        const responseText = response.text();
        console.log(`[Subjective Gen] Response length: ${responseText.length}`);

        const data = extractJSON(responseText);
        const problems = data.problems || [];

        // Assign IDs and points
        const pointsPerProblem = Math.floor(100 / Math.max(problems.length, 1));
        let remainingPoints = 100;

        const finalProblems = problems.map((p: any, i: number) => {
            const points = (i === problems.length - 1) ? remainingPoints : pointsPerProblem;
            remainingPoints -= points;
            return {
                ...p,
                id: `subj_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                points
            };
        });

        console.log(`[Subjective Gen] Generated ${finalProblems.length} problems`);

        return NextResponse.json({ 
            problems: finalProblems,
            modifiedPassage: data.modifiedPassage || ''
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate subjective problems');
    }
}
