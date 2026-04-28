import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { apiGuard, createErrorResponse, validateRequest } from '@/lib/apiMiddleware';
import { gradeRequestSchema } from '@/schemas/api';

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
        - **⚠️ ZERO DEDUCTION: ALL styles above are EQUALLY valid. You MUST NOT deduct ANY points for choosing one style over another. This is the #1 most common grading error — do NOT make it.**
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
    - **⚠️ PARTICIPIAL CONSTRUCTIONS are NOT subordinate clauses.** They are phrases (conjunction + subject omitted), so they MUST use ( ) modifier brackets:
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

- **correctForms** (string[]): Main clause form only.
  - Values: "1형식", "2형식", "3형식", "4형식", "5형식", "3형식 수동태", "4형식 수동태", "5형식 수동태"

- **directTranslation** (string): Chunk-by-chunk Korean translation.
  - **KOREAN ONLY**. Zero English words. Translate everything.

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

    // Handle single assignment legacy format if necessary (fallback)
    if (!assignments && body.standard_answer) {
      return NextResponse.json({ error: 'Batch format required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    // Use user-requested model (found in extract-words route)
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log(`[Grading] Starting batch grading for ${assignments.length} items using gemini-3-flash-preview`);

    const gradingPromises = assignments.map(async (task: any, index: number) => {
      const prompt = GRADE_PROMPT
        .replace("{sentence}", task.sentence)
        .replace("{analysisString}", task.analysisString)
        .replace("{translation}", task.translation)
        .replace("{selectedForms}", task.selectedForms ? JSON.stringify(task.selectedForms) : "[]");

      try {
        console.log(`[Grading] Item ${index} - Generating content...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(`[Grading] Item ${index} - Response received (Length: ${text.length})`);

        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
          const parsed = JSON.parse(jsonStr);

          // SAFEGUARD: Ensure all fields are primitives or arrays of primitives
          const safeScore = typeof parsed.score === 'number' ? parsed.score : 0;
          const safeFeedback = typeof parsed.feedback === 'object' ? JSON.stringify(parsed.feedback) : (parsed.feedback || '');
          const safeStructure = typeof parsed.correctStructure === 'object' ? JSON.stringify(parsed.correctStructure) : (parsed.correctStructure || '');
          const safeTranslation = typeof parsed.directTranslation === 'object' ? JSON.stringify(parsed.directTranslation) : (parsed.directTranslation || '');

          // Sanitize Arrays
          const safeForms = Array.isArray(parsed.correctForms)
            ? parsed.correctForms.map((f: any) => typeof f === 'object' ? JSON.stringify(f) : String(f))
            : [];

          const safeVocab = Array.isArray(parsed.vocabFeedback)
            ? parsed.vocabFeedback.map((v: any) => typeof v === 'object' ? (v.word || v.term || JSON.stringify(v)) : String(v))
            : [];

          return {
            score: safeScore,
            feedback: safeFeedback,
            correctStructure: safeStructure,
            correctForms: safeForms,
            directTranslation: safeTranslation,
            vocabFeedback: safeVocab,
            details: parsed
          };
        } catch (parseError) {
          console.error(`[Grading] Item ${index} - JSON Parse Error`, text);
          throw { message: 'JSON Parse Error', rawText: text };
        }
      } catch (err: any) {
        console.error(`[Grading] Item ${index} - Failed`, err);
        return {
          score: 0,
          feedback: `Grading failed: ${err.message || 'Unknown error'}. \nRaw text: ${err.rawText || 'N/A'} \nModel: gemini-1.5-flash`
        };
      }
    });

    const results = await Promise.all(gradingPromises);
    console.log(`[Grading] Batch completed. Results: ${results.length}`);

    return NextResponse.json({ results });

  } catch (error) {
    return createErrorResponse(error, 'Failed to grade assignments');
  }
}
