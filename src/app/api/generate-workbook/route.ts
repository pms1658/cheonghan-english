import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getWorkbookPrompt } from '@/services/geminiPrompts';
import { cleanPassageMarkers } from '@/utils/textUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function POST(req: Request) {
  try {
    const { passage: rawPassage, targetGrade = '3' } = await req.json();
    const passage = cleanPassageMarkers(rawPassage);

    if (!passage) {
      return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });
    const prompt = getWorkbookPrompt(targetGrade, passage);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower for structural strictness
      },
      safetySettings,
    });

    const response = await result.response;
    const text = response.text();
    return NextResponse.json(JSON.parse(text));

  } catch (error: any) {
    console.error('Workbook Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate workbook' }, { status: 500 });
  }
}
