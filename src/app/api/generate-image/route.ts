import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateImageRequestSchema } from '@/schemas/api';

export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        const body = await req.json();
        validateRequest(generateImageRequestSchema, body, 'generate-image');
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY
            || process.env.NEXT_PUBLIC_GEMINI_API_KEY
            || '';

        if (!apiKey) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        // Apply a style instruction to make it look like a CSAT picture problem
        const fullPrompt = "A simple, clean black and white line art sketch, similar to a Korean CSAT (Suneung) English listening test illustration. " + prompt;

        // Call Imagen 4 API via the predict endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: fullPrompt }],
                    parameters: { 
                        sampleCount: 1,
                        aspectRatio: '4:3'
                    }
                }),
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('[Imagen] Error:', err);
            return NextResponse.json({
                error: 'Image generation failed',
                details: err.error?.message || response.statusText
            }, { status: response.status });
        }

        const data = await response.json();
        const base64 = data?.predictions?.[0]?.bytesBase64Encoded;

        if (!base64) {
            return NextResponse.json({ error: 'No image data returned' }, { status: 500 });
        }

        return NextResponse.json({ imageBase64: base64 });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate image');
    }
}
