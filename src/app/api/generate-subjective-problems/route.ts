import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getSubjectiveProblemsPrompt } from '@/services/geminiPrompts';
import { cleanPassageMarkers } from '@/utils/textUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Robust JSON parser (reused from generate-variant-problems)
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
    try {
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key is missing.' }, { status: 500 });
        }

        const { passage: rawPassage, targetGrade = '3', mode = 'auto', problemTypes } = await req.json();
        const passage = cleanPassageMarkers(rawPassage);

        if (!passage) {
            return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // Generate subjective problems
        const typesToGenerate = mode === 'manual' && problemTypes?.length > 0 ? problemTypes : undefined;
        const prompt = getSubjectiveProblemsPrompt(passage, targetGrade, typesToGenerate);

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

    } catch (error: any) {
        console.error('[Subjective Gen] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to generate subjective problems',
            details: error.stack || error.toString()
        }, { status: 500 });
    }
}
