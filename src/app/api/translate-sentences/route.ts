import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const { sentences } = await req.json();
        if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
            return NextResponse.json({ error: 'sentences array required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
다음 영어 문장들을 한국어로 자연스럽게 번역해주세요.
직역보다는 의미가 잘 전달되도록 자연스러운 한국어로 번역하세요.

문장 목록:
${sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

JSON 형식으로 응답:
{ "translations": ["번역1", "번역2", ...] }

반드시 입력 문장 수와 동일한 수의 번역을 반환하세요.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

        return NextResponse.json({ translations: parsed.translations || [] });

    } catch (error) {
        console.error('Translation Error:', error);
        return NextResponse.json(
            { error: 'Translation failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
