import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse } from '@/lib/apiMiddleware';
import { getVariantPrompt, getBestTypesPrompt, getPassageRewritePrompt, GRADE_LABELS } from '@/services/geminiPrompts';
import { cleanPassageMarkers } from '@/utils/textUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// Robust parser: handles Gemini's common output quirks
function extractJSON(text: string) {
    if (!text || text.trim().length === 0) {
        throw new Error('Empty AI response');
    }

    // 1. Strip markdown code fences if present
    let sanitized = text.trim();
    const markdownMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        sanitized = markdownMatch[1].trim();
    }

    // 2. Try direct JSON parse first
    try {
        return JSON.parse(sanitized);
    } catch (e) {
        // continue - likely has unescaped newlines in string values
    }

    // 3. Extract JSON object and fix unescaped newlines ONLY inside string values
    //    Gemini returns prettyprinted JSON where structural newlines are fine,
    //    but string values contain literal newlines that violate JSON spec.
    const firstBrace = sanitized.indexOf('{');
    const lastBrace = sanitized.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = sanitized.substring(firstBrace, lastBrace + 1);
        
        // Character-by-character walker: only escape newlines inside JSON strings
        const ESC_N = '\\' + 'n';  // produces literal backslash + n (two chars)
        const ESC_T = '\\' + 't';  // produces literal backslash + t (two chars)
        let fixed = '';
        let inString = false;
        let i = 0;
        while (i < jsonSubstring.length) {
            const ch = jsonSubstring[i];
            
            // Handle already-escaped sequences inside strings (e.g. \n, \", \\)
            if (inString && ch === '\\') {
                fixed += ch;
                if (i + 1 < jsonSubstring.length) {
                    fixed += jsonSubstring[i + 1];
                    i += 2;
                } else {
                    i++;
                }
                continue;
            }
            
            // Toggle string state on unescaped double quotes
            if (ch === '"') {
                inString = !inString;
                fixed += ch;
                i++;
                continue;
            }
            
            // Inside a string: escape problematic control characters
            if (inString) {
                const code = ch.charCodeAt(0);
                if (code === 0x0A) {         // \n (newline)
                    fixed += ESC_N;
                    i++;
                    continue;
                }
                if (code === 0x0D) {         // \r (carriage return)
                    i++;
                    continue;
                }
                if (code === 0x09) {         // \t (tab)
                    fixed += ESC_T;
                    i++;
                    continue;
                }
            }
            
            fixed += ch;
            i++;
        }
        
        try {
            return JSON.parse(fixed);
        } catch (e) {
            // Try eval-style as absolute last resort for JSON objects
            try {
                const fn = new Function('return ' + jsonSubstring);
                return fn();
            } catch (e2) {
                console.error('[extractJSON] Parse failed after fix:', (e as any).message);
            }
        }
    }

    // 4. Try Block Format parsing ([[QUESTION]] ... [[CHOICES]] ... [[ANSWER]] ... [[EXPLANATION]])
    const upperText = text.toUpperCase();
    if (upperText.includes('QUESTION') && (upperText.includes('CHOICES') || upperText.includes('ANSWER'))) {
        const qTag = /\[?\[?QUESTION\]?\]?/i;
        const cTag = /\[?\[?CHOICES\]?\]?/i;
        const aTag = /\[?\[?ANSWER\]?\]?/i;
        const eTag = /\[?\[?EXPLANATION\]?\]?/i;

        const parts = text.split(qTag);
        if (parts.length > 1) {
            const contentAfterQ = parts[1];
            const qAndCText = contentAfterQ.split(cTag);
            const question = qAndCText[0].trim();

            if (qAndCText.length > 1) {
                const cAndAText = qAndCText[1].split(aTag);
                const choicesRaw = cAndAText[0].trim().split('\n');

                const choices = choicesRaw
                    .map(c => c.replace(/^\d+[\.)\s]*/, '').trim())
                    .filter(c => c.length > 0)
                    .slice(0, 5);

                if (cAndAText.length > 1) {
                    const aAndEText = cAndAText[1].split(eTag);
                    let answerVal = parseInt(aAndEText[0].trim().replace(/[^\d]/g, ''));
                    if (isNaN(answerVal)) answerVal = 1;
                    const correctAnswer = Math.max(0, answerVal - 1);
                    const explanation = aAndEText.length > 1 ? aAndEText[1].trim() : "";

                    return {
                        question,
                        choices: choices.length >= 5 ? choices.slice(0, 5) : [...choices, ...Array(5 - choices.length).fill('-')],
                        correctAnswer,
                        explanation
                    };
                }
            }
        }
    }

    throw new Error('Could not parse AI response: ' + text.substring(0, 200));
}

export async function POST(req: Request) {
    const blocked = apiGuard(req);
    if (blocked) return blocked;

    try {
        if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server configuration error: Gemini API Key is missing.' }, { status: 500 });
        }

        let { passage: rawPassage, problemTypes, autoGenerate, targetGrade = '3', isSpecialLevel = false } = await req.json();
        let passage = cleanPassageMarkers(rawPassage);

        if (!passage) {
            return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // ★ SL MODE: Rewrite passage first, then generate problems from rewritten version
        let rewrittenPassage: string | null = null;
        let changesSummary: string | null = null;
        
        if (isSpecialLevel) {
            try {
                const rewritePrompt = getPassageRewritePrompt(passage, targetGrade);
                const rewriteResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: rewritePrompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
                });
                const rewriteResponse = rewriteResult.response.text();
                console.log('[API] SL Rewrite response length:', rewriteResponse.length);
                const rewriteData = extractJSON(rewriteResponse);
                
                if (rewriteData.rewrittenPassage) {
                    rewrittenPassage = rewriteData.rewrittenPassage;
                    changesSummary = rewriteData.changes || '지문이 변형되었습니다.';
                    // Use rewritten passage for problem generation
                    passage = rewrittenPassage!;
                    // SL uses the user-selected targetGrade (no longer forced to H2)
                    // Force auto-generate mode
                    autoGenerate = true;
                    problemTypes = [];
                } else {
                    throw new Error('Rewrite failed: no rewrittenPassage in response');
                }
            } catch (e) {
                console.error('[API] SL Rewrite failed:', e);
                return NextResponse.json({ error: 'SL 지문 변형 실패: ' + (e as any).message }, { status: 500 });
            }
        }

        // AUTO MODE: Smart Selection using AI
        if (autoGenerate || !problemTypes || problemTypes.length === 0) {
            try {
                const typeAnalysisPrompt = getBestTypesPrompt(targetGrade, passage);
                const typeResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: typeAnalysisPrompt }] }],
                    generationConfig: { temperature: 0.3 }
                });
                const rawTypeResponse = typeResult.response.text();
                console.log("[API] Smart Type Selection response:", rawTypeResponse.substring(0, 200));
                const suggestedTypes = extractJSON(rawTypeResponse);

                if (Array.isArray(suggestedTypes) && suggestedTypes.length > 0) {
                    problemTypes = suggestedTypes.slice(0, 6);
                } else {
                    problemTypes = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
                }
            } catch (e) {
                console.warn("Smart Type Selection Failed, using default:", e);
                problemTypes = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
            }
        }

        const finalProblems: any[] = [];
        const fallbackPool = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion', 'title', 'claim', 'flow', 'summary', 'meaning']
            .filter(t => !problemTypes.includes(t));

        async function attemptGeneration(type: string, index: number, retryCount = 0): Promise<any> {
            const prompt = getVariantPrompt(type, targetGrade, passage);
            const tokenLimit = retryCount > 0 ? 16384 : 8192;
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: tokenLimit },
                    safetySettings,
                });

                const response = await result.response;
                if (!response.candidates || response.candidates.length === 0) throw new Error('Safety Blocked');

                const responseText = response.text();
                const finishReason = response.candidates?.[0]?.finishReason;
                console.log(`[API] Type ${type} response length: ${responseText.length}, finishReason: ${finishReason}, tokenLimit: ${tokenLimit}`);
                
                // Retry with higher token limit if truncated
                if (finishReason === 'MAX_TOKENS' && retryCount < 1) {
                    console.warn(`[API] Type ${type}: Truncated, retrying with higher token limit...`);
                    return attemptGeneration(type, index, retryCount + 1);
                }

                const problemData = extractJSON(responseText);
                if (!problemData.question || !Array.isArray(problemData.choices)) throw new Error('Invalid Format');

                while (problemData.choices.length < 5) problemData.choices.push('-');

                return {
                    id: `prob_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
                    type,
                    question: problemData.question,
                    choices: problemData.choices.slice(0, 5),
                    correctAnswer: problemData.correctAnswer ?? 0,
                    explanation: problemData.explanation || ''
                };
            } catch (err) {
                console.error(`[API] Failed type: ${type}`, err);
                if (autoGenerate && fallbackPool.length > 0) {
                    const nextType = fallbackPool.shift()!;
                    console.log(`[API] Retrying with fallback type: ${nextType}`);
                    return attemptGeneration(nextType, index);
                }
                throw err;
            }
        }

        const tasks = (problemTypes as string[]).map((type: string, i: number) => attemptGeneration(type, i));
        const results = await Promise.allSettled(tasks);

        results.forEach((res, i) => {
            if (res.status === 'fulfilled') {
                finalProblems.push(res.value);
            } else {
                finalProblems.push({
                    id: `prob_${Date.now()}_${i}`,
                    type: problemTypes[i],
                    question: `Failed to generate (${problemTypes[i]})`,
                    choices: ['Error', '-', '-', '-', '-'],
                    correctAnswer: 0,
                    explanation: 'AI generation failed after retries.'
                });
            }
        });

        // Points calculation
        const pointsPerProblem = Math.floor(100 / finalProblems.length);
        let remainingPoints = 100;
        const problemsWithPoints = finalProblems.map((p, i) => {
            const points = (i === finalProblems.length - 1) ? remainingPoints : pointsPerProblem;
            remainingPoints -= points;
            return { ...p, points };
        });

        return NextResponse.json({ 
            problems: problemsWithPoints,
            ...(rewrittenPassage ? { rewrittenPassage, changesSummary } : {})
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate problems');
    }
}
