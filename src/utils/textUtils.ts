export function splitSentences(text: string): string[] {
    if (!text) return [];

    // Delimiter approach to avoid consuming the punctuation during split
    const delimiter = '|||SENTENCE_BOUNDARY|||';

    // Improved Regex:
    // ([.?!]["'"']?) -> Capture terminal punctuation optionally followed by a closing quote
    // \s+ -> One or more whitespace characters (spaces, tabs, newlines)
    // (?=[A-Z"'"']) -> Positive lookahead: must be followed by a capital letter or an opening quote

    // We also handle cases where there might be multiple spaces or newlines.
    const regex = /([.?!]["'"']?)\s+(?=[A-Z"'"'])/g;

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

    // 5. Remove stray Korean question headers the AI sometimes prepends
    cleaned = cleaned.replace(/^\s*다음[^\n]*(?:것은\?|답하시오\.|것을 고르시오\.|고르시오\.)\s*\n?/i, '');
    cleaned = cleaned.replace(/^\s*(?:위|아래|주어진)[^\n]*(?:것은\?|답하시오\.|것을 고르시오\.)\s*\n?/i, '');

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
 * Sanitize AI-generated choice text.
 * - Remove leading numbered markers (①, 1., 1), etc.)
 * - Strip markdown bold/italic
 * - Trim whitespace
 */
export function sanitizeChoiceText(choice: string): string {
    if (!choice) return '';

    let cleaned = choice.trim();

    // Remove leading circled numbers or numbered markers
    cleaned = cleaned.replace(/^[①②③④⑤❶❷❸❹❺]\s*/, '');
    cleaned = cleaned.replace(/^\d+[.)]\s*/, '');

    // Remove markdown bold
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remove markdown italic
    cleaned = cleaned.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1');

    return cleaned.trim();
}

