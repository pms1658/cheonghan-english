import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { items } = await req.json();
        // items: Array<{ word: string, correctMeaning: string, studentInput: string }>

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Build compact prompt — all items in one call
        const itemLines = items.map((item: any, idx: number) => {
            return `${idx + 1}. word: "${item.word}" | correctMeaning: "${item.correctMeaning}" | studentInput: "${item.studentInput}"`;
        }).join('\n');

        const prompt = `
You are a Korean vocabulary grading assistant for a high-school English study platform.

Below is a list of vocabulary test answers. For each item:
- "word" is the English word being tested.
- "correctMeaning" is the original Korean meaning stored in the database. It may contain multiple meanings separated by commas (e.g., "추측하다, 가정하다").
- "studentInput" is what the student typed in Korean.

### Grading Rules:
1. If the student's input matches ANY ONE of the correct meanings (even partially or with synonyms), mark it as CORRECT.
2. Accept reasonable synonyms. For example: "추론하다" for "추측하다", "상상하다" for "상상, 가상", "기부하다" for "기증하다".
3. Accept minor variations: "~하다" vs "~하는 것", trailing particles like "를", "을", "의" differences.
4. If the student wrote nothing (empty string), mark as INCORRECT.
5. Be generous — if the student clearly understands the concept behind the word, mark CORRECT.
6. However, if the meaning is fundamentally different (e.g., "사과" for "apple" when the word means "apply"), mark INCORRECT.

### Input:
${itemLines}

### Output:
Return a JSON array with exactly ${items.length} elements.
Each element should be: { "index": <1-based index>, "correct": <true or false> }

Example: [{"index": 1, "correct": true}, {"index": 2, "correct": false}]
`;

        console.log(`[grade-vocab-ko] Grading ${items.length} items...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        
        // Normalize to a simple boolean map: { 0: true, 1: false, ... }
        const results: Record<number, boolean> = {};
        if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
                const idx = (item.index || item.idx || 0) - 1; // Convert 1-based to 0-based
                results[idx] = !!item.correct;
            });
        }

        // Fill any missing indices with false
        for (let i = 0; i < items.length; i++) {
            if (results[i] === undefined) results[i] = false;
        }

        console.log(`[grade-vocab-ko] Done. ${Object.values(results).filter(v => v).length}/${items.length} correct`);

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[grade-vocab-ko] Error:', error);
        return NextResponse.json(
            { error: 'Failed to grade vocabulary', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
