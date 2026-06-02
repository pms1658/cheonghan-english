import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { translateSentencesRequestSchema } from '@/schemas/api';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const body = await req.json();
        validateRequest(translateSentencesRequestSchema, body, 'translate-sentences');
        const { sentences } = body;
        if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
            return NextResponse.json({ error: 'sentences array required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
?¤ìŒ ?ì–´ ë¬¸ì¥?¤ì„ ?œêµ­?´ë¡œ ?ì—°?¤ëŸ½ê²?ë²ˆì—­?´ì£¼?¸ìš”.
ì§ì—­ë³´ë‹¤???˜ë?ê°€ ???„ë‹¬?˜ë„ë¡??ì—°?¤ëŸ¬???œêµ­?´ë¡œ ë²ˆì—­?˜ì„¸??

ë¬¸ì¥ ëª©ë¡:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

JSON ?•ì‹?¼ë¡œ ?‘ë‹µ:
{ "translations": ["ë²ˆì—­1", "ë²ˆì—­2", ...] }

ë°˜ë“œ???…ë ¥ ë¬¸ì¥ ?˜ì? ?™ì¼???˜ì˜ ë²ˆì—­??ë°˜í™˜?˜ì„¸??
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

        return NextResponse.json({ translations: parsed.translations || [] });

    } catch (error) {
        return createErrorResponse(error, 'Translation failed');
    }
}
