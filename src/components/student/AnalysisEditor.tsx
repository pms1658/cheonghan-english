import { useState, useRef, useEffect, useCallback } from 'react';

// NEW MarkType for Deep Analysis
export type MarkType = 'subject' | 'verb' | 'object' | 'complement' | 'modifier' | 'clause' | 'connective';

export interface Mark {
    id: string;
    type: MarkType;
    start: number;
    end: number;
}

interface AnalysisEditorProps {
    text: string;
    initialMarks?: Mark[];
    onChange?: (marks: Mark[]) => void; // Returns full mark objects
    onAnalysisChange?: (analysisString: string) => void; // Optional: Returns string format [S]...[/S]
    readOnly?: boolean;
}

// Tokenizer (Reused)
export const tokenize = (text: string) => {
    const rawTokens = text.trim().split(/\s+/);
    const result: { id: number; text: string; noSpaceLeft?: boolean }[] = [];
    let idCounter = 0;
    rawTokens.forEach((word) => {
        if (!word) return;
        const parts = word.split(/(['’]s|['’]ve|['’]d|['’]ll|['’]re|['’]m)(?=[.,!?;:"]*$)/i);
        const subTokens = parts.filter(p => p !== "");
        subTokens.forEach((sub, idx) => {
            result.push({ id: idCounter++, text: sub, noSpaceLeft: idx > 0 });
        });
    });
    return result;
};

// --- STYLE DEFINITIONS for S/V/O/C ---
const MARK_STYLES = {
    subject: { label: 'S', shortcut: 'S', color: 'border-slate-800', text: 'text-slate-900', bg: 'bg-slate-100', isRange: true },
    verb: { label: 'V', shortcut: 'V', color: 'border-red-500', text: 'text-red-600', bg: 'bg-red-50', isRange: true },
    object: { label: 'O', shortcut: 'O', color: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', isRange: true },
    complement: { label: 'C', shortcut: 'C', color: 'border-green-500', text: 'text-green-600', bg: 'bg-green-50', isRange: true },
    modifier: { label: '( )', shortcut: '( )', color: 'text-slate-400', text: 'text-slate-500', bg: 'bg-transparent', isRange: true }, // ( )
    clause: { label: '< >', shortcut: '< >', color: 'text-indigo-400', text: 'text-indigo-500', bg: 'bg-transparent', isRange: true }, // < >
    connective: { label: 'Conn', shortcut: 'Conn', color: 'border-orange-400', text: 'text-orange-500', bg: 'bg-orange-50', isRange: true },
};

export default function AnalysisEditor({ text, initialMarks = [], onChange, onAnalysisChange, readOnly = false }: AnalysisEditorProps) {
    const [tokens, setTokens] = useState<{ id: number; text: string; noSpaceLeft?: boolean }[]>([]);
    const [marks, setMarks] = useState<Mark[]>(initialMarks);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // History for Undo
    const [history, setHistory] = useState<Mark[][]>([]);

    useEffect(() => {
        setTokens(tokenize(text));
    }, [text]);

    useEffect(() => {
        if (!readOnly && initialMarks) {
            setMarks(initialMarks);
        }
    }, [initialMarks, readOnly]);

    const updateMarks = (newMarks: Mark[]) => {
        setHistory(prev => [...prev.slice(-10), marks]);
        setMarks(newMarks);
        onChange?.(newMarks);
        // TODO: Generate analysis string if needed
    };

    const undo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setMarks(previous);
        onChange?.(previous);
    };

    const applyMark = (type: MarkType) => {
        if (selectedIndices.size === 0) return;
        const indices = Array.from(selectedIndices).sort((a, b) => a - b);
        const start = indices[0];
        const end = indices[indices.length - 1];

        // Remove existing marks that are exactly same? or overlaps?
        // Let's allow overlap for testing (e.g. S inside Clause)

        const newMark: Mark = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            start, end
        };

        updateMarks([...marks, newMark]);
        setSelectedIndices(new Set());
    };

    const removeMark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateMarks(marks.filter(m => m.id !== id));
    };

    const toggleSelection = (idx: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    // Helper: Get marks for a token
    const getMarksForToken = (idx: number) => marks.filter(m => m.start <= idx && m.end >= idx);

    return (
        <div className="flex flex-col relative select-none">
            {/* Toolbar */}
            {!readOnly && (
                <div className="sticky top-0 w-full bg-white/95 backdrop-blur border-b border-slate-200 px-2 py-2 flex gap-2 overflow-x-auto z-50 rounded-t-xl">
                    {(Object.keys(MARK_STYLES) as MarkType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => applyMark(type)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${MARK_STYLES[type].bg} ${MARK_STYLES[type].color.split(' ')[0]} transition-all hover:scale-105 active:scale-95 whitespace-nowrap`}
                        >
                            {MARK_STYLES[type].label} ({MARK_STYLES[type].shortcut})
                        </button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={undo} disabled={history.length === 0} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded">
                        Undo
                    </button>
                </div>
            )}

            {/* Editor Area */}
            <div className="p-4 lg:p-8 flex flex-wrap gap-y-6 gap-x-1.5 leading-loose">
                {tokens.map((token, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const tokenMarks = getMarksForToken(idx);

                    // Sorting: Modifiers/Clauses (Ranges) first, then S/V/O/C (Underlines)
                    // Actually, we render S/V/O/C as underlines, and Modifiers as brackets.

                    const underlines = tokenMarks.filter(m => ['subject', 'verb', 'object', 'complement', 'connective'].includes(m.type));
                    const brackets = tokenMarks.filter(m => ['modifier', 'clause'].includes(m.type));

                    // Bracket Open/Close
                    const opens = brackets.filter(m => m.start === idx).sort((a, b) => (b.end - b.start) - (a.end - a.start));
                    const closes = brackets.filter(m => m.end === idx).sort((a, b) => (b.end - b.start) - (a.end - a.start)); // Incorrect sort for close? Usually reverse logic needed.

                    // Visuals
                    const mainMark = underlines[0]; // Take first underline if multiple
                    const underlineClass = mainMark ? MARK_STYLES[mainMark.type].color.split(' ')[0] : 'border-transparent';
                    const label = mainMark && mainMark.start === idx ? MARK_STYLES[mainMark.type].label : null; // Label only on first word? No, usually centered. 
                    // Let's put label on the MIDDLE word? Or just start.
                    // Ideally centered. But simpler: Put label on the start token for now.

                    return (
                        <div key={token.id} className="relative group flex items-center">
                            {/* Opening Brackets */}
                            {opens.map(m => (
                                <span key={m.id + 'o'} className={`mr-0.5 font-bold ${MARK_STYLES[m.type].color.split(' ')[1]}`}>
                                    {m.type === 'clause' ? '<' : '('}
                                </span>
                            ))}

                            {/* Word */}
                            <span
                                onClick={() => !readOnly && toggleSelection(idx)}
                                className={`
                                    relative cursor-pointer px-0.5 py-1 rounded transition-colors
                                    ${isSelected ? 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-300' : ''}
                                    ${mainMark ? `border-b-[3px] ${underlineClass}` : ''}
                                `}
                            >
                                {token.text}

                                {/* Floating Label for S/V/O/C start */}
                                {mainMark && mainMark.start === idx && (
                                    <span className={`absolute -bottom-4 left-0 text-[10px] font-black ${MARK_STYLES[mainMark.type].text} opacity-80 z-10`}>
                                        {MARK_STYLES[mainMark.type].label}
                                    </span>
                                )}

                                {/* Mark Removal (Hover) */}
                                {!readOnly && tokenMarks.length > 0 && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-white shadow-lg rounded-lg p-1 gap-1 z-50 border border-slate-200">
                                        {tokenMarks.map(m => (
                                            <button key={m.id} onClick={(e) => removeMark(m.id, e)} className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded whitespace-nowrap">
                                                DEL {MARK_STYLES[m.type].shortcut}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </span>

                            {/* Closing Brackets */}
                            {closes.map(m => (
                                <span key={m.id + 'c'} className={`ml-0.5 font-bold ${MARK_STYLES[m.type].color.split(' ')[1]}`}>
                                    {m.type === 'clause' ? '>' : ')'}
                                </span>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
