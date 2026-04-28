
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { apiGuard, createErrorResponse } from '@/lib/apiMiddleware';
import { getPremiumAnalysisPrompt } from "@/services/geminiPrompts";
import { cleanPassageMarkers } from "@/utils/textUtils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        const { sentences, grade = '2' } = await req.json();
        // Handle both string[] and AnalysisSentence[]
        const rawPassage = Array.isArray(sentences)
            ? sentences.map((s: any) => typeof s === 'string' ? s : s.original).join(' ')
            : sentences;
        const passage = cleanPassageMarkers(rawPassage);

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = getPremiumAnalysisPrompt(passage, grade);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 16384 }
        });
        const response = await result.response;
        const text = response.text();

        // Clean JSON — remove markdown code blocks if present
        const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const json = JSON.parse(cleanedText);

        return NextResponse.json(json);

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate analysis');
    }
}
