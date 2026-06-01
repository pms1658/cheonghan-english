import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateListeningSetRequestSchema } from '@/schemas/api';
import { extractJSON } from '@/lib/aiUtils';

// Allow up to 180 seconds for 7 sequential Claude calls
export const maxDuration = 180;
import {
    getListeningBatch1Prompt,
    getListeningBatch2Prompt,
    getListeningBatch3Prompt,
    getListeningBatch4Prompt,
    getReadingBatch5Prompt,
    getReadingBatch6Prompt,
    getReadingBatch7Prompt,
} from '@/services/listeningPrompts';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// ── Single batch generator with Claude API ──
async function generateBatchClaude(
    prompt: string,
    batchLabel: string,
    retries = 2
): Promise<{ label: string; data: any; error?: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`[ListeningSet] Generating ${batchLabel} via Claude... (attempt ${attempt + 1})`);

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 16000,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Claude API ${response.status}: ${errorBody.substring(0, 200)}`);
            }

            const claudeResponse = await response.json();
            const textContent = claudeResponse.content?.find((block: any) => block.type === 'text');

            if (!textContent?.text) {
                throw new Error('No text content in Claude response');
            }

            const text = textContent.text;
            console.log(`[ListeningSet] ${batchLabel}: ${text.length} chars`);

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

// ── Delay helper ──
function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// ── POST Handler ──
export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        if (!ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요.' },
                { status: 500 }
            );
        }

        const body = await req.json();
        validateRequest(generateListeningSetRequestSchema, body, 'generate-listening-set');
        const { targetGrade = '3' } = body;

        console.log('[ListeningSet] Starting generation via Claude Sonnet for grade:', targetGrade);

        // ── Run batches in groups to respect rate limits ──
        // Group 1: Listening 1-5, 6-10, 11-15
        const group1 = await Promise.allSettled([
            generateBatchClaude(getListeningBatch1Prompt(targetGrade), 'listening_1_5'),
            generateBatchClaude(getListeningBatch2Prompt(targetGrade), 'listening_6_10'),
            generateBatchClaude(getListeningBatch3Prompt(targetGrade), 'listening_11_15'),
        ]);
        console.log('[ListeningSet] Group 1 done');

        await delay(1000);

        // Group 2: Listening 16-17, Reading 18-20, 25-28
        const group2 = await Promise.allSettled([
            generateBatchClaude(getListeningBatch4Prompt(targetGrade), 'listening_16_17'),
            generateBatchClaude(getReadingBatch5Prompt(targetGrade), 'reading_18_20'),
            generateBatchClaude(getReadingBatch6Prompt(targetGrade), 'reading_25_28'),
        ]);
        console.log('[ListeningSet] Group 2 done');

        await delay(1000);

        // Group 3: Reading 43-45
        const group3 = await Promise.allSettled([
            generateBatchClaude(getReadingBatch7Prompt(targetGrade), 'reading_43_45'),
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

        // ── Generate picture for problem 4 via Imagen API (still uses Gemini) ──
        let pictureUrl: string | null = null;
        if (pictureDescription && GEMINI_API_KEY) {
            try {
                console.log('[ListeningSet] Generating picture for problem 4 via Imagen...');
                const imagePrompt = `Create a simple, clean black-and-white line drawing illustration for a Korean CSAT English listening test. Do NOT include any numbers, labels, or text annotations (①②③④⑤ etc.) in the image. Numbers will be added as separate overlays. Style: textbook illustration, simple line art, clear and easy to read, no text. Scene: ${pictureDescription}`;
                
                const imagenResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
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
            model: 'claude-sonnet-4-20250514',
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
