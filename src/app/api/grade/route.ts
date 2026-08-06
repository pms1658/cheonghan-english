import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { gradeRequestSchema } from '@/schemas/api';
import { extractJSON, withRetry } from '@/lib/aiUtils';

// Serverless: Hobby=10s, Pro=60s
// gemini-3.5-flash가 ~15-20초 소요 → 스트리밍 방식으로 타임아웃 우회
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const GRADE_PROMPT = `
You are an expert English Syntax Analyst.
Your goal is to grade the student's structural analysis of the provided sentence.

Original Sentence: "{sentence}"
Student's Analysis: "{analysisString}"
Student's Translation: "{translation}"
Student's Selected Sentence Form(s): {selectedForms}

---

### Grammar & Symbol Rules

1.  **VERBS (Underline) [word](V)**
    - Mark ALL main verbs and auxiliary verbs.
    - **Passive Voice**: Marking only "be" OR the full "be + p.p." are BOTH correct.
    - **Auxiliary + Adverb + Main Verb** (e.g., "will always love", "can really do", "has never been"):
        - Grouped: [will always love](V) — **CORRECT**
        - Grouped with inner modifier: [will (always) love](V) — **CORRECT**
        - Split: [will](V) (always) [love](V) — **CORRECT**
        - Split: [can](V) (really) [do](V) — **CORRECT**
        - Split without adverb bracket: [can](V) really [do](V) — **CORRECT**
        - **IMPORTANT — ZERO DEDUCTION: ALL styles above are EQUALLY valid. You MUST NOT deduct ANY points for choosing one style over another. This is the #1 most common grading error — do NOT make it.**
    - **Phrasal Verbs** (e.g., "look at"):
        - Grouped: [look at](V) — **CORRECT**
        - Split: [look](V) (at) — **CORRECT**
    - **All styles above are equally valid. Never penalize for style differences.**

2.  **QUASI-NOUNS (Slash) / ... /**
    - Non-simple nouns acting as Subject, Object, or Complement:
        - To-infinitive phrases (noun usage ONLY)
        - Gerund phrases (noun usage)
        - Noun Clauses: that-clause, what-clause, if/whether-clause, interrogative clause, compound relative clause
    - Including or excluding the conjunction from the slash boundary are BOTH fine.
    - **CRITICAL**: Do NOT slash to-infinitives used as adjectives/adverbs → use ( ) instead.

3.  **COORDINATORS (Triangle) [△] word**
    - And, But, Or, So, For, Yet, Nor.
    - Exception: Sentence-initial "But/And/Yet" → treat as CONNECTIVE [O] instead.

4.  **CONNECTIVES (Circle) [O] word / [phrase](O)**
    - Sentence-starting discourse transitions: However, Therefore, Thus, For example, Indeed, In addition, etc.

5.  **SUBORDINATORS (Angle Brackets) < ... >**
    - Adverbial Clauses with an explicit subordinating conjunction: because, since, when, if, although, as, etc.
    - **DUAL ACCEPTANCE**: Student may use < > OR ( ) for subordinate clauses. Both are correct since subordinate clauses are not part of the sentence backbone.
    - **CRITICAL: PARTICIPIAL CONSTRUCTIONS are NOT subordinate clauses.** They are phrases (conjunction + subject omitted), so they MUST use ( ) modifier brackets:
      - (Moving into a new situation), many people decide... — CORRECT
      - (Having finished the work), he left early. — CORRECT
      - <Moving into a new situation> — WRONG (no conjunction = not a clause)

6.  **MODIFIERS (Parentheses) ( ... )**
    - ANY non-backbone element:
        - Adjective/Adverb phrases, Prepositional phrases
        - Relative clauses (who/which/that + incomplete sentence)
        - Relative adverb clauses (where/when/why)
        - Participial phrases (-ing/-ed modifying a noun) — these are adjective role, NOT verbs
        - **Participial constructions** (분사구문: -ing/-ed at sentence start/end, reduced from subordinate clause) — these are PHRASES, not clauses. Always ( ).
        - Comma-separated appositives
        - Supplementary content after dash/colon/semicolon
    - **Appositive "that"**: Abstract noun + that + COMPLETE sentence → modifier ( ), NOT noun clause.
    - **Determiners** (the, a, an): Do NOT wrap in parentheses.
    - **Literal parentheses** in original text: Double (( )) is correct.

### "that" Classification Rule (Critical for correctStructure)
| Before "that" | After "that" | Type | Symbol |
|---|---|---|---|
| Verb | Complete sentence | Conjunction that (Noun Clause) | / ... / |
| Common Noun | Incomplete sentence | Relative Pronoun that (Adj. Clause) | ( ... ) |
| Abstract Noun | Complete sentence | Appositive that | ( ... ) |

### Complement Position — Dual Acceptance
- When a prepositional phrase or to-infinitive serves as complement in a 2nd-form sentence:
  - / ... / (quasi-noun treatment) — **CORRECT**
  - ( ... ) (modifier treatment) — **CORRECT**

---

### Grading Rules

**Philosophy: The goal is to see the BACKBONE of a sentence. Grade backbone markers strictly, but be lenient on modifier boundaries.**

1.  **Structure Score (40 pts)**: Focus on BACKBONE accuracy.
    - **STRICT grading** for: Verbs [](V), Quasi-nouns / /, Coordinators [△], Connectives [O]
    - **LENIENT grading** for: Modifiers ( ), Subordinators < >
      - If a modifier element is NOT inside any bracket but should be → mild deduction only (1-2 pts max per instance)
      - If a student used ( ) instead of < > for a subordinate clause → **NO deduction**
      - If a student didn't bracket some modifiers but the overall backbone (S, V, O, C) is clearly visible → **minimal deduction**
    - Accept all style variations listed in the rules above.

2.  **Sentence Form Score (10 pts)**: Compare student's selectedForms against correctForms.
    - Use exact string match. Forms: "1형식", "2형식", "3형식", "4형식", "5형식", "3형식 수동태", "4형식 수동태", "5형식 수동태"
    - **CRITICAL — MAIN CLAUSE ONLY**: correctForms must contain the sentence form(s) of the **MAIN CLAUSE(s) (주절) ONLY**. Do NOT include forms for subordinate clauses (종속절), relative clauses (관계대명사절/관계부사절), adverbial clauses (부사절), or noun clauses (명사절). Only independent clauses and coordinate clauses joined by coordinators (and/but/or/so) count.
    - Example: "When he arrived, she gave him the book" → correctForms: ["4형식"] (main clause only; "When he arrived" is an adverbial clause — IGNORE its form)
    - Example: "He studies hard and she reads books" → correctForms: ["1형식", "3형식"] (two coordinate main clauses)
    - Do NOT match the number of items to the student's selectedForms count. Determine correctForms independently based on how many main/coordinate clauses exist.

3.  **Translation Score (50 pts)**: Accuracy of Korean meaning.

### Feedback Guidelines
- **Language**: **MUST BE 100% KOREAN**. No English words in the 'feedback' field.
- **Tone**: Friendly, encouraging. Never mention "Rule #1" etc.
- **Focus**: Praise backbone accuracy. Gently suggest modifier improvements if relevant.

### Output Fields
- **correctStructure** (string): The IDEAL structure using these rules:
  - Mark Quasi-Nouns with **[qn] ... [/qn]** (renders as / ... / on frontend). Nesting allowed.
  - Mark Subordinate Clauses with **< ... >**.
  - Mark Modifiers with **( ... )**.
  - Mark Verbs with **[word](V)**.
  - Mark Coordinators with **[△]**.
  - Mark Connectives with **[word](O)** or **[O] word**.
  - Apply the "that" classification rule strictly.
  - **CONTAINMENT**: Marks must not leak out of their parent wrapper.

- **correctForms** (string[]): One form per MAIN CLAUSE only (주절). Subordinate clauses (부사절, 관대절, 명사절, 종속절) are excluded. Count only independent/coordinate main clauses.
  - Values: "1형식", "2형식", "3형식", "4형식", "5형식", "3형식 수동태", "4형식 수동태", "5형식 수동태"

- **directTranslation** (string): Chunk-by-chunk Korean translation following the original English word order.
  - **KOREAN ONLY**. Zero English words. Translate everything into Korean.
  - **IMPORTANT — NO MARKUP**: Do NOT include any symbols like [qn], [/qn], [V], [△], [O], <, >, /, ( ), etc. in the translation. Output PURE Korean text only. Use / (slash) ONLY as a chunk separator between translated phrases.

- **vocabFeedback** (string[]): Key vocabulary with Korean meanings.

### RESPONSE FORMAT (JSON ONLY)
Return a valid JSON object. No markdown code blocks.
{
  "score": number,
  "feedback": "string (Korean only)",
  "correctStructure": "string",
  "correctForms": ["string"],
  "directTranslation": "string (Korean only)",
  "vocabFeedback": ["string"]
}

`;

export async function POST(req: Request) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    validateRequest(gradeRequestSchema, body, 'grade');
    const { assignments } = body;

    if (!assignments && body.standard_answer) {
      return NextResponse.json({ error: 'Batch format required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log(`[Grading] Starting grading for ${assignments.length} items using gemini-3.5-flash`);

    // ═══ 스트리밍 응답: Vercel Hobby 10초 타임아웃 우회 ═══
    // ReadableStream으로 즉시 응답 시작 → Vercel이 연결 유지
    // 클라이언트에 NDJSON(newline-delimited JSON) 형식으로 전송
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const results: any[] = [];

          for (let index = 0; index < assignments.length; index++) {
            const task = assignments[index];
            const prompt = GRADE_PROMPT
              .replace("{sentence}", task.sentence)
              .replace("{analysisString}", task.analysisString)
              .replace("{translation}", task.translation)
              .replace("{selectedForms}", task.selectedForms ? JSON.stringify(task.selectedForms) : "[]");

            // 진행 상태를 즉시 스트리밍 (Vercel 연결 유지용)
            controller.enqueue(encoder.encode(`{"_progress":${index + 1},"_total":${assignments.length}}\n`));

            try {
              console.log(`[Grading] Item ${index} - Generating content...`);

              const text = await withRetry(async () => {
                const streamResult = await model.generateContentStream(prompt);
                let fullText = '';
                for await (const chunk of streamResult.stream) {
                  fullText += chunk.text();
                  // 스트리밍 중 keep-alive 신호 전송
                  controller.enqueue(encoder.encode(' '));
                }
                if (!fullText || fullText.trim().length === 0) throw new Error('Empty response');
                return fullText;
              }, { maxRetries: 1, baseDelay: 500, label: `Grading Item ${index}` });

              console.log(`[Grading] Item ${index} - Response received (Length: ${text.length})`);

              try {
                const parsed = extractJSON(text);
                const rawScore = typeof parsed.score === 'number' ? parsed.score : 0;
                const safeScore = Math.max(0, Math.min(100, rawScore));
                const safeFeedback = typeof parsed.feedback === 'object' ? JSON.stringify(parsed.feedback) : (parsed.feedback || '');
                let safeStructure = typeof parsed.correctStructure === 'object' ? JSON.stringify(parsed.correctStructure) : (parsed.correctStructure || '');
                safeStructure = safeStructure.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}\u{20E3}]|\u26A0\uFE0F?/gu, '').trim();
                const safeTranslation = typeof parsed.directTranslation === 'object' ? JSON.stringify(parsed.directTranslation) : (parsed.directTranslation || '');
                const safeForms = Array.isArray(parsed.correctForms)
                  ? parsed.correctForms.map((f: any) => typeof f === 'object' ? JSON.stringify(f) : String(f))
                  : [];
                const safeVocab = Array.isArray(parsed.vocabFeedback)
                  ? parsed.vocabFeedback.map((v: any) => typeof v === 'object' ? (v.word || v.term || JSON.stringify(v)) : String(v))
                  : [];

                results.push({
                  score: safeScore,
                  feedback: safeFeedback,
                  correctStructure: safeStructure,
                  correctForms: safeForms,
                  directTranslation: safeTranslation,
                  vocabFeedback: safeVocab,
                  details: parsed
                });
              } catch (parseError) {
                console.error(`[Grading] Item ${index} - JSON Parse Error`, text.substring(0, 500));
                results.push({ score: 0, feedback: '채점 응답 파싱 오류. 다시 시도해주세요.', _error: true });
              }
            } catch (err: any) {
              const errMsg = err?.message || err?.rawText?.substring(0, 100) || String(err) || 'Unknown error';
              console.error(`[Grading] Item ${index} - Failed: ${errMsg}`, err);
              results.push({ score: 0, feedback: `채점 중 오류가 발생했습니다. [${errMsg}]`, _error: true });
            }
          }

          console.log(`[Grading] Completed. Results: ${results.length}`);

          // 최종 결과를 RESULT_START 마커로 구분하여 전송
          controller.enqueue(encoder.encode(`\nRESULT_START\n${JSON.stringify({ results })}\n`));
          controller.close();
        } catch (err) {
          console.error('[Grading] Stream error:', err);
          controller.enqueue(encoder.encode(`\nRESULT_START\n${JSON.stringify({ error: 'Grading failed' })}\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error) {
    return createErrorResponse(error, 'Failed to grade assignments');
  }
}
