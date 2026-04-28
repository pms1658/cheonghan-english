import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { extractWordsRequestSchema } from '@/schemas/api';

export async function POST(request: Request) {
    const blocked = apiGuard(request);
    if (blocked) return blocked;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('API Key Missing');
            return NextResponse.json({
                error: 'Missing credentials. Please set GEMINI_API_KEY in .env.local',
                details: 'Environment variable GEMINI_API_KEY is not set.'
            }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Using user's preferred model that is confirmed to work in other parts of the app
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: {
                // Ensure JSON mode is supported by the model
                responseMimeType: "application/json",
            }
        });

        const body = await request.json();
        validateRequest(extractWordsRequestSchema, body, 'extract-words');
        const { sentences, providedWords } = body;

        if (!sentences && !providedWords) {
            return NextResponse.json({ error: 'Invalid input: Text or Words required' }, { status: 400 });
        }

        const fullText = Array.isArray(sentences) ? sentences.join(' ') : (sentences || '');

        let prompt = '';

        if (providedWords && providedWords.length > 0) {
            // Mode 1: Context-based Definition for Provided Words
            prompt = `
            I will provide a text (Source Context) and a list of words (Target Words).
            Your task is to generate meanings and example sentences for the Target Words based STRICTLY on the Source Context.

            Source Context:
            "${fullText.slice(0, 50000)}" 
            
            Target Words: ${JSON.stringify(providedWords)}

            Instructions:
            1. For each Target Word, find where it appears in the Source Context.
            2. "meaning": Provide the Korean meaning of the word AS IT IS USED in that specific context. 
            3. "pronunciation": Provide the IPA (International Phonetic Alphabet) pronunciation guide (e.g., /wɜːrd/).
            4. "contextSentence": Copy the EXACT sentence from the Source Context where the word appears. 
               - If the word is NOT found in the Source Context, create a natural example sentence yourself and mark "partOfSpeech" as "Generic".
            5. "partOfSpeech": n, v, adj, adv, etc.

            Output JSON Format:
            { "words": [ { "term": "word", "meaning": "korean_meaning", "pronunciation": "/IPA/", "partOfSpeech": "n/v", "contextSentence": "exact_sentence_from_text" } ] }
            `;
        } else {
            // Mode 2: Auto Extraction
            prompt = `
            Analyze the following text and extract 20 key vocabulary words suitable for high school English learning.
            
            Text: "${fullText.slice(0, 50000)}"

            Requirements:
            1. Extract key words that are important for understanding the text.
            2. "meaning": Korean context meaning.
            3. "pronunciation": IPA (International Phonetic Alphabet).
            4. "partOfSpeech": n, v, adj, adv, etc.
            5. "contextSentence": Extract the EXACT sentence from the text containing the word.
            
            Output JSON Format:
            { "words": [ { "term": "...", "meaning": "...", "pronunciation": "...", "partOfSpeech": "...", "contextSentence": "..." } ] }
            `;
        }

        console.log('Gemini Call Start', {
            textLength: fullText.length,
            wordsCount: providedWords?.length,
            model: "gemini-3-flash-preview"
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Gemini Response Received. Length:', text.length);

        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            console.error('Offending Content:', text);
            throw new Error('AI response was not valid JSON');
        }

        const words = parsed.words || parsed.vocabulary || [];

        console.log(`Extracted ${words.length} words.`);

        return NextResponse.json({ words });

    } catch (error) {
        return createErrorResponse(error, 'Failed to extract words');
    }
}
