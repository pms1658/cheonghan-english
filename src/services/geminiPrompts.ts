export const GRADE_LABELS: Record<string, string> = {
  'e4': 'Korean Elementary 4th Grade (초4 — 기초 어휘 200-300단어. be동사, 현재시제 기초. "I like apples" 수준의 매우 짧은 문장. 대화문 위주. 주제: 가족, 동물, 음식, 학교)',
  'e5': 'Korean Elementary 5th Grade (초5 — 어휘 400-500단어. 현재시제, can 조동사, 의문문. "What do you want to do?" 수준. 3-4문장 짧은 지문. 주제: 일상, 여행, 날씨)',
  'e6': 'Korean Elementary 6th Grade (초6 — 어휘 600-800단어. 과거시제 도입, 접속사 and/but. "I went to the park and played soccer" 수준. 5-6문장 지문. 관계사/분사 절대 금지)',
  'm1': 'Korean Middle School 1st Grade (중1 — 실질적으로 미국 초3-4학년 수준의 영어. 어휘 800-1000단어. 현재/과거시제, to부정사 기초(want to). 접속사 when/because. 문장 구조가 단순할 것. 관계대명사/현재완료 사용 금지)',
  'm2': 'Korean Middle School 2nd Grade (중2 — 미국 초4-5학년 수준. 어휘 1200-1500단어. to부정사/동명사 기초, 비교급, 접속사 if/although. 수동태 기초. 관계대명사 who/which 기초만. 긴 복합문 금지)',
  'm3': 'Korean Middle School 3rd Grade (중3 — 미국 초5-6학년 수준. 어휘 1500-2000단어. 관계대명사, 현재완료, 분사 형용사적 용법 기초. 간접의문문. 아직 학술적 지문 아닌 일상/실용 지문. 고등학교 모의고사 수준 절대 금지)',
  '1': 'Korean High School 1st Grade (고1 — 내신은 모의고사 형식 기반. 고1 3월/6월 모의고사 수준으로 출제할 것. 교과서보다 모의고사가 훨씬 어려우므로 모의고사 기준. 어휘 2500-3000, 관계부사, 가정법 기초, 분사구문 기초. 단 수능 수준은 아직 아님 — 지문 길이 짧고, 선택지 단서가 명확하며, 추론 난이도가 수능보다 낮을 것)',
  '2': 'Korean High School 2nd Grade (고2 — 내신은 모의고사 형식 기반. 고2 6월/9월 모의고사 수준으로 출제할 것. 어휘 3000-3500, 가정법, 분사구문, 도치, 강조구문. 수능보다 약간 쉬운 수준. 학술적 주제 가능하나 과도하게 추상적이지 않을 것)',
  '3': 'Korean High School 3rd Grade / CSAT (고3/수능 — 수능 및 고3 모의고사 수준. 어휘 3500-4000단어 이내로 한국 고교 교과서/EBS 연계교재 범위 내. 실제 수능 기출문제 난이도를 절대 초과하지 말 것. GRE/SAT/TOEFL/학술논문 전용 어휘 사용 금지. 선택지도 실제 수능 기출 수준)',
  'adv': 'Advanced Level (상위 — 수능 이상, TOEFL~GRE 사이 수준. 학술적·추상적 주제 허용. 고급 어휘(TOEFL/SAT level) 사용 가능하나 GRE 최상위 수준까지는 가지 않을 것. 복잡한 문장 구조, 논리적 추론 요구. 영재/특목고/해외대비 학생 대상)'
};

export const PROBLEM_DEFINITIONS: Record<string, string> = {
  meaning: 'Explain the figurative or metaphorical meaning of the underlined phrase within the context of the passage. The phrase itself must remain in the original text but be underlined with [[U]]...[[/U]].',
  topic: 'Identify the main topic of the passage.',
  title: '이 글의 제목으로 가장 적절한 것을 고르시오.',
  claim: '이 지문의 주장이나 요지를 가장 잘 나타내는 것을 고르시오.',
  grammar: '어법상 틀린 부분을 고르시오.',
  vocabulary: '문맥상 낱말의 쓰임이 적절하지 않은 것을 고르시오.',
  blank: '빈칸에 들어갈 말로 가장 적절한 것을 고르시오.',
  order: '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.',
  insertion: '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.',
  flow: '글의 흐름상 관계 없는 문장을 고르시오.',
  summary: '다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.'
};

const CONSTRUCTION_RULES: Record<string, string> = {
  claim: `
    - **Logic**: Focus on the main argument.
    - **STRICT**: DO NOT include any markers like ①, ②, ③, ④, ⑤ or brackets in the passage.
    - **Choices**: Choices should be complete sentences in Korean.
  `,
  topic: 'Focus on the central topic. Choices should be noun phrases in English (or Korean if standard for this grade).',
  title: 'Focus on a catchy or descriptive title. Choices should be in English.',
  grammar: `
    - **Marking**: Embed ①, ②, ③, ④, ⑤ markers for the 5 target parts.
    - **Formatting**: **Wrap the numbered parts using [[U]]...[[/U]] markers.** (e.g. [[U]]① is[[/U]]).
    - **Logic**: 
      - Select 5 distinctive grammar points.
      - **CRITICAL**: You MUST **modify** one of the 5 parts to be **grammatically INCORRECT** in the passage itself.
      - This "incorrect" part will be the Correct Answer.
      - Example: Change "is" to "are" if the subject is singular, then underline it.
  `,
  vocabulary: `
    - **Marking**: Embed ①, ②, ③, ④, ⑤ markers for 5 content words.
    - **Formatting**: Wrap each marked word in [[U]]...[[/U]]. (e.g. [[U]]① word[[/U]])
    - **Logic**: You MUST change ONE of the 5 words into its **antonym** (or a word that makes the context wrong).
    - This modified word is the Correct Answer.
  `,
  blank: 'Insert a blank `__________` at a critical point (conclusion or key logic).',
  order: `
    - **Structure**: Break the passage into a [Box] and (A), (B), (C) sections.
    - **Formatting**:
      - Wrap the starting box content in \`[[BOX]]...[[/BOX]]\`.
      - Label sections as (A) ..., (B) ..., (C) ... using a single newline between them.
    - **Logic**: Ensure there is a clear logical flow.
  `,
  insertion: `
    - **Structure**: Separate the Target Sentence from the Passage.
    - **Logic**: 
      - You may select an existing sentence from the passage OR generate a naturally fitting NEW sentence to be the Target Sentence.
      - If using an existing sentence, remove it from the passage. Place the sentence in the \`[[TARGET]]...\` block.
      - Place markers ( ① ) ... ( ⑤ ) at sentence boundaries in the passage where the sentence could potentially fit.
      - **CRITICAL**: Ensure there is only ONE logical place it can be inserted. Use clear logical anchors (e.g., demonstratives 'This/That', pronouns 'They/It', logical connectives 'However/Therefore', or specific-to-general transitions).
  `,
  flow: `
    - **Marking**: Embed ①, ②, ③, ④, ⑤ markers at the start of sentences within the passage.
    - **Logic**: Generate a NEW "Unrelated Sentence" and **INSERT** it at one of the marked positions.
    - **FORMATTING**: The unrelated sentence must be treated as part of the passage text, NOT wrapped in any \`[[BOX]]\` or \`[[TARGET]]\` tags.
    - The unrelated sentence should share keywords but diverge from the main logic.
    - This inserted sentence is the Correct Answer.
  `,
  meaning: `
    - **Logic**: Select ONE figurative or metaphorical phrase in the passage.
    - **Marking**: Wrap ONLY that phrase in [[U]]...[[/U]]. (e.g. [[U]]the tip of the iceberg[[/U]])
    - **STRICT**: DO NOT include any markers like ①, ②, ③, ④, ⑤ in the passage.
    - **Choices**: Provide 5 distinct interpretations in English.
  `,
  summary: `
    - **Structure**: Generate a NEW one-sentence or short paragraph summary of the passage with two blanks (A) and (B).
    - **Formatting**: Wrap the ENTIRE summary paragraph in \`[[BOX]]...[[/BOX]]\`.
    - **Choices**: Provide word pairs for (A) and (B).
  `
};

export const getVariantPrompt = (type: string, grade: string, passage: string) => {
  const specificRule = CONSTRUCTION_RULES[type] || 'Standard multiple choice format.';
  const definition = PROBLEM_DEFINITIONS[type] || 'Solve the problem.';

  return `
Create a CSAT(수능)-style English multiple choice problem.
Model: ${type.toUpperCase()}
Level: ${GRADE_LABELS[grade]}

### INSTRUCTIONS
- **Problem Type**: ${definition}
- **Specific Rules**:
${specificRule.trim()}

### RULES
1. **Passage Preservation**: STRICTLY preserve the original passage text. Do NOT rewrite, omit, or paraphrase existing sentences.
2. For problem types like 'insertion', 'flow' (irrelevant sentence), or 'summary', you are FULLY ALLOWED to generate completely NEW sentences that fit the problem logic.
3. Modify the original text ONLY for the necessary problem logic (e.g., adding ①~⑤ markers or modifying words conditionally for grammar/vocabulary types).
4. **Correct Answer**: Ensure there is only ONE clear correct answer 1-5.
5. **No Markers in Metadata**: **STRICT**: DO NOT use markers like \`**\`, \`[[U]]\`, \`[[BR]]\`, or \`[[BOX]]\` inside the \`[[CHOICES]]\`, \`[[ANSWER]]\`, or \`[[EXPLANATION]]\` sections. Use ONLY plain text there.

### DIFFICULTY CALIBRATION (CRITICAL)
- **한국 수능/모의고사 난이도를 절대 초과하지 마세요.**
- 어휘: 한국 고등학교 교과서 및 수능 기출에서 볼 수 있는 수준. GRE/SAT/TOEFL 고급 어휘, 학술 논문 전용 어휘 절대 금지.
- 선택지: 실제 수능 기출문제의 선택지 난이도를 참고. 너무 추상적이거나 철학적인 선택지 금지.
- 문법: 수능에서 실제로 출제되는 어법 유형 (주어-동사 수일치, 분사, 관계사, to부정사/동명사, 시제, 병렬구조 등)만 다룰 것.
- explanation은 반드시 한국어로 작성.

### OUTPUT FORMAT
Provide your response ONLY as a valid JSON object with the following structure:
{
  "question": "The modified passage text with markers. For insertion, start with [[TARGET]]...[[/TARGET]]",
  "choices": ["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5"],
  "correctAnswer": 0,
  "explanation": "Korean explanation of the answer"
}

**CRITICAL**: "correctAnswer" must be an integer from 0 to 4 (representing choice 1 to 5). Do NOT use markdown code blocks like \`\`\`json, just output the raw JSON string.

### PASSAGE:
"""
${passage}
"""
`;
};


export const getBestTypesPrompt = (grade: string, passage: string) => {
  return `
You are a veteran English Teacher analyzing a text.
Determine the **6 Best Variant Problem Types** for this passage.

Target Grade: ${GRADE_LABELS[grade]}

Available Types:
1. claim
2. topic
3. title
4. grammar
5. vocabulary
6. blank
7. order
8. insertion
9. flow
10. meaning

Passage:
"""
${passage}
"""

Requirements:
- **PRIORITY**: Always include "grammar" and "vocabulary" if the text length allows.
- Analyze the text logic for "blank", "order", "insertion".
- **STRICT**: Only select "insertion" if there is a sentence with a clear logical anchor (this, however, etc.).
- Select strictly 6 types.
- Return ONLY a JSON list of strings.

Example Output:
["grammar", "vocabulary", "blank", "insertion", "topic", "meaning"]
  `;
};



export const getWorkbookPrompt = (grade: string, passage: string) => {
  return `
You are an expert ELT teacher creating a high-quality 3-level workbook for Korean students.

Target Grade: ${GRADE_LABELS[grade]}

### CRITICAL RULES:
- **ALL "explanation" fields MUST be written in Korean (한국어).** No English explanations.
- **IGNORE** any existing test markers (①~⑤) in the passage.
- Keep <i>italic</i> tags intact.

### Input Passage:
"""
${passage}
"""

### Level Requirements:

**Level 1: Vocabulary (어휘) — 5 problems, 4 choices each**
- Select 5 important vocabulary words/phrases FROM the passage.
- Create a sentence using the word in context (can be the original sentence or a modified one) with a ( ) blank where the word should go.
- Provide 4 English word choices: 1 correct + 3 plausible distractors.
- **Difficulty**: Use vocabulary appropriate for the target grade level. Do NOT use GRE/SAT-level obscure words. Stick to words that would appear in Korean English textbooks for this grade.
- **explanation**: Write in Korean. Explain why the correct answer fits the context.

**Level 2: Grammar (어법) — 5 problems, 4 choices each**
- Focus on grammar points commonly tested in Korean 수능/모의고사:
  - Subject-verb agreement (수일치)
  - Active vs Passive voice (능동/수동)
  - Conjunctions vs Relative pronouns (접속사/관계사)
  - Participles — present vs past (현재분사/과거분사)
  - To-infinitive vs Gerund (to부정사/동명사)
  - Verb forms (시제, 가정법)
  - Pro-verbs / Substitute verbs (대동사 do)
  - Reflexive pronouns (재귀대명사)
- Create a sentence from the passage with a ( ) blank at the grammar point.
- Provide **4** English choices (e.g., "grows", "grow", "growing", "grown").
- **explanation**: Write in Korean. Explain the grammar rule that determines the correct answer.

**Level 3: Mastery (구문 완성) — 4 problems total**
- Select 4 important sentences from the passage.
- First 2: **Unscramble (어순배열)**
  - Provide the Korean translation.
  - Provide "segments": split the sentence into word chunks (2-4 words per chunk for long sentences, individual words for short sentences). Include punctuation attached to the last word of each chunk.
  - "answer": the complete original sentence.
  - "explanation": Write in Korean.
- Last 2: **Writing (영작)**
  - Provide the Korean translation.
  - Create "skeleton": Replace 90-95% of words with [blank] markers. ONLY keep structural connectors visible (e.g., who, which, that, to, and, but, or). Everything else — nouns, verbs, adjectives, adverbs, articles, prepositions — must be [blank]. Example: "I am a boy who likes to swim" → "[blank] [blank] [blank] [blank] who [blank] to [blank]"
  - **CRITICAL**: "tokenizedAnswers" array must contain EXACTLY the same number of items as the number of [blank] markers in the skeleton. Each item is the answer for the corresponding blank, in order.
  - "hints": Pick ONLY 4-5 key content words from the tokenizedAnswers. Only important/difficult words (nouns, main verbs, adjectives). Do NOT include function words or ALL answers.
  - "answer": the complete original sentence.
  - "explanation": Write in Korean.

### Output JSON Schema:
{
  "title": "Workbook title in Korean",
  "passage": "Clean passage text (no markers)",
  "levels": [
    {
      "type": "vocab",
      "problems": [{
        "question": "The scientist conducted an experiment to ( ) the hypothesis.",
        "choices": ["verify", "abandon", "ignore", "delay"],
        "answer": "verify",
        "explanation": "'가설을 검증하다'라는 문맥에서 verify(검증하다)가 적절합니다."
      }]
    },
    {
      "type": "grammar",
      "problems": [{
        "question": "The influence of social media ( ) rapidly increasing.",
        "choices": ["is", "are", "being", "been"],
        "answer": "is",
        "explanation": "주어 'The influence'가 단수이므로 단수 동사 'is'가 와야 합니다. 'of social media'는 전치사구로 주어에 영향을 주지 않습니다."
      }]
    },
    {
      "type": "mastery",
      "problems": [
        {
          "style": "unscramble",
          "original": "The boy runs and jumps.",
          "segments": ["and jumps.", "The boy", "runs"],
          "answer": "The boy runs and jumps.",
          "korean": "그 소년은 달리고 점프한다.",
          "explanation": "주어(The boy) + 동사(runs) + 접속사(and) + 동사(jumps) 순서입니다."
        },
        {
          "style": "writing",
          "original": "She has been studying English for three years.",
          "skeleton": "[blank] [blank] [blank] [blank] [blank] [blank] [blank] [blank].",
          "tokenizedAnswers": ["She", "has", "been", "studying", "English", "for", "three", "years"],
          "hints": ["studying", "English", "years"],
          "answer": "She has been studying English for three years.",
          "korean": "그녀는 3년 동안 영어를 공부해왔다.",
          "explanation": "현재완료진행형(have been + -ing) 구문입니다."
        }
      ]
    }
  ]
}

**CRITICAL**: Output raw JSON only. No markdown code blocks. All explanation fields MUST be in Korean.
`;
};

// ═══════════════════════════════════════
// 구조독해 전용 프롬프트 (기존 — 절대 건드리지 않음)
// ═══════════════════════════════════════
export const getStructureAnalysisPrompt = (passage: string) => {
  return `
You are an expert English Syntax Analyst.
Analyze the passage for Korean High School students using the structure symbol system below.

Passage:
"""
${passage}
"""

### Symbol System:

#### 1. 동사 [word](V) — 파란 밑줄
서술어 역할의 정동사(finite verb)만 표시. 조동사 포함.
- Progressive: [is running](V) — be + -ing 전체를 동사로
- Perfect: [has written](V) — have + pp 전체를 동사로
- Passive: [is written](V) OR [is](V) [written](V) — 둘 다 인정 (be만 표시도 OK)
- Modal: [can lead](V), [should have been done](V) — 조동사+동사원형 전체
- ⚠️ **조동사와 본동사 사이에 부사가 있을 때**: 부사를 ( )로 감싸되, 전체는 하나의 [동사](V)로 표시
  - [can (even) communicate](V) ← even은 수식어이면서 동사구에 포함
  - [would (not) be](V) ← not도 수식어
  - [has (always) been considered](V) ← always는 수식어
  - [does (not) seem](V) ← 부정 부사
  - [may (also) help](V) ← also는 수식어
- ⚠️ 동사가 아닌 것 (절대 (V) 표시 금지):
  - 동명사(-ing as noun) → [qn]...[/qn]
  - 현재분사(-ing as modifier) → (...)
  - to부정사(명사적 용법) → [qn]...[/qn]
  - to부정사(형용사/부사적 용법) → (...)
  Examples:
  - "Running is fun" → [qn] Running [/qn] [is](V) fun
  - "She enjoys running" → She [enjoys](V) [qn] running [/qn]
  - "The boy running fast arrived" → The boy (running fast) [arrived](V)
  - "It can lead to becoming X" → It [can lead](V) (to [qn] becoming X [/qn])
  - "She is running" → She [is running](V) ← 진행형은 동사!
  - "He kept running" → He [kept running](V) ← 동사구의 일부!
- Only mark (V) when the word functions as the PREDICATE of a clause.

#### 2. 등위접속사 [△] — 빨간 삼각형
and, but, or, so, for, yet, nor 앞에 표시.
- 주목적: 병렬 구조를 보여주기 위함
- ⚠️ 문두에 오는 등위접속사(But, And, Yet, So, For)는 연결사 [Conn] 성격이 더 강함 → [Conn] 사용
  - [Conn] But [/Conn] that is a mistake. (문두 = 연결사)
  - She studied hard [△] but failed. (문중 = 등위접속사)

#### 3. 준명사구 [qn]...[/qn] — 노란 슬래시
길지만 명사 역할을 하는 구/절. 주어(S), 목적어(O), 보어(C), 전치사의 목적어를 구조적으로 보여주기 위함.
- ⚠️ 반드시 보어/목적어까지 전체 구를 감싸야 함!
  - "becoming unidimensional" → [qn] becoming unidimensional [/qn] (동명사+보어 = 하나의 구)
  - "staying laser-focused" → [qn] staying laser-focused [/qn]
  - "building new networks" → [qn] building new networks [/qn] (동명사+목적어)

Types of quasi-nouns:
  (a) **명사절**: that절, whether/if절
    - I [believe](V) [qn] that she is right [/qn]
    - I [don't know](V) [qn] whether he will come [/qn]
  (b) **의문사절**: what/who/when/where/how/why + S + V (간접의문문)
    - I [know](V) [qn] what you mean [/qn]
    - [qn] How he escaped [/qn] [remains](V) a mystery
  (c) **복합관계대명사절**: whoever, whatever, whichever (명사 역할일 때)
    - [qn] Whatever you decide [/qn] [is](V) fine
    - Give it (to [qn] whoever needs it [/qn])
  (d) **동명사구** (명사 역할):
    - [qn] Running every morning [/qn] [is](V) healthy
    - She [enjoys](V) [qn] building new networks [/qn]
    - (Instead of [qn] staying laser-focused [/qn])  ← 전치사의 목적어
  (e) **to부정사구** (명사적 용법): need/want/decide/hope/plan/expect/learn 등 뒤
    - They [need](V) [qn] to master what's new [/qn]
    - You [want](V) [qn] to do [/qn]
    - I [decided](V) [qn] to leave early [/qn]
  (f) **가주어 it → 진주어**: It [is](V) important [qn] that we act now [/qn]
    - It [is](V) hard [qn] to believe this [/qn]
- 판단 기준: 1~5형식 문장구조를 근거로 S/O/C/전치사목적어 역할 판단
- Nesting allowed: [qn] that [qn] doing X [/qn] involves Y [/qn]

#### 4. 연결사 [Conn]...[/Conn] — 주황 동그라미(알약)
지문 읽을 때 고교에서 필수적인 담화 연결 표현:
However, Therefore, Thus, Consequently, Moreover, Furthermore, In addition, In contrast, For example, For instance, Nevertheless, Meanwhile, On the other hand, As a result, In other words, In fact, Indeed, etc.
- 문두: [Conn] However [/Conn], the result was different.
- ⚠️ 소문자라도 콤마,콤마 사이에 있으면 연결사로 취급:
  - The results, [Conn] however [/Conn], were surprising.
  - It was, [Conn] in fact [/Conn], a mistake.
- 문두 등위접속사(But/And/Yet/So/For)도 연결사로 처리:
  - [Conn] But [/Conn] that is a mistake.

#### 5. 종속절 < ... > — 초록 꺽쇠
주절과 구분되는 종속절(부사절). **접속사가 있는 완전한 절**만 해당.
since, because, although, though, even though, if, unless, when, while, as, before, after, until, once 등.
- <Although it was raining>, we [went](V) outside.
- <When she arrived>, everyone [cheered](V).
- ⚠️ 어차피 부사절 = 수식이므로, 괄호 ( ... )로 표시해도 무관.
- ⚠️ **분사구문은 종속절이 아님!** 분사구문은 접속사+주어가 생략된 **구(phrase)**이므로 반드시 수식어 ( ... )로 표시:
  - (Moving into a new situation), many people [decide](V)... ← 분사구문 = 수식어
  - (Feeling tired), she [went](V) home. ← 분사구문 = 수식어
  - (Written in French), the letter [was](V) hard (to read). ← 과거분사구문 = 수식어
  - ❌ <Moving into a new situation> ← 틀림! 접속사+주어 없으므로 절이 아님

#### 6. 수식어 ( ... ) — 보라색 괄호
문장의 필수성분(S/V/O/C)이 아닌 것들.
⚠️ **중첩 규칙**: 큰 수식어 안에 전치사구가 있으면 반드시 중첩 괄호로 표시! 절대 하나의 큰 괄호로 뭉치지 마세요.
  - ✅ (as a result (of full participation (in the fictional world))) ← 전치사구 중첩!
  - ❌ (as a result of full participation in the fictional world) ← 중첩 없이 뭉침 = 틀림!
  - ✅ (in the world (of the make-believe)) ← of 전명구 중첩
  - ❌ (in the world of the make-believe) ← 틀림!
  - ✅ the amount (of common ground) (about / what [is](V) fictional (in the world (of the make-believe)) /)

  (a) **전명구**: 전치사 + 명사 구조 전체 (내부 전명구/준명사 중첩 필수)
    - (to the microstresses)
    - (from their goal)
    - (Instead of [qn] staying focused [/qn]) ← 전명구 안에 준명사 가능
    - (in the world (of the make-believe)) ← 전명구 안 전명구 = 중첩
    - (about the impact (of technology (on society))) ← 3단 중첩도 가능
  (b) **삽입/동격**: 콤마+콤마, 대시+대시 사이의 절/구. 동격의 that도 포함.
    - the fact (that she left) ← 동격
    - My friend, (who lives (in Seoul)), [is](V) kind. ← 삽입 + 내부 전명구 중첩
    - — (a common mistake) — ← 대시 보충
  (c) **형용사 수식**: 보어 역할이 아닌 형용사. 관계대명사절, 관계부사절 모두 포함.
    - the book (that I read) ← 관계대명사절
    - the place (where I was born) ← 관계부사절
    - (running fast) ← 분사구
  (d) **분사구문**: 접속사+주어가 생략되어 **구**로 축소된 부사적 수식. 절이 아니므로 반드시 ( ).
    - (Moving (into a new situation)), many people [decide](V)...
    - (Feeling tired), she [went](V) home.
    - (Written (in French)), the letter [was](V) hard (to read).
    - (Having finished the work), he [left](V) early.
  (e) **부사/감탄사**: 그 자체로 필수 문장성분이 아닌 것.
    - (Unfortunately), he [failed](V).
    - (Well), let me [think](V).

### "that" Classification (Critical):
| Before "that" | After "that" | Type | Symbol |
|---|---|---|---|
| Verb | Complete sentence | Noun Clause | [qn] ... [/qn] |
| Common Noun | Incomplete sentence | Relative Clause | ( ... ) |
| Abstract Noun | Complete sentence | Appositive | ( ... ) |

### Analysis Requirements (Per Sentence):
1. **original**: Clean English sentence.
2. **analyzed**: Sentence with ALL symbols applied:
   - [qn]...[/qn] for quasi-nouns (will render as / ... /)
   - [△] before coordinators
   - ( ... ) for modifiers
   - < ... > for subordinate clauses
   - [word](V) for verbs
   - [Conn]...[/Conn] for connectives
3. **translation**: Korean translation.
4. **grammar**: 1-3 key grammar points.
5. **vocab**: Difficult words with Korean meanings.

### Output Format (JSON Only):
{
  "overallAnalysis": "Summary...",
  "sentences": [
    {
      "original": "Text",
      "analyzed": "[Conn]However[/Conn], the boy [runs](V) [△] and [jumps](V) [qn] to win the race [/qn] <when the bell rings>.",
      "translation": "...",
      "grammar": ["..."],
      "vocab": [{ "word": "...", "meaning": "..." }]
    }
  ]
}
`;
};

// 구조독해에서 사용하는 alias — 기존 호출 호환성 유지
export const getAnalysisPrompt = getStructureAnalysisPrompt;

// ═══════════════════════════════════════
// 본문분석 (Deep Analysis) 프롬프트 — 전면 개편
// ═══════════════════════════════════════
export const getPremiumAnalysisPrompt = (passage: string, grade: string = '2') => {
  const gradeLabel = GRADE_LABELS[grade] || GRADE_LABELS['2'];
  return `
You are an expert English teacher creating a **comprehensive passage analysis workbook** for Korean students.
This analysis should be as detailed as the best Korean 모의고사/교과서 분석집 (like EBS 올림포스, EXAM4YOU).

Target Level: ${gradeLabel}

### INPUT PASSAGE:
"""
${passage}
"""

### ANALYSIS REQUIREMENTS:

**ALL text in Korean (한국어) unless it's the English passage/words themselves.**

#### 1. Overview
- **title**: 글의 주제를 한국어로 짧게 (예: "소유권의 분리와 결합을 비유하는 '막대 다발'")
- **summaryEn**: 1-sentence English summary of the passage
- **summaryKr**: 1-sentence Korean summary (요약)
- **topic**: 글의 주제 (한국어, 1줄)
- **claim**: 글의 요지/주장 (한국어, 1-2줄)

#### 2. Passage Structure (글의 구조)
Divide the passage into logical sections:
- **intro**: { sentenceIds: [1-based ids], note: "도입부 설명 (한국어)" }
- **body**: array of { sentenceIds: [...], note: "본론 설명" }
- **conclusion**: { sentenceIds: [...], note: "결론 설명" }
- **topicSentenceId**: The 1-based sentence ID of the TOPIC SENTENCE (주제문장). This is the single sentence that most directly expresses the main idea/claim of the passage. Usually found at the beginning or end of a paragraph.

#### 3. Sentence-by-Sentence Analysis
For EACH sentence, provide:
- **id**: 1-based sentence number
- **original**: Clean English sentence
- **analyzed**: Structure-annotated version using the SAME symbol system as Structure Reading.
  **CRITICAL: Follow these rules exactly.**

  **[word](V) — 동사 (파란 밑줄)**
  서술어 역할의 정동사(finite verb)만 표시. 조동사 포함 (예: [may help](V), [is running](V), [has been made](V)).
  ⚠️ 동명사/분사/to부정사는 절대 (V) 금지.
  ⚠️ 쉼표, 아포스트로피, 따옴표 등 구두점은 절대 [word](V) 안에 포함하지 마세요.
    - ✅ AI's confusion [emerges](V)
    - ❌ AI's confusion [, emerges](V) ← 쉼표 포함 금지!
    - ❌ AI ['s confusion emerges](V) ← 아포스트로피 포함 금지!
  ⚠️ **조동사와 본동사 사이에 부사가 있을 때**: 부사를 ( )로 감싸되, 전체는 하나의 [동사](V)로 표시
    - ✅ [can (even) communicate](V) ← even은 수식어이면서 동사구에 포함
    - ✅ [would (not) be](V) ← not도 수식어
    - ✅ [has (always) been considered](V)
    - ✅ [does (not) seem](V)
    - ✅ [may (also) help](V)

  **[△] — 등위접속사 (빨간 삼각형)**
  문중 and/but/or/so/for/yet/nor 앞에 표시. 문두 등위접속사는 [Conn] 사용.

  **[qn]...[/qn] — 준명사구 (노란 슬래시)**
  명사 역할을 하는 구/절 전체를 감싸세요:
    - that 명사절: I [believe](V) [qn]that she is right[/qn]
    - 의문사절: I [know](V) [qn]what you mean[/qn]
    - 동명사구: [qn]Running every morning[/qn] [is](V) healthy
    - to부정사 (명사적): They [need](V) [qn]to master what's new[/qn]

  **[Conn]...[/Conn] — 연결사 (주황 동그라미)**
  However, Therefore, Thus, Moreover, Furthermore, Nevertheless, In addition, In contrast, For example, Yet(문두), But(문두) 등.

  **<...> — 종속절/부사절 (초록 꺽쇠)**
  ⚠️ **반드시 접속사부터 절 끝까지 전체를 감싸야 합니다!** 접속사만 단독으로 감싸면 안 됩니다!
    - ✅ <when the bell rings>  ← 절 전체
    - ❌ <when> the bell rings  ← 접속사만 감싼 것은 틀림!
    - ✅ <because she was tired>  ← 절 전체
    - ❌ <because> she was tired  ← 틀림!
  대상: when, while, because, since, although, though, even though, if, unless, before, after, until, once, as 등 **부사절 접속사가 이끄는 절**만.
  ⚠️ that 명사절은 <...>가 아니라 [qn]...[/qn]입니다!
  ⚠️ 관계대명사절(who/which/that+불완전문장)은 <...>가 아니라 (...)입니다!
  ⚠️ 분사구문은 절이 아니므로 반드시 (...)로 표시!

  **(...) — 수식어 (보라색 괄호)**
  전명구, 관계절, 분사구, 분사구문, 동격, 삽입, 부사/감탄사 등 비필수성분.
  ⚠️ **중첩 규칙 (필수!)**: 큰 수식어 안에 전치사구가 있으면 반드시 중첩 괄호로 표시!
    - ✅ (as a result (of full participation (in the fictional world))) ← 전치사구 중첩!
    - ❌ (as a result of full participation in the fictional world) ← 중첩 없이 뭉침 = 틀림!
    - ✅ (in the world (of the make-believe)) ← of 전명구 중첩
    - ❌ (in the world of the make-believe) ← 틀림!
    - ✅ (about the impact (of technology (on society))) ← 3단 중첩도 OK
    - ✅ (who lives (in Seoul)) ← 관계절 + 내부 전명구 중첩

  ### that 분류표 (Critical):
  | that 앞 | that 뒤 | 종류 | 기호 |
  |---|---|---|---|
  | 동사(believe, know, think...) | 완전한 문장 | 명사절 | [qn]that ...[/qn] |
  | 일반명사(book, boy) | 불완전한 문장 | 관계대명사절 | (that ...) |
  | 추상명사(fact, idea, belief) | 완전한 문장 | 동격 | (that ...) |
- **translation**: Full Korean translation
- **wordByWord**: Key words/phrases with meanings in format "word(뜻), word(뜻), ..." — focus on important content words, not every word
- **grammarNotes**: Array of grammar explanations (한국어). Focus on:
  - 문장 형식 (1~5형식)
  - 주어-동사 수일치
  - 관계사/접속사 구분
  - 분사 (능동/수동)
  - to부정사/동명사 용법
  - 가정법, 도치, 강조 등
- **vocab**: Array of { word, meaning (한국어), pos (품사) }

#### 4. Key Grammar (핵심 문법 사항)
Select 2-4 most important grammar points from the passage:
- **point**: 문법 사항 이름 (한국어)
- **explanation**: 상세 설명 + 규칙 (한국어)
- **example**: 본문에서의 예시 문장
- **related**: 관련 개념 (예: "cf. 관계부사 where와 비교")

#### 5. Vocabulary Summary (어휘 종합)
All important words from the passage:
- **word**: English word
- **meaning**: 한국어 뜻
- **pos**: 품사 (n./v./adj./adv. etc.)
- **synonym**: 유의어 (English, 있으면)
- **antonym**: 반의어 (English, 있으면)

#### 6. Exam Prediction (변형문제 예상)
Which problem types could be generated from this passage?
Array of objects:
- **type**: 문제 유형 (주제/요지/제목, 빈칸 추론, 어법, 어휘, 문장삽입, 순서, 요약, 서술형 등)
- **likelihood**: "높음" | "보통" | "낮음"
- **reason**: 왜 이 유형이 출제 가능한지 (한국어, 1줄)

#### 7. T/F Check (내용 일치/불일치)
Generate 3-4 T/F statements about the passage content:
- **statement**: English statement about the passage
- **answer**: true or false
- **explanation**: 왜 T/F인지 한국어로 간단히

### OUTPUT FORMAT (JSON Only):
{
  "title": "...",
  "summaryEn": "...",
  "summaryKr": "...",
  "topic": "...",
  "claim": "...",
  "structure": {
    "intro": { "sentenceIds": [1], "note": "..." },
    "body": [{ "sentenceIds": [2,3,4], "note": "..." }],
    "conclusion": { "sentenceIds": [5,6], "note": "..." }
  },
  "topicSentenceId": 3,
  "sentences": [{
    "id": 1,
    "original": "...",
    "analyzed": "Lawyers [describe](V) ownership (as a [qn]bundle (of sticks)[/qn]), [△] and they [believe](V) [qn]that each stick (in the bundle) [represents](V) a different right[/qn] <because property law [requires](V) clear distinctions>.",
    "translation": "...",
    "wordByWord": "describe(묘사하다), ownership(소유권), bundle(다발)",
    "grammarNotes": ["주어 + 동사 + 목적어 + as + 명사 구조 (5형식)"],
    "vocab": [{ "word": "describe", "meaning": "묘사하다", "pos": "v." }]
  }],
  "keyGrammar": [{
    "point": "관계대명사 that의 구분",
    "explanation": "...",
    "example": "...",
    "related": "cf. 접속사 that과의 차이"
  }],
  "vocabSummary": [{
    "word": "ownership", "meaning": "소유권", "pos": "n.",
    "synonym": "possession", "antonym": ""
  }],
  "examPrediction": [{
    "type": "주제/요지", "likelihood": "높음",
    "reason": "명확한 주장이 있는 논설문"
  }],
  "tfCheck": [{
    "statement": "Lawyers describe ownership as a single stick.",
    "answer": false,
    "explanation": "본문에서는 'a bundle of sticks'로 비유"
  }]
}

**CRITICAL**: Output raw JSON only. No markdown code blocks. All Korean text must be natural Korean.
`;
};

/**
 * SL (Special Level) — 지문 변형 프롬프트
 * AI가 원문의 핵심 내용을 유지하면서 어휘/문장구조를 해당 학년 수준으로 재작성
 */
export const getPassageRewritePrompt = (passage: string, grade: string = '2') => {
  const gradeLabel = GRADE_LABELS[grade] || GRADE_LABELS['2'];
  const gradeKorean: Record<string, string> = {
    'e4': '초4', 'e5': '초5', 'e6': '초6',
    'm1': '중1', 'm2': '중2', 'm3': '중3',
    '1': '고1', '2': '고2', '3': '고3/수능',
    'adv': 'ADV(상위)'
  };
  const gk = gradeKorean[grade] || '고2';
  return `
You are an expert English teacher preparing exam materials for Korean students.
Target level: ${gradeLabel}

### TASK
Rewrite the following passage while:
1. **Preserving the CORE MEANING and KEY ARGUMENTS** — the main ideas, logic flow, and conclusions must remain the same
2. **Changing the SURFACE STRUCTURE** — use different vocabulary, sentence patterns, and expressions
3. **Maintaining academic difficulty at ${gk} 수준** (한국 ${gk} 모의고사/수능 수준을 넘지 않을 것)
4. **Keeping similar length** — the rewritten passage should have approximately the same number of sentences
5. **Making it feel like a DIFFERENT passage about the SAME topic** — a student who memorized the original should not be able to answer purely from memory

### DIFFICULTY CALIBRATION
- 어휘는 한국 ${gk} 교과서/모의고사에 나올 법한 수준만 사용
- GRE/SAT/학술논문 수준의 고급 어휘 금지
- 문장 구조도 실제 ${gk} 모의고사 지문 수준으로 유지

### REWRITING GUIDELINES
- Replace key vocabulary with synonyms or rephrase expressions
- Restructure sentence patterns (e.g., active → passive, simple → complex, combine/split sentences)
- Change examples or illustrations while preserving the underlying point
- Maintain the same paragraph structure and logical flow
- Keep proper nouns and technical terms that cannot be changed
- The tone should remain academic/formal

### ORIGINAL PASSAGE:
"""
${passage}
"""

### OUTPUT FORMAT
Provide ONLY a valid JSON object:
{
  "rewrittenPassage": "The full rewritten passage text here",
  "changes": "Brief Korean summary of what was changed (2-3 sentences)"
}

**CRITICAL**: Output raw JSON only. No markdown code blocks.
`;
};

// ═══════════════════════════════════════
// 변형문제 주관식 (Transform Subjective) 프롬프트
// ═══════════════════════════════════════

export const getSubjectiveProblemsPrompt = (passage: string, grade: string, problemTypes?: string[]) => {
  const gradeLabel = GRADE_LABELS[grade] || GRADE_LABELS['2'];
  
  // Build type descriptions based on mode
  const allTypes = {
      "eng_composition": "### TYPE: eng_composition (영작)\n- Select ONE sentence from the passage. Prefer SHORT sentences (under 20 words).\n- Provide the BEGINNING of the sentence in English (the easy part).\n- Provide ONLY the key clause/phrase in Korean for the student to complete.\n- Provide 3-5 key hint words and a grammar condition.\n- Add an \"englishStart\" field with the given English beginning.",
      "sentence_interpretation": "### TYPE: sentence_interpretation (해석/의미 서술)\n- Select ONE figurative or abstract sentence from the passage.\n- The student writes a Korean interpretation explaining what it means.\n- Provide a model answer (2-3 sentences in Korean).",
      "grammar_correction": "### TYPE: grammar_correction (어법 교정)\n- Select 6 grammar-relevant parts, label (a)-(f).\n- Make EXACTLY 3 incorrect, keep 3 correct.\n- Use [[UL:(label)]]word[[/UL]] markers.\n- For each: label, underlinedText, isCorrect, correctForm, explanation.",
      "blank_fill": "### TYPE: blank_fill (빈칸 서술)\n- Select a KEY position in the passage.\n- Remove 1-3 words, replace with __________.\n- Student writes the missing word(s). Provide correct answer.",
      "pronoun_reference": "### TYPE: pronoun_reference (지칭 추론)\n- Find a pronoun (it, they, this, etc.) referring to a specific concept.\n- Student writes in Korean what it refers to.",
      "summary_completion": "### TYPE: summary_completion (요약문 완성)\n- Write 1-2 sentence English summary with 2 blanks (A) and (B).\n- Student fills blanks with appropriate English words.",
      "sentence_transform": "### TYPE: sentence_transform (문장 전환)\n- Select ONE transformable sentence.\n- Condition: Active↔Passive, 분사구문↔절, Direct↔Indirect speech, etc.\n- Provide the model transformed sentence."
  };
  
  let typeInstruction: string;
  let typeBlock: string;
  
  if (problemTypes && problemTypes.length > 0) {
    typeInstruction = 'Generate problems ONLY for these ' + problemTypes.length + ' types: ' + problemTypes.join(', ') + '. Do NOT generate any other types.';
    typeBlock = problemTypes.map(t => allTypes[t as keyof typeof allTypes] || '').filter(Boolean).join('\n\n');
  } else {
    typeInstruction = 'Generate ALL 7 types of problems (one problem per type).';
    typeBlock = Object.values(allTypes).join('\n\n');
  }

  return `You are an expert Korean high school English teacher creating **서술형 (subjective/written-answer) exam problems** for Korean students.

Target Grade: ${gradeLabel}

### INPUT PASSAGE:
"""
${passage}
"""

### TASK
${typeInstruction}

Create the following types of problems from the passage above. Each problem should be challenging but fair for the target grade level.

---

${typeBlock}

---

### OUTPUT FORMAT (JSON Only)
{
  "problems": [
    {
      "type": "eng_composition",
      "instruction": "다음 영어 문장의 이어지는 부분을 우리말 뜻에 맞게 주어진 조건으로 영작하시오.",
      "englishStart": "The beginning of the sentence in English...",
      "koreanMeaning": "학생이 영작해야 할 부분의 한글 뜻",
      "hintWords": ["word1", "word2", "word3"],
      "grammarCondition": "관계대명사 which를 사용하시오",
      "originalSentence": "The full original English sentence",
      "modelAnswer": "The part the student should write"
    },
    {
      "type": "sentence_interpretation",
      "instruction": "다음 문장의 의미를 본문의 맥락을 고려하여 한국어로 서술하시오.",
      "targetSentence": "The sentence to interpret",
      "modelAnswer": "한국어 모범 해석 (2-3문장)"
    },
    {
      "type": "grammar_correction",
      "instruction": "다음 글의 밑줄 친 (a)~(f) 중 어법상 틀린 것 세 개를 찾아 기호를 쓰고, 바르게 고치시오.",
      "passageWithUnderlines": "Passage with [[UL:(a)]]word[[/UL]] markers...",
      "grammarItems": [
        { "label": "(a)", "underlinedText": "word", "isCorrect": false, "correctForm": "correct", "explanation": "설명" }
      ]
    },
    {
      "type": "blank_fill",
      "instruction": "다음 글의 빈칸에 들어갈 적절한 단어를 쓰시오.",
      "passageWithBlank": "Passage with __________ blank",
      "blankAnswer": "correct word(s)",
      "blankContext": "Contextual hint"
    },
    {
      "type": "pronoun_reference",
      "instruction": "다음 글의 밑줄 친 부분이 가리키는 대상을 한국어로 쓰시오.",
      "pronounSentence": "Sentence with the pronoun",
      "underlinedPronoun": "it",
      "referenceAnswer": "한국어 답"
    },
    {
      "type": "summary_completion",
      "instruction": "다음 글의 내용을 요약할 때, 빈칸 (A)와 (B)에 들어갈 적절한 단어를 쓰시오.",
      "summaryText": "Summary with (A) and (B) blanks...",
      "blankAnswers": [
        { "label": "A", "answer": "word_A" },
        { "label": "B", "answer": "word_B" }
      ]
    },
    {
      "type": "sentence_transform",
      "instruction": "다음 문장을 주어진 조건에 맞게 바꾸어 쓰시오.",
      "originalSentence": "Original sentence",
      "transformCondition": "능동태를 수동태로 바꾸시오",
      "transformedAnswer": "Model transformed sentence"
    }
  ],
  "modifiedPassage": ""
}

IMPORTANT: Generate ONLY for the requested types. Return ONLY valid JSON.`;
};

/**
 * SL (Special Level) — 지문 변형 프롬프트
 * AI가 원문의 핵심 내용을 유지하면서 어휘/문장구조를 해당 학년 수준으로 재작성
 */

/**
 * Subjective Problem Grading Prompt
 * AI가 학생의 서술형 답안을 채점하고 피드백을 제공
 */
export const getSubjectiveGradingPrompt = (problems: any[], answers: any[], passage: string) => {
  const problemsWithAnswers = problems.map((p, i) => ({
    id: p.id,
    type: p.type,
    instruction: p.instruction,
    modelAnswer: p.modelAnswer || p.transformedAnswer || p.blankAnswer || '',
    points: p.points || 0,
    studentAnswer: answers[i]?.answer || '',
    // Include type-specific fields
    ...(p.englishStart ? { englishStart: p.englishStart } : {}),
    ...(p.koreanMeaning ? { koreanMeaning: p.koreanMeaning } : {}),
    ...(p.grammarCondition ? { grammarCondition: p.grammarCondition } : {}),
    ...(p.hintWords ? { hintWords: p.hintWords } : {}),
    ...(p.originalSentence ? { originalSentence: p.originalSentence } : {}),
    ...(p.targetSentence ? { targetSentence: p.targetSentence } : {}),
    ...(p.passageWithUnderlines ? { passageWithUnderlines: p.passageWithUnderlines } : {}),
    ...(p.grammarItems ? { grammarItems: p.grammarItems } : {}),
    ...(p.passageWithBlank ? { passageWithBlank: p.passageWithBlank } : {}),
    ...(p.pronounSentence ? { pronounSentence: p.pronounSentence } : {}),
    ...(p.underlinedPronoun ? { underlinedPronoun: p.underlinedPronoun } : {}),
    ...(p.referenceAnswer ? { referenceAnswer: p.referenceAnswer } : {}),
    ...(p.summaryText ? { summaryText: p.summaryText } : {}),
    ...(p.blankAnswers ? { blankAnswers: p.blankAnswers } : {}),
    ...(p.transformCondition ? { transformCondition: p.transformCondition } : {}),
  }));

  return `You are an expert Korean high school English teacher grading subjective (서술형) exam answers.

### ORIGINAL PASSAGE:
"""
${passage}
"""

### PROBLEMS AND STUDENT ANSWERS:
${JSON.stringify(problemsWithAnswers, null, 2)}

### GRADING INSTRUCTIONS:
For each problem, grade the student's answer on a scale of 0-100.

**Scoring Guidelines:**
- **eng_composition**: Check grammar accuracy (40%), correct vocabulary usage (30%), and adherence to grammar condition (30%). Accept synonyms and minor variations. Deduct partially for small errors.
- **sentence_interpretation**: Check if the student captured the core meaning (50%), context understanding (30%), and expression quality (20%).
- **grammar_correction**: Check if all incorrect items were identified (50%) and corrections are accurate (50%). Partial credit for partial identification.
- **blank_fill**: Accept exact matches and reasonable synonyms. Score 100 for correct, 0 for wrong. Accept minor spelling variations.
- **pronoun_reference**: Check if the student correctly identified the referent. Score 100 for correct, 50 for partially correct, 0 for wrong.
- **summary_completion**: Check each blank separately. Accept synonyms and minor variations.
- **sentence_transform**: Check if the transformation follows the condition (50%) and is grammatically correct (50%).

**Important:**
- Be generous with minor spelling errors that don't affect meaning
- Accept valid synonyms and alternative phrasings
- For Korean answers, accept reasonable variations in expression
- Empty or blank answers should receive 0

### OUTPUT FORMAT (JSON Only):
{
  "results": [
    {
      "problemId": "problem_id_here",
      "score": 85,
      "feedback": "한국어로 피드백 (잘한 점, 개선할 점, 정답과의 비교)",
      "modelAnswer": "모범 답안",
      "detailedScores": {
        "accuracy": 90,
        "grammar": 80,
        "completeness": 85
      }
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanation.`;
};
