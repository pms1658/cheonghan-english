import { Mark, MarkType, tokenize } from '@/components/student/AnalysisEditor';

// Helper: Parse AI analysis string back to Marks for visualization
// Supports both old format ([S]...[/S]) and new format ([qn]...[/qn], [△], [word](V))
export const parseAnalysisString = (text: string, analysis: string): Mark[] => {
    if (!analysis) return [];

    const tokens = tokenize(text);
    const marks: Mark[] = [];

    // Helper to find and mark text in the original sentence
    const markText = (phrase: string, type: MarkType) => {
        const targetTokens = tokenize(phrase).filter(t => t.text.trim() !== '');
        if (targetTokens.length === 0) return;

        for (let i = 0; i < tokens.length; i++) {
            if (!tokens[i].text.trim()) continue;

            let match = true;
            let currentTokenIdx = i;
            let targetIdx = 0;
            let endIndex = i;

            while (targetIdx < targetTokens.length) {
                if (currentTokenIdx >= tokens.length) {
                    match = false;
                    break;
                }

                const sourceToken = tokens[currentTokenIdx];
                const cleanSource = sourceToken.text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                if (!cleanSource) {
                    currentTokenIdx++;
                    continue;
                }

                const cleanTarget = targetTokens[targetIdx].text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                if (!cleanTarget) {
                    targetIdx++;
                    continue;
                }

                if (cleanSource !== cleanTarget) {
                    match = false;
                    break;
                }

                endIndex = currentTokenIdx;
                currentTokenIdx++;
                targetIdx++;
            }

            if (match) {
                const exists = marks.some(m => m.type === type && m.start === i && m.end === endIndex);
                if (!exists) {
                    marks.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type,
                        start: i,
                        end: endIndex
                    });
                }
            }
        }
    };

    // --- PARSING PASS ---
    // Handle both old tags ([S], [V], [O], [C], [Conn]) and new tags ([qn], [△], [word](V))
    let stack: { type: string, startIdx: number }[] = [];

    for (let i = 0; i < analysis.length; i++) {
        const char = analysis[i];

        // Check for [qn] and [/qn] tags
        if (analysis.substring(i, i + 4) === '[qn]') {
            stack.push({ type: 'qn', startIdx: i + 4 });
            i += 3;
            continue;
        }
        if (analysis.substring(i, i + 5) === '[/qn]') {
            const matchIdx = stack.map(s => s.type).lastIndexOf('qn');
            if (matchIdx !== -1) {
                const startItem = stack[matchIdx];
                closeMark('qn', startItem.startIdx, i);
                stack.splice(matchIdx, 1);
            }
            i += 4;
            continue;
        }

        // Check for [△] coordinator marker
        if (analysis.substring(i, i + 3) === '[△]') {
            let wordStart = i + 3;
            while (wordStart < analysis.length && analysis[wordStart] === ' ') wordStart++;
            let wordEnd = wordStart;
            while (wordEnd < analysis.length && /\w/.test(analysis[wordEnd])) wordEnd++;
            if (wordEnd > wordStart) {
                const word = analysis.substring(wordStart, wordEnd);
                markText(word, 'connective');
            }
            i = wordEnd - 1;
            continue;
        }

        // Check for [word](V) verb pattern
        if (char === '[') {
            const closeBracket = analysis.indexOf(']', i);
            if (closeBracket !== -1 && analysis.substring(closeBracket, closeBracket + 4) === '](V)') {
                const word = analysis.substring(i + 1, closeBracket);
                markText(word, 'verb');
                i = closeBracket + 3;
                continue;
            }
            if (closeBracket !== -1 && analysis.substring(closeBracket, closeBracket + 4) === '](O)') {
                const word = analysis.substring(i + 1, closeBracket);
                markText(word, 'connective');
                i = closeBracket + 3;
                continue;
            }

            // Old-style tags [S], [V], [/S], etc.
            const endTagIdx = analysis.indexOf(']', i);
            if (endTagIdx !== -1) {
                const tagContent = analysis.substring(i + 1, endTagIdx);
                if (!tagContent.startsWith('/')) {
                    stack.push({ type: tagContent, startIdx: endTagIdx + 1 });
                } else {
                    const type = tagContent.substring(1);
                    const matchIdx = stack.map(s => s.type).lastIndexOf(type);
                    if (matchIdx !== -1) {
                        const startItem = stack[matchIdx];
                        closeMark(startItem.type, startItem.startIdx, i);
                        stack.splice(matchIdx, 1);
                    }
                }
                i = endTagIdx;
            }
        }
        else if (char === '(') {
            stack.push({ type: 'modifier', startIdx: i + 1 });
        }
        else if (char === '<') {
            stack.push({ type: 'clause', startIdx: i + 1 });
        }
        else if (char === ')') {
            closeStackItem('modifier', i);
        }
        else if (char === '>') {
            closeStackItem('clause', i);
        }
    }

    function closeStackItem(targetType: string, endIdx: number) {
        const matchIdx = stack.map(s => s.type).lastIndexOf(targetType);
        if (matchIdx !== -1) {
            const startItem = stack[matchIdx];
            closeMark(startItem.type, startItem.startIdx, endIdx);
            stack.splice(matchIdx, 1);
        }
    }

    function closeMark(tagType: string, startIdx: number, endIdx: number) {
        const content = analysis.substring(startIdx, endIdx);
        const cleanContent = content
            .replace(/\[\/?(?:S|V|O|C|Conn|qn)\]/g, ' ')
            .replace(/\[△\]/g, ' ')
            .replace(/\[[^\]]+\]\(V\)/g, ' ')
            .replace(/\[[^\]]+\]\(O\)/g, ' ')
            .replace(/[()<>]/g, ' ')
            .replace(/\s+/g, ' ').trim();

        if (cleanContent) {
            let markType: MarkType | null = null;
            if (tagType === 'S') markType = 'subject';
            else if (tagType === 'V') markType = 'verb';
            else if (tagType === 'O') markType = 'object';
            else if (tagType === 'C') markType = 'complement';
            else if (tagType === 'Conn') markType = 'connective';
            else if (tagType === 'qn') markType = 'subject'; // Map qn to subject for AnalysisEditor
            else if (tagType === 'modifier') markType = 'modifier';
            else if (tagType === 'clause') markType = 'clause';

            if (markType) {
                markText(cleanContent, markType);
            }
        }
    }

    return marks;
};
