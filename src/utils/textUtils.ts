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
