import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateVariantRequestSchema } from '@/schemas/api';
import { getVariantPrompt, getBestTypesPrompt, getPassageRewritePrompt, GRADE_LABELS } from '@/services/geminiPrompts';
import { cleanPassageMarkers, sanitizeAIQuestionText, sanitizeChoiceText, sanitizeSummaryBlanks } from '@/utils/textUtils';
import { extractJSONWithBlockFallback as extractJSON } from '@/lib/aiUtils';

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



export async function POST(req: Request) {
    const blocked = apiGuard(req, { rateLimit: AI_RATE_LIMIT });
    if (blocked) return blocked;

    try {
        if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Server configuration error: Gemini API Key is missing.' }, { status: 500 });
        }

        const body = await req.json();
        validateRequest(generateVariantRequestSchema, body, 'generate-variant-problems');
        let { passage: rawPassage, problemTypes, autoGenerate, autoCount, targetGrade = '3', isSpecialLevel = false, singleType } = body;
        let passage = cleanPassageMarkers(rawPassage);

        if (!passage) {
            return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        // ★ SINGLE TYPE MODE: 개별 문제 재생성
        if (singleType) {
            try {
                const prompt = getVariantPrompt(singleType, targetGrade, passage);
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
                    safetySettings,
                });
                const responseText = result.response.text();
                const problemData = extractJSON(responseText);
                if (!problemData.question || !Array.isArray(problemData.choices)) {
                    throw new Error('Invalid Format');
                }
                while (problemData.choices.length < 5) problemData.choices.push('-');
                const rawProblem = {
                    id: `prob_${Date.now()}_regen_${Math.random().toString(36).substr(2, 5)}`,
                    type: singleType,
                    question: singleType === 'summary'
                        ? sanitizeSummaryBlanks(sanitizeAIQuestionText(problemData.question), problemData.choices)
                        : sanitizeAIQuestionText(problemData.question),
                    choices: problemData.choices.slice(0, 5).map((c: string) => sanitizeChoiceText(c)),
                    correctAnswer: problemData.correctAnswer ?? 0,
                    explanation: (problemData.explanation || '').trim(),
                    choiceExplanations: (problemData.choiceExplanations || []).map((e: string) => (e || '').trim()),
                };
                // order 유형 선지 강제 정규화 (재생성 시에도 동일하게 적용)
                const ORDER_STD = ['(A) - (C) - (B)','(B) - (A) - (C)','(B) - (C) - (A)','(C) - (A) - (B)','(C) - (B) - (A)'];
                function normOrd(p: any) {
                    if (p.type !== 'order') return p;
                    const n = (c: string) => c.trim().replace(/\s*[–—]\s*/g,' - ').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').trim();
                    const nc = p.choices.map(n);
                    const ct = nc[p.correctAnswer] ?? '';
                    const remapped = ORDER_STD.indexOf(ct);
                    let r = { ...p, choices: ORDER_STD, correctAnswer: remapped >= 0 ? remapped : 0 };
                    // split 방식으로 (A)(B)(C) 섹션 추출 후 원문 위치로 정답 검증
                    try {
                        const q = p.question || '';
                        const noBox = q.replace(/\[\[BOX\]\][\s\S]*?\[\[\/BOX\]\]/gi,'').replace(/\[\[\/BOX\]\]/gi,'').trim();
                        const parts = noBox.split(/\(([A-C])\)/);
                        const secs: Record<string,string> = {};
                        for (let i=1; i<parts.length; i+=2) {
                            const lbl=parts[i], cnt=(parts[i+1]||'').replace(/\[\[.*?\]\]/g,'').replace(/\s+/g,' ').trim();
                            if (lbl && cnt.length>=5) secs[lbl]=cnt.substring(0,50);
                        }
                        const sA=secs['A']||'', sB=secs['B']||'', sC=secs['C']||'';
                        if (sA && sB && sC) {
                            const pf = passage.replace(/\s+/g,' ');
                            const fp = (s:string)=>{ for(let l=Math.min(s.length,45);l>=10;l-=5){ const i=pf.indexOf(s.substring(0,l)); if(i>=0) return i; } return -1; };
                            const pA=fp(sA), pB=fp(sB), pC=fp(sC);
                            if (pA>=0 && pB>=0 && pC>=0) {
                                const sorted=[{l:'A',p:pA},{l:'B',p:pB},{l:'C',p:pC}].sort((a,b)=>a.p-b.p);
                                const seq=`(${sorted[0].l}) - (${sorted[1].l}) - (${sorted[2].l})`;
                                const vi=ORDER_STD.indexOf(seq);
                                if (vi>=0) { r={...r,correctAnswer:vi}; }
                                else {
                                    // 표준에 없는 순서 (AI가 레이블 미스크램블) → 가장 가까운 표준 선지 매핑
                                    const maps:Record<string,string>={'A-B-C':'(A) - (C) - (B)','A-C-B':'(A) - (C) - (B)','B-A-C':'(B) - (A) - (C)','B-C-A':'(B) - (C) - (A)','C-A-B':'(C) - (A) - (B)','C-B-A':'(C) - (B) - (A)'};
                                    const key=`${sorted[0].l}-${sorted[1].l}-${sorted[2].l}`;
                                    const fi=ORDER_STD.indexOf(maps[key]??'');
                                    if (fi>=0) r={...r,correctAnswer:fi};
                                }
                            }
                        }
                    } catch(_) {}
                    return r;
                }
                const problem = normOrd(rawProblem);
                return NextResponse.json({ problem });
            } catch (err) {
                return createErrorResponse(err, '개별 문제 재생성 실패');
            }
        }

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
                    // Limit to autoCount if specified
                    const limit = autoCount && autoCount > 0 ? Math.min(autoCount, suggestedTypes.length) : suggestedTypes.length;
                    problemTypes = suggestedTypes.slice(0, limit);
                } else {
                    const defaults = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
                    const limit = autoCount && autoCount > 0 ? Math.min(autoCount, defaults.length) : defaults.length;
                    problemTypes = defaults.slice(0, limit);
                }
            } catch (e) {
                console.warn("Smart Type Selection Failed, using default:", e);
                const defaults = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion'];
                const limit = autoCount && autoCount > 0 ? Math.min(autoCount, defaults.length) : defaults.length;
                problemTypes = defaults.slice(0, limit);
            }
        }

        const finalProblems: any[] = [];
        const fallbackPool = ['topic', 'vocabulary', 'grammar', 'blank', 'order', 'insertion', 'title', 'claim', 'flow', 'summary', 'meaning', 'mismatch']
            .filter(t => !problemTypes.includes(t));

        // ★ order 유형 선지 서버측 강제 정규화 (수능 실제 5개 고정)
        const ORDER_CHOICES_STANDARD = [
            '(A) - (C) - (B)',
            '(B) - (A) - (C)',
            '(B) - (C) - (A)',
            '(C) - (A) - (B)',
            '(C) - (B) - (A)',
        ];
        function normalizeOrderProblemServer(prob: any): any {
            if (prob.type !== 'order') return prob;

            const norm = (c: string) =>
                c.trim().replace(/\s*[–—]\s*/g, ' - ').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
            const normalized = (prob.choices as string[]).map(norm);

            // Step 1: 선지를 표준 5개로 교체 + correctAnswer 텍스트 기반 재매핑
            const correctText = normalized[prob.correctAnswer] ?? '';
            const alreadyExact = normalized.length === 5 && normalized.every((n, i) => n === ORDER_CHOICES_STANDARD[i]);
            let remappedAnswer = prob.correctAnswer;
            if (!alreadyExact) {
                const idx = ORDER_CHOICES_STANDARD.indexOf(correctText);
                remappedAnswer = idx >= 0 ? idx : 0;
            }
            let result = { ...prob, choices: ORDER_CHOICES_STANDARD, correctAnswer: remappedAnswer };

            // Step 2: 원문 위치 추적으로 correctAnswer 자동 검증·교정
            // split 방식으로 (A)(B)(C) 섹션 추출 → 훨씬 더 신뢰성 있음
            try {
                const q = prob.question || '';

                // [[BOX]]...[[/BOX]] 제거 후, (A)/(B)/(C) 레이블로 split
                const noBox = q
                    .replace(/\[\[BOX\]\][\s\S]*?\[\[\/BOX\]\]/gi, '')
                    .replace(/\[\[\/BOX\]\]/gi, '') // 혹시 닫힘 태그만 남은 경우
                    .trim();

                // "(A)", "(B)", "(C)" 로 나눠 각 섹션 텍스트 추출
                const sectionParts = noBox.split(/\(([A-C])\)/);
                // sectionParts = [before, 'A', A_content, 'B', B_content, 'C', C_content]
                const sections: Record<string, string> = {};
                for (let i = 1; i < sectionParts.length; i += 2) {
                    const lbl = sectionParts[i];
                    const content = (sectionParts[i + 1] || '')
                        .replace(/\[\[.*?\]\]/g, '')  // 마커 제거
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (lbl && content.length >= 5) {
                        sections[lbl] = content.substring(0, 50);
                    }
                }

                const snipA = sections['A'] || '';
                const snipB = sections['B'] || '';
                const snipC = sections['C'] || '';

                console.log('[API] Order snippets:', { A: snipA.substring(0,25), B: snipB.substring(0,25), C: snipC.substring(0,25) });

                if (snipA && snipB && snipC) {
                    const passageFlat = passage.replace(/\s+/g, ' ');
                    const findPos = (snippet: string): number => {
                        // 길이를 줄여가며 검색
                        for (let len = Math.min(snippet.length, 45); len >= 10; len -= 5) {
                            const p = passageFlat.indexOf(snippet.substring(0, len));
                            if (p >= 0) return p;
                        }
                        return -1;
                    };
                    const posA = findPos(snipA);
                    const posB = findPos(snipB);
                    const posC = findPos(snipC);

                    console.log(`[API] Order passage positions: A=${posA} B=${posB} C=${posC}`);

                    if (posA >= 0 && posB >= 0 && posC >= 0) {
                        const sorted = [{ l: 'A', p: posA }, { l: 'B', p: posB }, { l: 'C', p: posC }]
                            .sort((a, b) => a.p - b.p);
                        const correctSeq = `(${sorted[0].l}) - (${sorted[1].l}) - (${sorted[2].l})`;
                        const verifiedIdx = ORDER_CHOICES_STANDARD.indexOf(correctSeq);

                        if (verifiedIdx >= 0) {
                            // 표준 선지에 있는 순서 → 그대로 사용
                            if (verifiedIdx !== result.correctAnswer) {
                                console.log(`[API] Order correctAnswer verified: ${result.correctAnswer}→${verifiedIdx} ("${correctSeq}")`);
                            }
                            result = { ...result, correctAnswer: verifiedIdx };
                        } else {
                            // "(A)-(B)-(C)" 처럼 표준에 없는 순서 → AI가 레이블을 스크램블하지 않음
                            // 이 경우 (A)가 첫 번째이므로, 두 번째(sorted[1])와 세 번째(sorted[2])를 찾아
                            // 가능한 표준 선지로 매핑
                            console.log(`[API] Order verify: "${correctSeq}" not in standard choices — labels not scrambled`);
                            // 첫 번째가 A임을 알 때: "(A)-(x)-(y)"는 표준에서 "(A)-(C)-(B)"만 존재
                            // 두 번째가 B임을 알 때: "(x)-(B)-(y)"는 표준에서 "(C)-(B)-(A)"만 존재
                            const first = sorted[0].l, second = sorted[1].l, third = sorted[2].l;
                            const mappings: Record<string, string> = {
                                'A-B-C': '(A) - (C) - (B)', // A가 첫 번째, B가 두 번째면 C가 세 번째 → 선지는 (A)-(C)-(B)나 (A)-(x)-(y) 중 유일한 것
                                'A-C-B': '(A) - (C) - (B)',
                                'B-A-C': '(B) - (A) - (C)',
                                'B-C-A': '(B) - (C) - (A)',
                                'C-A-B': '(C) - (A) - (B)',
                                'C-B-A': '(C) - (B) - (A)',
                            };
                            const key = `${first}-${second}-${third}`;
                            const fallbackSeq = mappings[key];
                            const fallbackIdx = fallbackSeq ? ORDER_CHOICES_STANDARD.indexOf(fallbackSeq) : -1;
                            if (fallbackIdx >= 0) {
                                console.log(`[API] Order correctAnswer fallback: ${result.correctAnswer}→${fallbackIdx} ("${fallbackSeq}")`);
                                result = { ...result, correctAnswer: fallbackIdx };
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[API] Order passage verification failed, using remapped answer:', e);
            }

            return result;
        }

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
                    question: type === 'summary'
                        ? sanitizeSummaryBlanks(sanitizeAIQuestionText(problemData.question), problemData.choices)
                        : sanitizeAIQuestionText(problemData.question),
                    choices: problemData.choices.slice(0, 5).map((c: string) => sanitizeChoiceText(c)),
                    correctAnswer: problemData.correctAnswer ?? 0,
                    explanation: (problemData.explanation || '').trim(),
                    choiceExplanations: (problemData.choiceExplanations || []).map((e: string) => (e || '').trim())
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

        // Points calculation (order 유형 선지 정규화 포함)
        const pointsPerProblem = Math.floor(100 / finalProblems.length);
        let remainingPoints = 100;
        const problemsWithPoints = finalProblems.map((p, i) => {
            const normalized = normalizeOrderProblemServer(p);
            const points = (i === finalProblems.length - 1) ? remainingPoints : pointsPerProblem;
            remainingPoints -= points;
            return { ...normalized, points };
        });

        return NextResponse.json({ 
            problems: problemsWithPoints,
            ...(rewrittenPassage ? { rewrittenPassage, changesSummary } : {})
        });

    } catch (error) {
        return createErrorResponse(error, 'Failed to generate problems');
    }
}
