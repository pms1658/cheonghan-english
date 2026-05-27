import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateListeningSetRequestSchema } from '@/schemas/api';
import { extractJSON } from '@/lib/aiUtils';

// Allow up to 120 seconds for 7+ batch Gemini calls
export const maxDuration = 120;
import {
    getListeningBatch1Prompt,
    getListeningBatch2Prompt,
    getListeningBatch3Prompt,
    getListeningBatch4Prompt,
    getReadingBatch5Prompt,
    getReadingBatch6Prompt,
    getReadingBatch7Prompt,
} from '@/services/listeningPrompts';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ── Single batch generator with retry ──
async function generateBatch(
    model: any,
    prompt: string,
    batchLabel: string,
    retries = 2
): Promise<{ label: string; data: any; error?: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`[ListeningSet] Generating ${batchLabel}... (attempt ${attempt + 1})`);
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
                safetySettings,
            });
            const response = result.response;
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error('Safety blocked or no candidates');
            }
            const text = response.text();
            const finishReason = response.candidates?.[0]?.finishReason;
            console.log(`[ListeningSet] ${batchLabel}: ${text.length} chars, finish: ${finishReason}`);

            // If truncated, retry with higher token limit
            if (finishReason === 'MAX_TOKENS') {
                console.warn(`[ListeningSet] ${batchLabel}: Truncated! Retrying with 32k...`);
                const retry = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 32768 },
                    safetySettings,
                });
                const retryText = retry.response.text();
                return { label: batchLabel, data: extractJSON(retryText) };
            }

            return { label: batchLabel, data: extractJSON(text) };
        } catch (error: any) {
            console.error(`[ListeningSet] ${batchLabel} attempt ${attempt + 1} FAILED:`, error.message);
            if (attempt === retries) {
                return { label: batchLabel, data: null, error: error.message };
            }
            // Wait before retry (exponential backoff)
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
    }
    return { label: batchLabel, data: null, error: 'All retries failed' };
}

// ── Delay helper to avoid rate limits ──
function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// ── POST Handler ──
export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
        }

        const body = await req.json();
        validateRequest(generateListeningSetRequestSchema, body, 'generate-listening-set');
        const { targetGrade = '3' } = body;
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        console.log('[ListeningSet] Starting generation for grade:', targetGrade);

        // ── Run batches in groups of 3 to avoid rate limits ──
        // Group 1: Listening 1-5, 6-10, 11-15
        const group1 = await Promise.allSettled([
            generateBatch(model, getListeningBatch1Prompt(targetGrade), 'listening_1_5'),
            generateBatch(model, getListeningBatch2Prompt(targetGrade), 'listening_6_10'),
            generateBatch(model, getListeningBatch3Prompt(targetGrade), 'listening_11_15'),
        ]);
        console.log('[ListeningSet] Group 1 done');

        await delay(1000); // Small delay between groups

        // Group 2: Listening 16-17, Reading 18-20, 25-28
        const group2 = await Promise.allSettled([
            generateBatch(model, getListeningBatch4Prompt(targetGrade), 'listening_16_17'),
            generateBatch(model, getReadingBatch5Prompt(targetGrade), 'reading_18_20'),
            generateBatch(model, getReadingBatch6Prompt(targetGrade), 'reading_25_28'),
        ]);
        console.log('[ListeningSet] Group 2 done');

        await delay(1000);

        // Group 3: Reading 43-45
        const group3 = await Promise.allSettled([
            generateBatch(model, getReadingBatch7Prompt(targetGrade), 'reading_43_45'),
        ]);
        console.log('[ListeningSet] Group 3 done');

        const results = [...group1, ...group2, ...group3];

        // ── Aggregate results ──
        const listeningProblems: any[] = [];
        const readingProblems: any[] = [];
        const errors: string[] = [];
        let pictureDescription: string | null = null;

        for (const result of results) {
            if (result.status === 'rejected') {
                errors.push(`Batch rejected: ${result.reason}`);
                continue;
            }
            const { label, data, error } = result.value;
            if (error || !data) {
                errors.push(`${label}: ${error || 'No data'}`);
                continue;
            }

            const problems = Array.isArray(data) ? data : [data];

            for (const p of problems) {
                // Assign unique IDs
                p.id = `prob_${p.number}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                if (label.startsWith('listening')) {
                    // Set defaults
                    p.points = p.points || 2;
                    p.needsMemo = p.needsMemo || (p.type === 'calculation');
                    p.playTwice = p.playTwice || (p.type === 'long_set');

                    // Extract picture description for image generation
                    if (p.number === 4 && p.pictureDescription) {
                        pictureDescription = p.pictureDescription;
                    }

                    listeningProblems.push(p);
                } else {
                    p.points = p.points || 2;
                    readingProblems.push(p);
                }
            }
        }

        // Sort by problem number
        listeningProblems.sort((a, b) => a.number - b.number);
        readingProblems.sort((a, b) => a.number - b.number);

        // ── Generate picture for problem 4 via Imagen API ──
        let pictureUrl: string | null = null;
        if (pictureDescription) {
            try {
                console.log('[ListeningSet] Generating picture for problem 4...');
                const imagePrompt = `Create a simple, clean black-and-white line drawing illustration for a Korean CSAT English listening test. Do NOT include any numbers, labels, or text annotations (①②③④⑤ etc.) in the image. Numbers will be added as separate overlays. Style: textbook illustration, simple line art, clear and easy to read, no text. Scene: ${pictureDescription}`;
                
                const imagenResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ prompt: imagePrompt }],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: '1:1',
                                safetyFilterLevel: 'block_few',
                            },
                        }),
                    }
                );

                if (imagenResponse.ok) {
                    const imageData = await imagenResponse.json();
                    const b64 = imageData?.predictions?.[0]?.bytesBase64Encoded;
                    if (b64) {
                        pictureUrl = `data:image/png;base64,${b64}`;
                        // Assign to problem 4
                        const prob4 = listeningProblems.find(p => p.number === 4);
                        if (prob4) prob4.pictureUrl = pictureUrl;
                        console.log('[ListeningSet] Picture generated successfully');
                    }
                } else {
                    const err = await imagenResponse.text();
                    console.warn('[ListeningSet] Imagen failed:', err);
                }
            } catch (imgErr: any) {
                console.warn('[ListeningSet] Picture generation failed (non-critical):', imgErr.message);
            }
        }

        // ── Summary ──
        const summary = {
            listeningCount: listeningProblems.length,
            readingCount: readingProblems.length,
            totalCount: listeningProblems.length + readingProblems.length,
            errors: errors.length > 0 ? errors : undefined,
            hasPicture: !!pictureUrl,
            targetGrade,
        };

        console.log(`[ListeningSet] Generation complete:`, JSON.stringify(summary));

        return NextResponse.json({
            listeningProblems,
            readingProblems,
            pictureDescription,
            pictureUrl,
            summary,
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate listening set');
    }
}
