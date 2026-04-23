
import { useState, useEffect, useRef } from 'react';

import { createPortal } from 'react-dom';

// Mark Types
export type MarkType = 'verb' | 'nominal' | 'subordinator' | 'modifier' | 'coordinator' | 'connector';

export interface Mark {
    id: string;
    type: MarkType;
    start: number;
    end: number;
}

interface StructureEditorProps {
    text: string;
    initialMarks?: Mark[];
    onChange?: (marks: Mark[]) => void;
    readOnly?: boolean;
    compareMode?: boolean;
    correctMarks?: Mark[];
    hideLegend?: boolean;
    // Annotation mode (for FinalPassageView)
    annotations?: Record<string, string>;
    onWordClick?: (tokenIdx: number, word: string, event: React.MouseEvent) => void;
    sentenceIndex?: number;
    // Range selection mode
    rangeSelectMode?: boolean;
    rangeStart?: number; // tokenIdx of range start (within this sentence)
}

export const tokenize = (text: string) => {
    // 1. Split by spaces first to preserve general word structure
    const rawTokens = text.trim().split(/\s+/);
    const result: { id: number; text: string; noSpaceLeft?: boolean }[] = [];
    let idCounter = 0;

    rawTokens.forEach((word) => {
        if (!word) return;

        // 2. Split by punctuation and special characters, keeping them as separate tokens
        // logic: match (word chars/contractions) OR (punctuation)
        // We use a regex that captures delimiters
        const parts = word.split(/([,.;:?!(){}[\]<>'"“”-]+|['’]s|['’]ve|['’]d|['’]ll|['’]re|['’]m)/i);

        const subTokens = parts.filter(p => p !== "");
        subTokens.forEach((sub, idx) => {
            result.push({
                id: idCounter++,
                text: sub,
                noSpaceLeft: idx > 0 // If it was part of the same original "word" (e.g. "word," -> "word", ","), the second one has no space left
            });
        });
    });
    return result;
};

// --- Robust Parsing Logic ---

class TokenStream {
    tokens: string[];
    pos: number;

    constructor(tokens: string[]) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek(offset: number = 0): string | null {
        if (this.pos + offset >= this.tokens.length) return null;
        return this.tokens[this.pos + offset];
    }

    consume(): string | null {
        if (this.pos >= this.tokens.length) return null;
        return this.tokens[this.pos++];
    }

    match(pattern: string): boolean {
        if (this.peek() === pattern) {
            this.consume();
            return true;
        }
        return false;
    }
}

export const parseAnalysisString = (text: string, analysis: string): Mark[] => {
    if (!analysis) return [];

    const originalTokens = tokenize(text);
    if (originalTokens.length === 0) return [];

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: Lex the analysis string into a sequence of events
    // ═══════════════════════════════════════════════════════════
    type Event =
        | { kind: 'open', markType: MarkType }
        | { kind: 'close', markType: MarkType }
        | { kind: 'point', markType: MarkType }   // coordinator, single-word connector
        | { kind: 'word', text: string };

    const events: Event[] = [];

    // Pre-process: normalize bracket-style verbs/connectors  [word](V) / [word](O)
    // AND explicit tags [qn]...[/qn], [△], [O] word, < >, ( )
    // We use a regex to tokenize the analysis into meaningful chunks
    const LEX_RE = /\[Conn\]|\[\/Conn\]|\[qn\]|\[\/qn\]|\[△\]|\[O\]\s*|\(V\)|\(O\)|[(\[<>\])/]|[^\s(\[<>\])/\u0026]+|\s+/g;

    const lexTokens: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = LEX_RE.exec(analysis)) !== null) {
        const t = m[0].trim();
        if (t.length > 0) lexTokens.push(t);
    }

    let li = 0; // lex index
    while (li < lexTokens.length) {
        const t = lexTokens[li];

        // --- Explicit tags ---
        if (t === '[qn]')   { events.push({ kind: 'open', markType: 'nominal' }); li++; continue; }
        if (t === '[/qn]')  { events.push({ kind: 'close', markType: 'nominal' }); li++; continue; }
        if (t === '[Conn]')  { events.push({ kind: 'open', markType: 'connector' }); li++; continue; }
        if (t === '[/Conn]') { events.push({ kind: 'close', markType: 'connector' }); li++; continue; }
        if (t === '[△]')    { events.push({ kind: 'point', markType: 'coordinator' }); li++; continue; }

        // [O] word — standalone connector prefix (consume the next word too since it's part of the connector)
        if (t === '[O]') {
            events.push({ kind: 'point', markType: 'connector' });
            li++;
            continue;
        }

        // --- Bracket pairs: [word](V) or [word](O) ---
        if (t === '[') {
            // Collect words and internal modifier events until ]
            const innerEvents: Event[] = [];
            li++;
            while (li < lexTokens.length && lexTokens[li] !== ']') {
                const w = lexTokens[li];
                if (w === '(') {
                    // Internal modifier open inside [verb](V) — e.g. [can (even) communicate](V)
                    innerEvents.push({ kind: 'open', markType: 'modifier' });
                } else if (w === ')') {
                    innerEvents.push({ kind: 'close', markType: 'modifier' });
                } else if (w !== '[') {
                    innerEvents.push({ kind: 'word', text: w });
                }
                li++;
            }
            // Now li should be at ']'
            if (li < lexTokens.length && lexTokens[li] === ']') {
                li++; // skip ']'
                // Check for (V) or (O) immediately after
                let bracketType: MarkType = 'verb'; // default if no suffix
                if (li < lexTokens.length) {
                    if (lexTokens[li] === '(V)') { bracketType = 'verb'; li++; }
                    else if (lexTokens[li] === '(O)') { bracketType = 'connector'; li++; }
                }
                // Emit open, inner events (words + modifiers), close for this bracket group
                events.push({ kind: 'open', markType: bracketType });
                innerEvents.forEach(ie => events.push(ie));
                events.push({ kind: 'close', markType: bracketType });
            }
            continue;
        }
        // Stray ] without matching [ — skip
        if (t === ']') { li++; continue; }

        // --- Parentheses: modifier ---
        if (t === '(')  { events.push({ kind: 'open', markType: 'modifier' }); li++; continue; }
        if (t === ')')  { events.push({ kind: 'close', markType: 'modifier' }); li++; continue; }

        // --- Angle brackets: subordinator ---
        if (t === '<')  { events.push({ kind: 'open', markType: 'subordinator' }); li++; continue; }
        if (t === '>')  { events.push({ kind: 'close', markType: 'subordinator' }); li++; continue; }

        // --- Slash: nominal (legacy) ---
        if (t === '/') {
            // Check if there's an open nominal on the implicit stack
            // We'll handle this with a simple toggle heuristic
            events.push({ kind: 'open', markType: 'nominal' }); // Will be resolved in Phase 2
            li++;
            continue;
        }

        // --- Stray (V) / (O) without preceding bracket — skip ---
        if (t === '(V)' || t === '(O)') { li++; continue; }

        // --- Content word ---
        events.push({ kind: 'word', text: t });
        li++;
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1.5: Resolve legacy slash (/) toggles
    // ═══════════════════════════════════════════════════════════
    // For slash-based nominals, the first / opens and the second / closes.
    // Replace paired open/open with open/close.
    let slashDepth = 0;
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.kind === 'open' && ev.markType === 'nominal') {
            // Check if this was from a slash (not [qn])
            // We distinguish by looking if there's already an open nominal from slash
            if (slashDepth > 0) {
                events[i] = { kind: 'close', markType: 'nominal' };
                slashDepth--;
            } else {
                slashDepth++;
            }
        } else if (ev.kind === 'close' && ev.markType === 'nominal') {
            // Explicit close (from [/qn]) — always close
            if (slashDepth > 0) slashDepth--;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: Match word events to original tokens (fuzzy)
    // ═══════════════════════════════════════════════════════════
    const norm = (s: string) => s.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '').toLowerCase();

    type PositionedEvent =
        | { kind: 'open', markType: MarkType, tokenIdx: number }
        | { kind: 'close', markType: MarkType, tokenIdx: number }
        | { kind: 'point', markType: MarkType, tokenIdx: number };

    const positioned: PositionedEvent[] = [];
    let origIdx = 0;

    for (const ev of events) {
        if (ev.kind === 'word') {
            const target = norm(ev.text);
            if (target === '') continue;

            let found = false;
            const maxLook = 16; // generous lookahead

            for (let look = 0; look < maxLook && origIdx + look < originalTokens.length; look++) {
                const candidate = norm(originalTokens[origIdx + look].text);
                if (candidate === '') continue; // skip punctuation-only tokens

                // Exact match
                if (candidate === target) {
                    origIdx = origIdx + look + 1;
                    found = true;
                    break;
                }

                // Multi-token compound match: try concatenating consecutive tokens
                // This handles: machine-generated (3 tokens), AI's (3 tokens), don't (3 tokens)
                if (target.length > candidate.length && target.startsWith(candidate)) {
                    let concat = candidate;
                    let span = 1;
                    while (origIdx + look + span < originalTokens.length && concat.length < target.length) {
                        concat += norm(originalTokens[origIdx + look + span].text);
                        span++;
                        if (concat === target) {
                            origIdx = origIdx + look + span;
                            found = true;
                            break;
                        }
                        // If we've overshot, break
                        if (!target.startsWith(concat)) break;
                    }
                    if (found) break;
                    // Even if not exact after concat, if prefix matches well enough, accept
                    if (concat === target) {
                        origIdx = origIdx + look + span;
                        found = true;
                        break;
                    }
                }

                // Single-token partial match for contractions: "don" matches "don't"
                if (candidate.startsWith(target) || target.startsWith(candidate)) {
                    origIdx = origIdx + look + 1;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Fallback: just advance by 1 to avoid getting stuck
                origIdx++;
            }
        } else {
            // Markup event — record current position
            const idx = Math.min(origIdx, originalTokens.length - 1);
            positioned.push({
                kind: ev.kind,
                markType: ev.markType,
                tokenIdx: idx
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: Build marks from positioned events using a stack
    // ═══════════════════════════════════════════════════════════
    const marks: Mark[] = [];
    const stack: { type: MarkType, start: number }[] = [];

    // Helper: check if a token is purely punctuation
    const isPunct = (idx: number) => {
        if (idx < 0 || idx >= originalTokens.length) return false;
        return /^[,;:.?!'"''""()\[\]{}<>\/\\—–\-]+$/.test(originalTokens[idx].text);
    };

    for (const pe of positioned) {
        if (pe.kind === 'open') {
            stack.push({ type: pe.markType, start: pe.tokenIdx });
        } else if (pe.kind === 'close') {
            // Find matching opener (innermost first)
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].type === pe.markType) {
                    let startIdx = stack[i].start;
                    let endIdx = pe.tokenIdx > 0 ? pe.tokenIdx - 1 : 0;

                    // For verb and connector marks, trim punctuation from edges
                    if (pe.markType === 'verb' || pe.markType === 'connector') {
                        while (startIdx < endIdx && isPunct(startIdx)) startIdx++;
                        while (endIdx > startIdx && isPunct(endIdx)) endIdx--;
                    }

                    if (endIdx >= startIdx) {
                        marks.push({
                            id: Math.random().toString(36).substr(2, 9),
                            type: pe.markType,
                            start: startIdx,
                            end: endIdx
                        });
                    }
                    stack.splice(i, 1);
                    break;
                }
            }
        } else if (pe.kind === 'point') {
            // Point marks (coordinator, connector used as [O] prefix)
            const idx = pe.tokenIdx;
            if (pe.markType === 'coordinator') {
                // Skip punctuation to find the actual coordinator word
                let coordIdx = idx;
                while (coordIdx < originalTokens.length && /^[,;:\-—]+$/.test(originalTokens[coordIdx].text)) {
                    coordIdx++;
                }
                if (coordIdx < originalTokens.length) {
                    marks.push({ id: Math.random().toString(36).substr(2, 9), type: 'coordinator', start: coordIdx, end: coordIdx });
                }
            } else {
                // Connector prefix [O]
                if (idx < originalTokens.length) {
                    marks.push({ id: Math.random().toString(36).substr(2, 9), type: 'connector', start: idx, end: idx });
                }
            }
        }
    }

    return marks;
};

// Updated MARK_STYLES with Apple-style colors
export const MARK_STYLES = {
    coordinator: { label: '△', name: '등위접속사', color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]', symbol: '△' }, // Apple Red
    connector: { label: 'O', name: '연결사', color: 'text-[#ff9500]', bg: 'bg-[#ff9500]', symbol: 'O' }, // Apple Orange
    nominal: { label: '//', name: '준명사', color: 'text-[#ffcc00]', bg: 'bg-[#ffcc00]', symbol: '/' }, // Apple Yellow
    subordinator: { label: '< >', name: '종속접속사', color: 'text-[#28cd41]', bg: 'bg-[#28cd41]', symbol: '< >' }, // Apple Green
    verb: { label: '―', name: '동사', color: 'text-[#0071e3]', bg: 'bg-[#0071e3]', symbol: 'V' }, // Apple Blue
    modifier: { label: '( )', name: '수식어', color: 'text-[#af52de]', bg: 'bg-[#af52de]', symbol: '( )' }, // Apple Purple
};

// PORTAL POPUP COMPONENT - Below token, tight spacing
const PortalPopup = ({ children, position }: { children: React.ReactNode, position: { top: number, left: number } | null }) => {
    if (typeof window === 'undefined' || !position) return null;
    return createPortal(
        <div
            className="fixed z-[9999] pointer-events-auto filter drop-shadow-xl animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.top,
                left: position.left,
                transform: 'translate(-50%, 0)'
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export default function StructureEditor({ text, initialMarks = [], onChange, readOnly = false, compareMode = false, correctMarks = [], hideLegend = false, annotations, onWordClick, sentenceIndex = 0, rangeSelectMode = false, rangeStart }: StructureEditorProps) {
    const [tokens, setTokens] = useState(tokenize(text));
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
    const [history, setHistory] = useState<Mark[][]>([]);

    // Popup State
    const [popupPosition, setPopupPosition] = useState<{ top: number, left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredTokenIdx, setHoveredTokenIdx] = useState<number | null>(null);

    // Calculate Popup Position
    useEffect(() => {
        let targetIdx: number | null = null;
        if (hoveredTokenIdx !== null && getMarksForToken(hoveredTokenIdx).length > 0) {
            targetIdx = hoveredTokenIdx;
        } else if (selectedIndices.size === 1) {
            const idx = Array.from(selectedIndices)[0];
            if (getMarksForToken(idx).length > 0) targetIdx = idx;
        }

        if (targetIdx === null) {
            setPopupPosition(null);
            return;
        }

        const element = containerRef.current?.querySelector(`[data-index="${targetIdx}"]`);
        if (element) {
            const rect = element.getBoundingClientRect();
            setPopupPosition({
                top: rect.bottom + 4, // Tight below the token
                left: rect.left + (rect.width / 2)
            });
        }
    }, [selectedIndices, hoveredTokenIdx, initialMarks, readOnly]);

    useEffect(() => { setTokens(tokenize(text)); }, [text]);

    const addToHistory = () => setHistory(prev => [...prev.slice(-10), initialMarks]);
    const undo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        onChange?.(previous);
    };

    const applyMark = (type: MarkType) => {
        if (selectedIndices.size === 0) return;
        const indices = Array.from(selectedIndices).sort((a, b) => a - b);
        addToHistory();
        const newMark: Mark = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            start: indices[0],
            end: indices[indices.length - 1]
        };
        onChange?.([...initialMarks, newMark]);
        setSelectedIndices(new Set());
    };

    const removeMark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        addToHistory();
        onChange?.(initialMarks.filter(m => m.id !== id));
    };

    const getMarksForToken = (idx: number) => initialMarks.filter(m => m.start <= idx && m.end >= idx);
    const getDepth = (mark: Mark, idx: number) => {
        const sameTypeMarks = initialMarks
            .filter(m => m.type === mark.type && m.start <= idx && m.end >= idx)
            .sort((a, b) => (b.end - b.start) - (a.end - a.start));
        return sameTypeMarks.findIndex(m => m.id === mark.id);
    };

    const getNestingStyle = (type: MarkType, depth: number) => {
        // Stronger variations for nesting, ensuring visibility on white background
        if (type === 'modifier') return ['text-[#af52de]', 'text-[#8931b0]', 'text-[#d98bfd]'][depth % 3];
        if (type === 'nominal') return ['text-[#e6b800]', 'text-[#b49000]', 'text-[#ffcc00]'][depth % 3];
        if (type === 'subordinator') return ['text-[#28cd41]', 'text-[#1e9930]', 'text-[#61e374]'][depth % 3];
        return MARK_STYLES[type]?.color || 'text-[#1d1d1f]';
    };
    const getShadingClass = (type: MarkType) => {
        if (type === 'modifier') return 'bg-[#af52de]/10';
        if (type === 'subordinator') return 'bg-[#28cd41]/10';
        if (type === 'nominal') return 'bg-[#ffcc00]/15';
        return '';
    };
    const isMarkCorrect = (mark: Mark) => {
        if (!compareMode || !correctMarks) return true;
        // Only show red indicators for BACKBONE marks (verb, nominal)
        // Non-backbone marks (modifier, subordinator, coordinator, connector) are always shown as correct
        const backboneTypes: MarkType[] = ['verb', 'nominal'];
        if (!backboneTypes.includes(mark.type)) return true;
        // For backbone marks, check if there's ANY overlapping correct mark of the same type
        // This handles: are vs are+fulfilled (passive), split verbs, range differences
        const hasOverlap = correctMarks.some(cm => {
            if (cm.type !== mark.type) return false;
            // Overlap check: student mark and correct mark share at least one token
            return mark.start <= cm.end && mark.end >= cm.start;
        });
        if (hasOverlap) return true;

        // For verbs: also check reverse — student's mark might be part of a split verb
        // e.g., correct has [can](V) and [do](V) separately, but student grouped [can really do](V)
        if (mark.type === 'verb') {
            const correctVerbs = correctMarks.filter(cm => cm.type === 'verb');
            // Check if student's mark fully contains multiple correct verb marks
            const contained = correctVerbs.filter(cv => cv.start >= mark.start && cv.end <= mark.end);
            if (contained.length > 0) return true;
        }

        return false;
    };

    return (
        <div className="flex flex-col relative bg-transparent select-none font-sans" ref={containerRef} onClick={() => setSelectedIndices(new Set())}>

            {/* STICKY APPLY TOOLBAR - Apple Glassmorphism Pill */}
            {!readOnly && (
                <div className="sticky top-6 z-50 flex justify-center pb-6 pointer-events-none">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 dark:border-white/10 rounded-full px-5 py-2.5 flex items-center justify-between gap-5 pointer-events-auto transition-transform hover:scale-[1.02] duration-300">
                        <div className="flex gap-3 items-center">
                            {(Object.keys(MARK_STYLES) as MarkType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={(e) => { e.stopPropagation(); applyMark(type); }}
                                    className={`
                                        group relative flex items-center justify-center w-9 h-9 rounded-full
                                        hover:bg-black/5 transition-all active:scale-95
                                    `}
                                    title={MARK_STYLES[type].name}
                                >
                                    {/* Render symbol directly from label for Toolbar */}
                                    {MARK_STYLES[type].label === '―' ? (
                                        <span className={`w-5 h-0.5 rounded-full ${MARK_STYLES[type].bg}`}></span>
                                    ) : (
                                        <span className={`font-bold text-lg ${MARK_STYLES[type].color}`}>{MARK_STYLES[type].label}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-5 bg-black/10"></div>
                        <button
                            onClick={(e) => { e.stopPropagation(); undo(); }}
                            disabled={history.length === 0}
                            className="text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white disabled:opacity-30 transition-colors px-2"
                        >
                            Undo
                        </button>
                    </div>
                </div>
            )}

            {/* FLOATING DELETE POPUP - Below token, no arrow */}
            <PortalPopup position={popupPosition}>
                <div className="flex flex-row bg-[#1d1d1f]/90 backdrop-blur-md text-white shadow-2xl rounded-xl p-1.5 gap-2 pointer-events-auto origin-top animate-in fade-in zoom-in-95 duration-200 items-center justify-center border border-white/10">
                    {(() => {
                        let targetIdx: number | null = null;
                        if (hoveredTokenIdx !== null && getMarksForToken(hoveredTokenIdx).length > 0) targetIdx = hoveredTokenIdx;
                        else if (selectedIndices.size === 1) {
                            const idx = Array.from(selectedIndices)[0];
                            if (getMarksForToken(idx).length > 0) targetIdx = idx;
                        }

                        if (targetIdx !== null) {
                            const marks = getMarksForToken(targetIdx);
                            return (
                                <div className="flex gap-2">
                                    {marks.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1.5 border border-white/5">
                                            <span className={`text-xs font-bold ${MARK_STYLES[m.type].color}`}>{MARK_STYLES[m.type].label}</span>
                                            <button onClick={(e) => removeMark(m.id, e)} className="group/btn flex items-center justify-center w-4 h-4 bg-white/20 hover:bg-white/40 rounded-full transition-colors ml-1">
                                                <span className="text-[9px] text-white">✕</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </PortalPopup>

            {/* Main Text Area - Optimized Typography */}
            <div
                className="p-4 md:p-6 pt-3 flex flex-wrap gap-y-5 gap-x-[3px] md:gap-x-[4px] text-[13px] md:text-[17px] leading-[1.6] text-[#1d1d1f] dark:text-slate-200 font-sans font-medium tracking-tight max-w-full overflow-x-hidden"
                onMouseMove={(e) => {
                    if (readOnly || !isDragging || dragStartIndex === null) return;
                    const target = document.elementFromPoint(e.clientX, e.clientY);
                    const idx = parseInt(target?.getAttribute('data-index') || '');
                    if (!isNaN(idx)) {
                        const start = Math.min(dragStartIndex, idx);
                        const end = Math.max(dragStartIndex, idx);
                        const next = new Set(selectedIndices);
                        for (let i = start; i <= end; i++) next.add(i);
                        setSelectedIndices(next);
                    }
                }}
            >
                {tokens.map((token, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const tokenMarks = getMarksForToken(idx);

                    const verbMark = tokenMarks.find(m => m.type === 'verb');
                    const coordMark = tokenMarks.find(m => m.type === 'coordinator');
                    const connMark = tokenMarks.find(m => m.type === 'connector');

                    const nominals = tokenMarks.filter(m => m.type === 'nominal');
                    const subordinators = tokenMarks.filter(m => m.type === 'subordinator');
                    const modifiers = tokenMarks.filter(m => m.type === 'modifier');

                    let bgShading = '';
                    if (subordinators.length > 0) bgShading = getShadingClass('subordinator');
                    else if (nominals.length > 0) bgShading = getShadingClass('nominal');
                    else if (modifiers.length > 0) bgShading = getShadingClass('modifier');

                    const isConnStart = connMark ? connMark.start === idx : false;
                    const isConnEnd = connMark ? connMark.end === idx : false;
                    const isConnMiddle = connMark ? (idx > connMark.start && idx < connMark.end) : false;
                    const isConnMultiWord = connMark ? connMark.start !== connMark.end : false;
                    const connColor = connMark ? (isMarkCorrect(connMark) ? 'border-[#ff9500]' : 'border-[#ff3b30]') : '';
                    const connBg = connMark ? (isMarkCorrect(connMark) ? 'bg-[#ff9500]/10' : 'bg-[#ff3b30]/10') : '';
                    // Connector pill shape: single word = circle, multi-word = pill
                    let connClass = '';
                    if (connMark) {
                        if (!isConnMultiWord) {
                            connClass = `border-[2px] rounded-full ${connColor} ${connBg}`;
                        } else if (isConnStart) {
                            connClass = `border-t-[2px] border-b-[2px] border-l-[2px] rounded-l-full ${connColor} ${connBg}`;
                        } else if (isConnEnd) {
                            connClass = `border-t-[2px] border-b-[2px] border-r-[2px] rounded-r-full ${connColor} ${connBg}`;
                        } else if (isConnMiddle) {
                            connClass = `border-t-[2px] border-b-[2px] ${connColor} ${connBg}`;
                        }
                    }

                    // Check multi-word verb
                    const isVerbMultiWord = verbMark ? verbMark.start !== verbMark.end : false;

                    // Calculate if this span should extend rightward to bridge the flex gap
                    // For non-last tokens in a multi-word mark, extend the span to cover the gap
                    const isNonLastInMultiVerb = verbMark && isVerbMultiWord && idx >= verbMark.start && idx < verbMark.end;
                    const isNonLastInMultiConn = connMark && isConnMultiWord && idx >= connMark.start && idx < connMark.end;

                    // Check if non-last in multi-word annotation
                    let isNonLastInMultiAnnotation = false;
                    if (annotations && sentenceIndex !== undefined) {
                        for (const key of Object.keys(annotations)) {
                            const match = key.match(/^(\d+)-(\d+)(?::(\d+))?$/);
                            if (!match) continue;
                            const si = parseInt(match[1]);
                            const startI = parseInt(match[2]);
                            const endI = match[3] !== undefined ? parseInt(match[3]) : startI;
                            if (si === sentenceIndex && startI !== endI && idx >= startI && idx < endI) {
                                isNonLastInMultiAnnotation = true;
                                break;
                            }
                        }
                    }

                    const shouldExtendRight = isNonLastInMultiVerb || isNonLastInMultiConn || isNonLastInMultiAnnotation;

                    return (
                        <div
                            key={token.id}
                            className={`relative group flex items-center h-7 select-none cursor-pointer ${bgShading} rounded-[4px] px-[1px] transition-colors duration-100`}
                            style={{ zIndex: 10 }}
                            onMouseEnter={() => !readOnly && setHoveredTokenIdx(idx)}
                            onMouseLeave={() => !readOnly && setHoveredTokenIdx(null)}
                        >

                            {/* Openers */}
                            {tokenMarks.filter(m => m.start === idx && ['nominal', 'subordinator', 'modifier'].includes(m.type))
                                .sort((a, b) => (b.end - b.start) - (a.end - a.start))
                                .map(m => {
                                    let symbol = ''; let style = '';
                                    if (m.type === 'nominal') { symbol = '/'; style = getNestingStyle('nominal', getDepth(m, idx)); }
                                    else if (m.type === 'subordinator') { symbol = '<'; style = getNestingStyle('subordinator', getDepth(m, idx)); }
                                    else if (m.type === 'modifier') { symbol = '('; style = getNestingStyle('modifier', getDepth(m, idx)); }
                                    return <span key={m.id} className={`mr-0.5 font-bold font-mono text-[0.9em] ${isMarkCorrect(m) ? style : 'text-[#ff3b30] animate-pulse'}`}>{symbol}</span>;
                                })}

                            <span
                                data-index={idx}
                                onMouseDown={() => { if (!readOnly) { setIsDragging(true); setDragStartIndex(idx); } }}
                                onMouseUp={() => { setIsDragging(false); setDragStartIndex(null); }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (readOnly && onWordClick) {
                                        onWordClick(idx, token.text, e);
                                        return;
                                    }
                                    if (readOnly) return;
                                    setSelectedIndices(prev => {
                                        const next = new Set(prev);
                                        if (next.has(idx)) next.delete(idx);
                                        else next.add(idx);
                                        return next;
                                    });
                                }}
                                className={`
                                    relative px-[2px] py-[1px] transition-all z-30 no-underline whitespace-nowrap
                                    ${onWordClick ? `cursor-pointer hover:bg-yellow-100 hover:rounded ${rangeSelectMode ? 'hover:bg-blue-100' : ''}` : ''}
                                    ${(() => {
                                        // Check if this token is within any annotation range
                                        if (!annotations || sentenceIndex === undefined) return '';
                                        for (const key of Object.keys(annotations)) {
                                            const match = key.match(/^(\d+)-(\d+)(?::(\d+))?$/);
                                            if (!match) continue;
                                            const si = parseInt(match[1]);
                                            const startI = parseInt(match[2]);
                                            const endI = match[3] !== undefined ? parseInt(match[3]) : startI;
                                        if (si === sentenceIndex && idx >= startI && idx <= endI) {
                                                // Amber wavy underline for annotations (no background — preserves structure mark shading)
                                                return 'annotation-wavy';
                                            }
                                        }
                                        // Range selection mode: highlight start word
                                        if (rangeSelectMode && rangeStart !== undefined && idx === rangeStart) {
                                            return 'border-2 border-blue-400 rounded-[4px] bg-blue-50';
                                        }
                                        return '';
                                    })()}
                                    ${isSelected ? 'bg-[#0071e3]/20 text-[#0071e3]' : ''} 
                                    ${verbMark ? (isMarkCorrect(verbMark) ? 'border-b-[2px] border-[#0071e3] pb-[0px] rounded-none' : 'border-b-[2px] border-[#ff3b30] pb-[0px] rounded-none animate-pulse') : 'rounded-[4px]'} 
                                    ${connClass}
                                `}
                                style={shouldExtendRight ? { paddingRight: '7px', marginRight: '-7px' } : undefined}
                            >
                                {coordMark && coordMark.start === idx && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                        <span className={`${isMarkCorrect(coordMark) ? 'text-[#ff3b30]' : 'text-[#ff3b30] animate-pulse'} text-xl font-bold leading-none transform scale-125 origin-center mt-[-6px]`}>△</span>
                                    </div>
                                )}
                                {token.text}
                                {/* Annotation label — show BELOW, centered on the MIDDLE token of the range */}
                                {(() => {
                                    if (!annotations || sentenceIndex === undefined) return null;
                                    for (const [key, value] of Object.entries(annotations)) {
                                        const match = key.match(/^(\d+)-(\d+)(?::(\d+))?$/);
                                        if (!match) continue;
                                        const si = parseInt(match[1]);
                                        const startI = parseInt(match[2]);
                                        const endI = match[3] !== undefined ? parseInt(match[3]) : startI;
                                        // Show label on the middle token of the range
                                        const midI = Math.floor((startI + endI) / 2);
                                        if (si === sentenceIndex && idx === midI) {
                                            return (
                                                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-[1px] font-bold text-amber-600 whitespace-nowrap z-40 pointer-events-none print:text-amber-700" style={{ fontSize: '0.7em', lineHeight: '1.2' }}>
                                                    {value}
                                                </span>
                                            );
                                        }
                                    }
                                    return null;
                                })()}
                            </span>

                            {/* Closers */}
                            {tokenMarks.filter(m => m.end === idx && ['nominal', 'subordinator', 'modifier'].includes(m.type))
                                .sort((a, b) => b.start - a.start)
                                .map(m => {
                                    let symbol = ''; let style = '';
                                    if (m.type === 'nominal') { symbol = '/'; style = getNestingStyle('nominal', getDepth(m, idx)); }
                                    else if (m.type === 'subordinator') { symbol = '>'; style = getNestingStyle('subordinator', getDepth(m, idx)); }
                                    else if (m.type === 'modifier') { symbol = ')'; style = getNestingStyle('modifier', getDepth(m, idx)); }
                                    return <span key={m.id} className={`ml-0.5 font-bold font-mono text-[0.9em] ${isMarkCorrect(m) ? style : 'text-[#ff3b30] animate-pulse'}`}>{symbol}</span>;
                                })}

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
