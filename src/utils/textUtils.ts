export function splitSentences(text: string): string[] {
    if (!text) return [];

    const delimiter = '|||SENTENCE_BOUNDARY|||';

    // [.?!] — terminal punctuation
    // ['"'"\u2019\u201d]? — optional closing quote/double-quote (straight or curly)
    // \s* — zero or more whitespace (handles tight or newline-only gaps)
    // (?=[A-Z"'"'\u2018\u201c]) — next char is uppercase or an opening quote
    const regex = /([.?!]['"'"\u2019\u201d]?)\s*(?=[A-Z"'"'\u2018\u201c])/g;

    return text
        .replace(regex, `$1${delimiter}`)
        .split(delimiter)
        .map(s => s.trim())
        .filter(Boolean);
}

/**
 * Clean exam/test markers from passage text before sending to AI for generation.
 * Removes:
 * - Circled numbers: ①②③④⑤⑥⑦⑧⑨⑩ and ❶❷❸❹❺❻❼❽❾❿
 * - Parenthesized labels: (a), (b), (c), (d), (e), (f), (A), (B), etc.
 * - Underline markers: [[UL:(a)]] ... [[/UL]]
 * - Standalone parenthesized numbers: (1), (2), ... (20)
 * - Extra whitespace left behind after removal
 */
export function cleanPassageMarkers(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Remove [[UL:(x)]] and [[/UL]] markers (used in grammar correction problems)
    cleaned = cleaned.replace(/\[\[UL:\([a-f]\)\]\]/gi, '');
    cleaned = cleaned.replace(/\[\[\/UL\]\]/gi, '');

    // Remove circled numbers (Unicode): ① ② ③ ... ⑳ and ❶ ❷ ❸ ... ❿
    cleaned = cleaned.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '');
    cleaned = cleaned.replace(/[❶❷❸❹❺❻❼❽❾❿]/g, '');

    // Remove parenthesized single-letter labels: (a), (b), ..., (f), (A), (B), ..., (F)
    cleaned = cleaned.replace(/\([a-fA-F]\)/g, '');

    // Remove standalone parenthesized numbers: (1), (2), ... (20) — only when standalone
    cleaned = cleaned.replace(/\(\d{1,2}\)/g, '');

    // Collapse multiple spaces into one
    cleaned = cleaned.replace(/  +/g, ' ');

    // Trim each line
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

    // Remove empty lines left behind
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
}

/**
 * Sanitize AI-generated question/passage text before storing in DB.
 * Handles common AI output quirks:
 * - Markdown bold/italic leaking into passage text
 * - Stray ```json or ``` markers
 * - Inconsistent blank formats (normalize to __________)
 * - Excessive newlines / trailing whitespace
 * - Stray "다음 글을 읽고..." question headers AI sometimes prepends
 * - Stray numbered choice text accidentally embedded in passage
 */
export function sanitizeAIQuestionText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Strip markdown code fence artifacts
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '');

    // 2. Convert markdown bold **text** → text (but leave [[BOX]], [[U]] etc. alone)
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // 3. Convert markdown italic *text* → <i>text</i> (single asterisks, not inside words)
    //    Be careful not to match things like "5*3"
    cleaned = cleaned.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');

    // 4. Normalize blank markers: various underscore counts → standard 10 underscores
    cleaned = cleaned.replace(/_{3,}/g, '__________');

    // 5. Remove stray Korean question headers the AI sometimes prepends (anywhere in text)
    const koreanQuestionPattern = /(?:다음|글의|주어진|위|아래|밑줄)[^\n]*?(?:것은\??|곳은\??|문장은\??|답하시오\.?|것을 고르시오\.?|고르시오\.?|적절한 것은\??)\s*\n?/gi;
    cleaned = cleaned.replace(koreanQuestionPattern, '');

    // 6. Remove stray "Question:" or "Passage:" headers AI sometimes adds
    cleaned = cleaned.replace(/^\s*(?:Question|Passage|Text)\s*:\s*\n?/i, '');

    // 7. Normalize \r\n to \n, collapse 3+ newlines to 2
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 8. Trim each line of trailing whitespace
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

    // 9. Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * For summary-type questions: ensure (A) and (B) are followed by blanks,
 * not the actual answer words. AI sometimes leaks the answer directly.
 * 
 * Detects patterns like "(A) cooperation" and replaces with "(A) __________".
 * Only replaces if a word (not a blank) follows (A)/(B).
 */
export function sanitizeSummaryBlanks(questionText: string, choices: string[]): string {
    if (!questionText || !choices || choices.length === 0) return questionText;

    // Extract answer words from choices (summary choices are typically "word — word" or "(A) word - (B) word" pairs)
    const answerWords: string[] = [];
    for (const choice of choices) {
        // Match patterns like "cooperation — competition", "word1 - word2", "(A) word1 — (B) word2"
        const words = choice
            .replace(/\([A-B]\)\s*/g, '')  // Remove (A)/(B) labels from choices
            .split(/\s*[—\-–\/]\s*/)       // Split by dash/slash separators
            .map(w => w.trim())
            .filter(w => w.length > 0);
        answerWords.push(...words);
    }

    if (answerWords.length === 0) return questionText;

    let result = questionText;

    // Pattern: (A) followed by a word (not a blank or newline) — replace the word with blank
    // Same for (B). Handle both uppercase and lowercase.
    result = result.replace(
        /(\([A-B]\))\s+(?!_)([A-Za-z][A-Za-z\s]*?)(?=[\s,.\-—;:!?\n]|$)/g,
        (match, label, word) => {
            const trimmedWord = word.trim();
            // Only replace if the word looks like a potential answer (not a structural word)
            if (trimmedWord.length >= 2 && answerWords.some(aw => 
                aw.toLowerCase() === trimmedWord.toLowerCase() ||
                trimmedWord.toLowerCase().includes(aw.toLowerCase()) ||
                aw.toLowerCase().includes(trimmedWord.toLowerCase())
            )) {
                return `${label} __________`;
            }
            return match;
        }
    );

    return result;
}

/**
 * Sanitize AI-generated choice text.
 * - Strip HTML tags (AI sometimes generates <b>, <i>, <strong> etc. in choices)
 * - Remove leading/embedded numbered markers (①, 1., 1), etc.)
 * - Strip markdown bold/italic
 * - Trim whitespace
 */
export function sanitizeChoiceText(choice: string): string {
    if (!choice) return '';

    let cleaned = choice.trim();

    // Strip HTML tags (e.g. <b>③ reported</b> → ③ reported)
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Remove leading circled numbers or numbered markers
    cleaned = cleaned.replace(/^[①②③④⑤❶❷❸❹❺]\s*/, '');
    cleaned = cleaned.replace(/^\d+[.)]\s*/, '');

    // Remove leading Roman numeral markers: i), ii), iii), iv), v), vi) etc.
    cleaned = cleaned.replace(/^(?:i{1,4}|iv|vi{0,3}|ix|x{0,3}(?:ix|iv|v?i{0,3}))[.)]\s*/i, '');

    // Remove leading (A), (B), (C) or A. B. style labels
    cleaned = cleaned.replace(/^\([A-Za-z]\)\s*/, '');
    cleaned = cleaned.replace(/^[A-Z][.)]\s*/, '');

    // Remove markdown bold
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remove markdown italic
    cleaned = cleaned.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1');

    // Remove any remaining embedded circled numbers (e.g. "③ reported" → "reported")
    cleaned = cleaned.replace(/[①②③④⑤❶❷❸❹❺]\s*/g, '');

    return cleaned.trim();
}

/**
 * Detect if user-pasted text contains an existing problem with choices.
 * Common patterns:
 * - Circled number choices: ① choice1 ② choice2 ... ⑤ choice5
 * - Numbered choices: 1) choice1, 2) choice2, etc.
 * - Korean question stems: "다음 글을 읽고", "고르시오", etc.
 * 
 * Returns extracted info if an existing problem is detected, null otherwise.
 */
export interface ExistingProblemInfo {
    /** The extracted choices from the existing problem (cleaned text) */
    choices: string[];
    /** Question/instruction text that was detected (if any) */
    questionSnippet: string;
    /** Whether a full problem pattern was confidently detected */
    detected: boolean;
}

export function extractExistingProblemInfo(rawText: string): ExistingProblemInfo | null {
    if (!rawText || rawText.length < 50) return null;

    const result: ExistingProblemInfo = {
        choices: [],
        questionSnippet: '',
        detected: false,
    };

    // Pattern 1: Circled number choices ① ... ② ... ③ ... ④ ... ⑤
    const hasCircled = /[①②③④⑤❶❷❸❹❺]/.test(rawText);
    
    if (hasCircled) {
        // Count how many distinct circled numbers appear
        const circledMarkers = rawText.match(/[①②③④⑤❶❷❸❹❺]/g) || [];
        const uniqueMarkers = new Set(circledMarkers);
        
        if (uniqueMarkers.size >= 3) {
            // Extract choices between circled markers
            const choiceRegex = /[①②③④⑤❶❷❸❹❺]\s*([^\n①②③④⑤❶❷❸❹❺]+)/g;
            let match;
            while ((match = choiceRegex.exec(rawText)) !== null) {
                const choiceText = match[1].trim();
                if (choiceText.length > 0) {
                    result.choices.push(choiceText);
                }
            }
        }
    }

    // Pattern 2: Numbered choices (1. or 1) style on separate lines)
    if (result.choices.length < 3) {
        const numberedRegex = /^[1-5][.)]\s+(.+)$/gm;
        const numberedChoices: string[] = [];
        let match;
        while ((match = numberedRegex.exec(rawText)) !== null) {
            numberedChoices.push(match[1].trim());
        }
        if (numberedChoices.length >= 3 && numberedChoices.length <= 5) {
            result.choices = numberedChoices;
        }
    }

    // Detect Korean question stem patterns
    const koreanQPatterns = [
        /다음\s*글[^.]*?고르시오/,
        /가장\s*적절한\s*것/,
        /적절하지\s*않은\s*것/,
        /일치하지\s*않는\s*것/,
        /밑줄\s*친[^.]*?의미/,
        /빈칸에\s*들어갈/,
        /순서로\s*가장/,
        /들어가기에\s*가장/,
        /관계\s*없는\s*문장/,
        /요약하고자/,
    ];

    for (const pattern of koreanQPatterns) {
        const qMatch = rawText.match(pattern);
        if (qMatch) {
            result.questionSnippet = qMatch[0];
            break;
        }
    }

    // English question stem patterns
    if (!result.questionSnippet) {
        const englishQPatterns = [
            /which\s+of\s+the\s+following/i,
            /what\s+is\s+the\s+(?:main|best)\s+(?:topic|title|idea)/i,
            /choose\s+the\s+(?:best|most)\s+appropriate/i,
            /the\s+underlined\s+(?:word|phrase|part)/i,
        ];
        for (const pattern of englishQPatterns) {
            const qMatch = rawText.match(pattern);
            if (qMatch) {
                result.questionSnippet = qMatch[0];
                break;
            }
        }
    }

    // Determine if a full problem is detected
    // Confident detection: choices found AND (question stem found OR many choices)
    result.detected = result.choices.length >= 3 && (
        result.questionSnippet.length > 0 || result.choices.length >= 5
    );

    return result.detected ? result : null;
}
