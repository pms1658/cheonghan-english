"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    GeminiStructureAnalysis,
    GeminiTranslation,
    GeminiGrading,
} from "@/types/chunk-reading";

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }) : null;

/**
 * Split passage into sentences using AI or fallback
 */
export async function splitIntoSentences(passage: string): Promise<string[]> {
    // Fallback: simple sentence splitting
    const fallbackSplit = () => {
        return passage
            .split(/(?<=[.!?])\s+/)
            .filter((s) => s.trim().length > 0)
            .map(s => s.trim());
    };

    if (!model) {
        console.log("Gemini API key not found, using fallback splitting");
        return fallbackSplit();
    }

    try {
        const prompt = `Split the following English passage into individual sentences.
Handle complex punctuation like semicolons, em-dashes, and parenthetical statements.
Each sentence should be a complete grammatical unit.

Passage: "${passage}"

Return ONLY a JSON object in this format: {"sentences": ["sentence1", "sentence2", ...]}
Do not include any other text or explanation.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.sentences || fallbackSplit();
        }

        return fallbackSplit();
    } catch (error) {
        console.error("Error splitting sentences:", error);
        return fallbackSplit();
    }
}

/**
 * Analyze sentence structure
 */
export async function analyzeStructure(
    sentence: string
): Promise<GeminiStructureAnalysis | null> {
    if (!model) return null;

    try {
        const prompt = `Analyze the following English sentence and identify:
1. Main verb(s) and their positions
2. Modifying phrases/clauses (adjective/adverb) with their types and positions
3. Subordinate and coordinate clauses
4. The sentence backbone (main subject-verb-object structure)

Sentence: "${sentence}"

Return ONLY a JSON object with this structure:
{
  "backbone": "simplified main sentence",
  "verbs": [{"text": "verb", "position": [start, end]}],
  "modifiers": [{"text": "phrase", "type": "adjective|adverb|relative-clause|participial|prepositional", "position": [start, end]}],
  "clauses": [{"text": "clause", "type": "subordinate|coordinate", "position": [start, end]}]
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("Error analyzing structure:", error);
        return null;
    }
}

/**
 * Translate with structure preservation
 */
export async function translateWithStructure(
    sentence: string
): Promise<GeminiTranslation | null> {
    if (!model) {
        return {
            translation: "AI 번역을 사용하려면 API 키 설정이 필요합니다.",
            backbone: ""
        };
    }

    try {
        const prompt = `Translate the following English sentence to Korean.
Keep modifiers (adjective/adverb phrases and clauses) in parentheses.
Also provide the sentence backbone (main structure only).

Sentence: "${sentence}"

Return ONLY a JSON object:
{
  "translation": "Korean translation with (modifiers in parentheses)",
  "backbone": "main sentence structure in Korean"
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("Error translating:", error);
        return null;
    }
}

/**
 * Grade student translation
 */
export async function gradeTranslation(
    originalEnglish: string,
    studentTranslation: string
): Promise<GeminiGrading | null> {
    if (!model) {
        return {
            score: 0,
            feedback: "AI 채점을 사용하려면 API 키 설정이 필요합니다.",
            misunderstoodWords: [],
            strengths: [],
            improvements: []
        };
    }

    try {
        const prompt = `Compare the student's Korean translation with the English original.

Original English: "${originalEnglish}"
Student Translation (Korean): "${studentTranslation}"

Evaluate:
1. Overall accuracy (0-100)
2. Words/phrases the student misunderstood
3. What they did well
4. How to improve

Return ONLY a JSON object:
{
  "score": 85,
  "feedback": "overall feedback in Korean",
  "misunderstoodWords": ["word1", "word2"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("Error grading translation:", error);
        return null;
    }
}

export async function gradeChunkReading(sentence: string, markingDescription: string) {
    if (!model) return null;
    try {
        const prompt = `영어 문장: ${sentence}
학생의 구조독해 표시: ${markingDescription}

학생의 구조독해 표시를 채점하고, 반드시 한국어로 피드백을 작성해주세요.
JSON 형식으로 응답: {"score": 85, "feedback": "한국어 피드백", "correctMarkings": ["잘한 점1", "잘한 점2"], "suggestions": ["개선 제안1"]}`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        return null;
    }
}
