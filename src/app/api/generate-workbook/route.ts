import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateWorkbookRequestSchema } from '@/schemas/api';
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
  const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    validateRequest(generateWorkbookRequestSchema, body, 'generate-workbook');
    const { passage: rawPassage, targetGrade = '3' } = body;
    const passage = cleanPassageMarkers(rawPassage);

    if (!passage) {
      return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
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

  } catch (error) {
    return createErrorResponse(error, 'Failed to generate workbook');
  }
}
