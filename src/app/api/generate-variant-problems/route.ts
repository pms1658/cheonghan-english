import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest, AI_RATE_LIMIT } from '@/lib/apiMiddleware';
import { generateVariantRequestSchema } from '@/schemas/api';
import { getVariantPrompt, getBestTypesPrompt, getPassageRewritePrompt, GRADE_LABELS } from '@/services/geminiPrompts';
import { cleanPassageMarkers, sanitizeAIQuestionText, sanitizeChoiceText, sanitizeSummaryBlanks, extractExistingProblemInfo } from '@/utils/textUtils';
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
        
        // Detect existing problem patterns BEFORE cleaning markers
        const existingProblem = extractExistingProblemInfo(rawPassage);
        if (existingProblem) {
            console.log('[API] Existing problem detected in input:', {
                choiceCount: existingProblem.choices.length,
                questionSnippet: existingProblem.questionSnippet,
                choices: existingProblem.choices.slice(0, 3).map(c => c.substring(0, 40)),
            });
        }
        
        let passage = cleanPassageMarkers(rawPassage);

        if (!passage) {
            return NextResponse.json({ error: 'Passage is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        // ★ SINGLE TYPE MODE: 개별 문제 재생성
        if (singleType) {
            try {
                const prompt = getVariantPrompt(singleType, targetGrade, passage, existingProblem);
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
                                    // ★ 표준에 없는 순서 (AI가 레이블 미스크램블) → 레이블 swap으로 교정
                                    const first=sorted[0].l, second=sorted[1].l, third=sorted[2].l;
                                    // 둘째↔셋째 swap → 정답이 "(first)-(third)-(second)"가 됨
                                    const swSeq=`(${first}) - (${third}) - (${second})`;
                                    const swIdx=ORDER_STD.indexOf(swSeq);
                                    if (swIdx>=0) {
                                        let swQ=r.question;
                                        const lb2=`(${second})`, lb3=`(${third})`, tmp='(__SWAP_TEMP__)';
                                        swQ=swQ.split(lb2).join(tmp);
                                        swQ=swQ.split(lb3).join(lb2);
                                        swQ=swQ.split(tmp).join(lb3);
                                        let swExp=r.explanation||'';
                                        swExp=swExp.split(lb2).join(tmp);
                                        swExp=swExp.split(lb3).join(lb2);
                                        swExp=swExp.split(tmp).join(lb3);
                                        const swCE=(r.choiceExplanations||[]).map((e:string)=>{
                                            let s=e; s=s.split(lb2).join(tmp); s=s.split(lb3).join(lb2); s=s.split(tmp).join(lb3); return s;
                                        });
                                        console.log(`[API/regen] Order label swap: ${lb2}↔${lb3}, answer→${swIdx}`);
                                        r={...r, question:swQ, correctAnswer:swIdx, explanation:swExp, choiceExplanations:swCE};
                                    }
                                }
                            }
                        }
                    } catch(_) {}
                    return r;
                }
                // insertion 유형 correctAnswer 검증 (재생성 시에도 적용)
                function valIns(p: any) {
                    if (p.type !== 'insertion') return p;
                    let ca = p.correctAnswer ?? 0;
                    // 범위 검증
                    if (typeof ca !== 'number' || ca < 0 || ca > 4) {
                        if (ca >= 1 && ca <= 5) { ca = ca - 1; }
                        else { ca = 0; }
                    }
                    // [[TARGET]] 원문 위치 추적
                    try {
                        const q = p.question || '';
                        const tm = q.match(/\[\[TARGET\]\]([\s\S]*?)\[\[\/TARGET\]\]/i);
                        if (tm && tm[1]) {
                            const ts = tm[1].replace(/\s+/g,' ').trim().substring(0,60);
                            const pf = passage.replace(/\s+/g,' ');
                            let tp=-1;
                            for(let l=Math.min(ts.length,50);l>=15;l-=5){ const i=pf.indexOf(ts.substring(0,l)); if(i>=0){tp=i;break;} }
                            if(tp>=0){
                                const qNoT=q.replace(/\[\[TARGET\]\][\s\S]*?\[\[\/TARGET\]\]/i,'');
                                const mks=['①','②','③','④','⑤'];
                                const mps:{m:number;p:number}[]=[];
                                for(let mi=0;mi<mks.length;mi++){
                                    const mp=qNoT.indexOf(mks[mi]);
                                    if(mp>=0){
                                        const af=qNoT.substring(mp+1).replace(/\s+/g,' ').trim().substring(0,40);
                                        let pp=-1;
                                        for(let l=Math.min(af.length,35);l>=10;l-=5){ const i=pf.indexOf(af.substring(0,l)); if(i>=0){pp=i;break;} }
                                        if(pp>=0) mps.push({m:mi,p:pp});
                                    }
                                }
                                if(mps.length>=3){
                                    mps.sort((a,b)=>a.p-b.p);
                                    let ea=-1;
                                    for(const mp of mps){ if(mp.p>tp){ea=mp.m;break;} }
                                    if(ea<0&&mps.length>0) ea=mps[mps.length-1].m;
                                    if(ea>=0&&ea!==ca){ console.log(`[API/regen] Insertion answer verified: ${ca}→${ea}`); ca=ea; }
                                }
                            }
                        }
                    } catch(_) {}
                    return {...p, correctAnswer: ca};
                }
                const problem = valIns(normOrd(rawProblem));
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
                            // ★★★ 핵심 수정: "(A)-(B)-(C)" 처럼 표준에 없는 순서 → AI가 레이블을 스크램블하지 않음
                            // 단순 매핑이 아니라, question 텍스트에서 (B)↔(C) 레이블을 실제로 swap하여
                            // 정답이 "(A)-(C)-(B)"가 되도록 함 (텍스트와 정답이 일치하게)
                            console.log(`[API] Order verify: "${correctSeq}" not in standard choices — labels not scrambled, performing label swap`);
                            
                            // 원문 순서(sorted)를 기반으로 어떤 swap을 해야 표준 선지가 되는지 결정
                            // sorted[0]=첫째, sorted[1]=둘째, sorted[2]=셋째 (원문 순서)
                            // 목표: swap 후 새로운 라벨 배치가 표준 선지에 포함되게 만들기
                            // 가장 간단한 전략: 둘째↔셋째를 swap → 정답이 "(첫째)-(셋째)-(둘째)"가 됨
                            const first = sorted[0].l, second = sorted[1].l, third = sorted[2].l;
                            
                            // second와 third의 레이블을 교환
                            const swapMap: Record<string, string> = {};
                            swapMap[second] = third;  // 둘째 레이블 → 셋째 레이블로
                            swapMap[third] = second;  // 셋째 레이블 → 둘째 레이블로
                            swapMap[first] = first;   // 첫째는 유지
                            
                            // 교환 후 정답: "(first) - (third) - (second)"
                            const swappedSeq = `(${first}) - (${third}) - (${second})`;
                            const swappedIdx = ORDER_CHOICES_STANDARD.indexOf(swappedSeq);
                            
                            if (swappedIdx >= 0) {
                                // question 텍스트에서 실제 레이블 교환
                                // (B)와 (C)를 swap하는 경우: (B)→__TEMP_B__, (C)→(B), __TEMP_B__→(C)
                                let swappedQ = result.question;
                                const lblSecond = `(${second})`;
                                const lblThird = `(${third})`;
                                const tempLabel = `(__SWAP_TEMP__)`;
                                swappedQ = swappedQ.split(lblSecond).join(tempLabel);
                                swappedQ = swappedQ.split(lblThird).join(lblSecond);
                                swappedQ = swappedQ.split(tempLabel).join(lblThird);
                                
                                // choiceExplanations도 해당 레이블 교환
                                let swappedExplanation = result.explanation || '';
                                swappedExplanation = swappedExplanation.split(lblSecond).join(tempLabel);
                                swappedExplanation = swappedExplanation.split(lblThird).join(lblSecond);
                                swappedExplanation = swappedExplanation.split(tempLabel).join(lblThird);
                                
                                const swappedChoiceExplanations = (result.choiceExplanations || []).map((e: string) => {
                                    let s = e;
                                    s = s.split(lblSecond).join(tempLabel);
                                    s = s.split(lblThird).join(lblSecond);
                                    s = s.split(tempLabel).join(lblThird);
                                    return s;
                                });
                                
                                console.log(`[API] Order label swap: ${lblSecond}↔${lblThird}, correctAnswer: ${result.correctAnswer}→${swappedIdx} ("${swappedSeq}")`);
                                result = { 
                                    ...result, 
                                    question: swappedQ, 
                                    correctAnswer: swappedIdx,
                                    explanation: swappedExplanation,
                                    choiceExplanations: swappedChoiceExplanations,
                                };
                            } else {
                                // swap 후에도 표준에 없으면 (이론적으로 불가능하지만 방어)
                                // 더 복잡한 재배치: 3개 모두 회전
                                // A→B→C→A 회전: 원래 sorted 기준 first→second label, second→third label, third→first label
                                console.warn(`[API] Order: simple swap didn't produce standard choice, trying rotation`);
                                const rotMap: Record<string, string> = {};
                                rotMap[first] = second;
                                rotMap[second] = third;
                                rotMap[third] = first;
                                // 회전 후 정답: "(rotMap[first]) - (rotMap[second]) - (rotMap[third])" = "(second) - (third) - (first)"
                                const rotSeq = `(${rotMap[sorted[0].l]}) - (${rotMap[sorted[1].l]}) - (${rotMap[sorted[2].l]})`;
                                const rotIdx = ORDER_CHOICES_STANDARD.indexOf(rotSeq);
                                if (rotIdx >= 0) {
                                    let rotQ = result.question;
                                    // 3-way rotation: A→B→C→A using temps
                                    const lblA = `(${first})`, lblB = `(${second})`, lblC = `(${third})`;
                                    rotQ = rotQ.split(lblA).join('(__ROT_1__)');
                                    rotQ = rotQ.split(lblB).join('(__ROT_2__)');
                                    rotQ = rotQ.split(lblC).join('(__ROT_3__)');
                                    rotQ = rotQ.split('(__ROT_1__)').join(`(${rotMap[first]})`);
                                    rotQ = rotQ.split('(__ROT_2__)').join(`(${rotMap[second]})`);
                                    rotQ = rotQ.split('(__ROT_3__)').join(`(${rotMap[third]})`);
                                    
                                    console.log(`[API] Order label rotation applied, correctAnswer: ${result.correctAnswer}→${rotIdx} ("${rotSeq}")`);
                                    result = { ...result, question: rotQ, correctAnswer: rotIdx };
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[API] Order passage verification failed, using remapped answer:', e);
            }

            return result;
        }

        // ★ insertion 유형 correctAnswer 서버측 검증
        function validateInsertionProblem(prob: any): any {
            if (prob.type !== 'insertion') return prob;
            
            try {
                const q = prob.question || '';
                let correctAnswer = prob.correctAnswer ?? 0;
                
                // 1. correctAnswer 범위 검증 (0~4)
                if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer > 4) {
                    // AI가 1-based로 줬을 가능성 체크
                    if (correctAnswer >= 1 && correctAnswer <= 5) {
                        console.log(`[API] Insertion correctAnswer 1-based→0-based: ${correctAnswer}→${correctAnswer - 1}`);
                        correctAnswer = correctAnswer - 1;
                    } else {
                        console.warn(`[API] Insertion correctAnswer out of range: ${correctAnswer}, defaulting to 0`);
                        correctAnswer = 0;
                    }
                }
                
                // 2. ①~⑤ 마커 개수 검증 — 5개가 아니면 AI 생성 오류
                const markers = ['①', '②', '③', '④', '⑤'];
                const foundMarkers = markers.filter(m => q.includes(m));
                if (foundMarkers.length > 0 && foundMarkers.length < 5) {
                    console.warn(`[API] Insertion: only ${foundMarkers.length}/5 markers found in question`);
                }
                
                // 3. [[TARGET]] 텍스트가 있으면 원문 위치 추적으로 정답 검증
                const targetMatch = q.match(/\[\[TARGET\]\]([\s\S]*?)\[\[\/TARGET\]\]/i);
                if (targetMatch && targetMatch[1]) {
                    const targetText = targetMatch[1].replace(/\s+/g, ' ').trim();
                    const targetSnippet = targetText.substring(0, 60);
                    
                    // 원문에서 target 문장의 위치 찾기
                    const passageFlat = passage.replace(/\s+/g, ' ');
                    let targetPos = -1;
                    for (let len = Math.min(targetSnippet.length, 50); len >= 15; len -= 5) {
                        const p = passageFlat.indexOf(targetSnippet.substring(0, len));
                        if (p >= 0) { targetPos = p; break; }
                    }
                    
                    if (targetPos >= 0) {
                        // ①~⑤ 마커의 위치를 question에서 추출 (TARGET 블록 제외)
                        const qWithoutTarget = q.replace(/\[\[TARGET\]\][\s\S]*?\[\[\/TARGET\]\]/i, '');
                        const markerPositions: { marker: number; pos: number }[] = [];
                        
                        for (let mi = 0; mi < markers.length; mi++) {
                            const mPos = qWithoutTarget.indexOf(markers[mi]);
                            if (mPos >= 0) {
                                // 마커 바로 뒤의 텍스트로 원문 위치 추적
                                const afterMarker = qWithoutTarget.substring(mPos + 1).replace(/\s+/g, ' ').trim().substring(0, 40);
                                let pPos = -1;
                                for (let len = Math.min(afterMarker.length, 35); len >= 10; len -= 5) {
                                    const p = passageFlat.indexOf(afterMarker.substring(0, len));
                                    if (p >= 0) { pPos = p; break; }
                                }
                                if (pPos >= 0) {
                                    markerPositions.push({ marker: mi, pos: pPos });
                                }
                            }
                        }
                        
                        if (markerPositions.length >= 3) {
                            // target 문장이 어느 마커 뒤에 와야 하는지 찾기
                            markerPositions.sort((a, b) => a.pos - b.pos);
                            
                            let expectedAnswer = -1;
                            for (let mi = 0; mi < markerPositions.length; mi++) {
                                if (markerPositions[mi].pos > targetPos) {
                                    // target은 이 마커 앞에 와야 함 → 이 마커 번호가 정답
                                    expectedAnswer = markerPositions[mi].marker;
                                    break;
                                }
                            }
                            // target이 모든 마커보다 뒤에 있으면 마지막 마커가 정답
                            if (expectedAnswer < 0 && markerPositions.length > 0) {
                                expectedAnswer = markerPositions[markerPositions.length - 1].marker;
                            }
                            
                            if (expectedAnswer >= 0 && expectedAnswer !== correctAnswer) {
                                console.log(`[API] Insertion correctAnswer verified by passage position: ${correctAnswer}→${expectedAnswer}`);
                                correctAnswer = expectedAnswer;
                            }
                        }
                    }
                }
                
                return { ...prob, correctAnswer };
            } catch (e) {
                console.warn('[API] Insertion validation failed:', e);
                return prob;
            }
        }

        async function attemptGeneration(type: string, index: number, retryCount = 0): Promise<any> {
            const prompt = getVariantPrompt(type, targetGrade, passage, existingProblem);
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
            let normalized = normalizeOrderProblemServer(p);
            normalized = validateInsertionProblem(normalized);
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
