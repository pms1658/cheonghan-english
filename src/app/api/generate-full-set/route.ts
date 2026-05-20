import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateFullSetRequestSchema } from '@/schemas/api';
import { getWorkbookPrompt, getVariantPrompt, getAnalysisPrompt, getBestTypesPrompt, GRADE_LABELS } from '@/services/geminiPrompts';
import { cleanPassageMarkers, sanitizeAIQuestionText, sanitizeChoiceText } from '@/utils/textUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function extractJSON(text: string) {
    let sanitized = text.trim();
    const markdownMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) sanitized = markdownMatch[1].trim();
    try {
        return JSON.parse(sanitized);
    } catch {
        // Simple fallback layer
        try {
            const firstBrace = sanitized.indexOf('{');
            const lastBrace = sanitized.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(sanitized.substring(firstBrace, lastBrace + 1));
            }
        } catch { }
        return null;
    }
}

export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(generateFullSetRequestSchema, body, 'generate-full-set');
        const { passage: rawPassage, problemTypes, targetGrade = '3' } = body;
        const passage = cleanPassageMarkers(rawPassage);

        if (!passage) return NextResponse.json({ error: 'Passage is required' }, { status: 400 });

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        // 1. Workbook Generation Task
        const workbookTask = (async () => {
            try {
                const prompt = getWorkbookPrompt(targetGrade, passage);
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
                    safetySettings
                });
                const text = result.response.text();
                const json = extractJSON(text);
                return json || null;
            } catch (e) {
                console.error("Workbook Gen Error:", e);
                return null;
            }
        })();

        // 2. Variant Problems Generation Task
        // 2. Variant Problems Generation Task
        // Smart Selection if no specific types provided (Auto Mode)
        let typesToGen = problemTypes;

        if (!typesToGen || typesToGen.length === 0) {
            try {
                const prompt = getBestTypesPrompt(targetGrade, passage);
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
                });
                const suggestedTypes = extractJSON(result.response.text());
                typesToGen = Array.isArray(suggestedTypes) ? suggestedTypes : ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
            } catch (e) {
                console.warn("Smart Type Selection Failed in Full Set, using default:", e);
                typesToGen = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
            }
        }

        // Limit to 6 to save tokens if "All" is too much, but user wants full set.
        // Let's stick to the requested list provided by frontend.

        const variantTasks = (typesToGen as string[]).map(async (type, i) => {
            try {
                const prompt = getVariantPrompt(type, targetGrade, passage);
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
                    safetySettings
                });
                const data = extractJSON(result.response.text());

                if (!data || !data.question) throw new Error('Invalid JSON');

                return {
                    id: `prob_${Date.now()}_${i}`,
                    type,
                    question: sanitizeAIQuestionText(data.question),
                    choices: (data.choices || []).map((c: string) => sanitizeChoiceText(c)),
                    correctAnswer: data.correctAnswer ?? 0,
                    explanation: (data.explanation || '').trim(),
                    choiceExplanations: (data.choiceExplanations || []).map((e: string) => (e || '').trim()),
                    points: 0 // Will verify later
                };
            } catch (e) {
                console.error(`Variant ${type} Error:`, e);
                return null;
            }
        });

        // ... (existing tasks)

        // 3. Structural Analysis Generation Task (Parallel)
        const analysisTask = (async () => {
            try {
                const prompt = getAnalysisPrompt(passage);
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.1 }, // Low temp for precision
                    safetySettings
                });
                const json = extractJSON(result.response.text());
                return json?.sentences || null;
            } catch (e) {
                console.error("Analysis Gen Error:", e);
                return null;
            }
        })();

        // Execute in parallel
        const [workbookData, analysisData, ...variants] = await Promise.all([workbookTask, analysisTask, ...variantTasks]);

        // Filter valid variants and assign points
        const validVariants = variants.filter(v => v !== null);
        const pointsPerProblem = validVariants.length > 0 ? Math.floor(100 / validVariants.length) : 0;
        let remaining = 100;

        const finalVariants = validVariants.map((p: any, i) => {
            const isLast = i === validVariants.length - 1;
            const pts = isLast ? remaining : pointsPerProblem;
            remaining -= pts;
            return { ...p, points: pts };
        });

        return NextResponse.json({
            workbookConfig: workbookData,
            analysisData: analysisData, // Include analysis
            variantProblems: finalVariants
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate full set');
    }
}
