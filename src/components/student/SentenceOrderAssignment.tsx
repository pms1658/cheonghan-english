'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { dbService } from '@/services/db';
import { toast } from 'sonner';

interface SentenceOrderAssignmentProps {
    assignment: any;
    studentId: string;
    studentName: string;
    classId: string;
    onComplete: () => void;
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export default function SentenceOrderAssignment({
    assignment,
    studentId,
    studentName,
    classId,
    onComplete
}: SentenceOrderAssignmentProps) {
    const originalSentences: string[] = assignment.sentenceOrderConfig?.originalSentences || [];

    const [sentences, setSentences] = useState<string[]>(() => {
        let shuffled = shuffleArray(originalSentences);
        let attempts = 0;
        while (shuffled.join('|||') === originalSentences.join('|||') && attempts < 10) {
            shuffled = shuffleArray(originalSentences);
            attempts++;
        }
        return shuffled;
    });

    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [correctPositions, setCorrectPositions] = useState<boolean[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptCount, setAttemptCount] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    // Drag state refs (no re-renders during drag for performance)
    const dragIndexRef = useRef<number | null>(null);
    const overIndexRef = useRef<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const floatingRef = useRef<HTMLDivElement | null>(null);
    const dragOffsetY = useRef(0);
    const dragOffsetX = useRef(0);
    const scrollRAF = useRef<number | null>(null);
    const lastClientY = useRef(0);
    const isDragging = useRef(false);
    const gapRef = useRef<HTMLDivElement | null>(null);

    // Load attempt count
    useEffect(() => {
        const loadAttempts = async () => {
            try {
                const history = await dbService.getSubmissionHistory(studentId, assignment.id);
                setAttemptCount(history.length);
            } catch { }
        };
        loadAttempts();
    }, [studentId, assignment.id]);

    // ─── Find the scrollable parent (main element in MainLayout) ───
    const getScrollParent = useCallback((): HTMLElement => {
        let el: HTMLElement | null = listRef.current;
        while (el) {
            const style = window.getComputedStyle(el);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                return el;
            }
            el = el.parentElement;
        }
        return document.documentElement;
    }, []);

    // ─── Auto-scroll while dragging ───
    const startAutoScroll = useCallback(() => {
        if (scrollRAF.current) return;
        const threshold = 100;
        const maxSpeed = 14;
        const tick = () => {
            if (!isDragging.current) { scrollRAF.current = null; return; }
            const y = lastClientY.current;
            const scrollEl = getScrollParent();
            // Use the scroll container's bounding rect for edge detection
            const rect = scrollEl === document.documentElement
                ? { top: 0, bottom: window.innerHeight }
                : scrollEl.getBoundingClientRect();

            if (y < rect.top + threshold) {
                const ratio = 1 - Math.max(0, y - rect.top) / threshold;
                scrollEl.scrollTop -= Math.max(2, maxSpeed * ratio);
            } else if (y > rect.bottom - threshold) {
                const ratio = 1 - Math.max(0, rect.bottom - y) / threshold;
                scrollEl.scrollTop += Math.max(2, maxSpeed * ratio);
            }
            scrollRAF.current = requestAnimationFrame(tick);
        };
        scrollRAF.current = requestAnimationFrame(tick);
    }, [getScrollParent]);

    const stopAutoScroll = useCallback(() => {
        if (scrollRAF.current) { cancelAnimationFrame(scrollRAF.current); scrollRAF.current = null; }
    }, []);

    // ─── Gap insertion: calculate which slot the cursor is over ───
    const calcInsertIndex = useCallback((clientY: number): number => {
        const items = itemRefs.current;
        for (let i = 0; i < items.length; i++) {
            if (i === dragIndexRef.current) continue;
            const el = items[i];
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) return i;
        }
        return sentences.length - 1;
    }, [sentences.length]);

    // ─── Animate items to create gap ───
    const showGap = useCallback((insertIdx: number) => {
        const dIdx = dragIndexRef.current;
        if (dIdx === null) return;
        itemRefs.current.forEach((el, i) => {
            if (!el || i === dIdx) return;
            let shift = 0;
            const dragH = itemRefs.current[dIdx]?.offsetHeight || 60;
            const gap = dragH + 8; // card height + gap
            if (dIdx < insertIdx) {
                // Dragging down: items between drag and insert shift up
                if (i > dIdx && i <= insertIdx) shift = -gap;
            } else if (dIdx > insertIdx) {
                // Dragging up: items between insert and drag shift down
                if (i >= insertIdx && i < dIdx) shift = gap;
            }
            el.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
            el.style.transform = shift !== 0 ? `translateY(${shift}px)` : '';
        });
    }, []);

    const clearGap = useCallback(() => {
        itemRefs.current.forEach(el => {
            if (el) { el.style.transition = ''; el.style.transform = ''; }
        });
    }, []);

    // ─── Create / move / remove floating clone ───
    const createClone = useCallback((el: HTMLElement, cx: number, cy: number) => {
        const rect = el.getBoundingClientRect();
        const clone = el.cloneNode(true) as HTMLDivElement;
        Object.assign(clone.style, {
            position: 'fixed',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            zIndex: '9999',
            pointerEvents: 'none',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1)',
            transform: 'scale(1.03)',
            borderColor: '#d97706',
            backgroundColor: '#fffbeb',
            borderRadius: '12px',
            opacity: '0.97',
            willChange: 'left, top',
            transition: 'box-shadow 0.2s, transform 0.15s',
        });
        document.body.appendChild(clone);
        floatingRef.current = clone;
        dragOffsetY.current = cy - rect.top;
        dragOffsetX.current = cx - rect.left;
    }, []);

    const moveClone = useCallback((cx: number, cy: number) => {
        if (!floatingRef.current) return;
        floatingRef.current.style.left = `${cx - dragOffsetX.current}px`;
        floatingRef.current.style.top = `${cy - dragOffsetY.current}px`;
    }, []);

    const removeClone = useCallback(() => {
        if (floatingRef.current) { floatingRef.current.remove(); floatingRef.current = null; }
    }, []);

    // ─── START DRAG (from handle only) ───
    const startDrag = useCallback((index: number, cx: number, cy: number) => {
        const card = itemRefs.current[index];
        if (!card || isDragging.current) return;

        isDragging.current = true;
        dragIndexRef.current = index;
        overIndexRef.current = index;
        lastClientY.current = cy;
        setDragActive(true);

        // Haptic
        if (navigator.vibrate) navigator.vibrate(20);

        // Lock text selection
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        // Create floating clone
        createClone(card, cx, cy);

        // Hide original with smooth collapse
        card.style.opacity = '0.15';
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'opacity 0.2s, transform 0.2s';

        startAutoScroll();
    }, [createClone, startAutoScroll]);

    // ─── POINTER HANDLERS (on handle only) ───
    const handleHandlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        try { target.setPointerCapture(e.pointerId); } catch {}
        startDrag(index, e.clientX, e.clientY);
    }, [startDrag]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || dragIndexRef.current === null) return;
        e.preventDefault();
        lastClientY.current = e.clientY;
        moveClone(e.clientX, e.clientY);

        const newOver = calcInsertIndex(e.clientY);
        if (newOver !== overIndexRef.current) {
            overIndexRef.current = newOver;
            showGap(newOver);
        }
    }, [moveClone, calcInsertIndex, showGap]);

    const finishDrag = useCallback(() => {
        const dIdx = dragIndexRef.current;
        const oIdx = overIndexRef.current;

        removeClone();
        stopAutoScroll();
        clearGap();

        // Restore original card
        if (dIdx !== null && itemRefs.current[dIdx]) {
            const el = itemRefs.current[dIdx]!;
            el.style.opacity = '';
            el.style.transform = '';
            el.style.transition = '';
        }

        // Unlock
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        window.getSelection()?.removeAllRanges();
        setDragActive(false);

        // Apply reorder
        if (isDragging.current && dIdx !== null && oIdx !== null && dIdx !== oIdx) {
            setSentences(prev => {
                const items = [...prev];
                const [removed] = items.splice(dIdx, 1);
                items.splice(oIdx, 0, removed);
                return items;
            });
        }

        dragIndexRef.current = null;
        overIndexRef.current = null;
        isDragging.current = false;
    }, [removeClone, stopAutoScroll, clearGap]);

    const handlePointerUp = useCallback(() => { finishDrag(); }, [finishDrag]);
    const handlePointerCancel = useCallback(() => { finishDrag(); }, [finishDrag]);

    // Global pointer move/up for when pointer leaves cards
    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            if (!isDragging.current || dragIndexRef.current === null) return;
            e.preventDefault();
            lastClientY.current = e.clientY;
            moveClone(e.clientX, e.clientY);
            const newOver = calcInsertIndex(e.clientY);
            if (newOver !== overIndexRef.current) {
                overIndexRef.current = newOver;
                showGap(newOver);
            }
        };
        const onUp = () => { if (isDragging.current) finishDrag(); };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [moveClone, calcInsertIndex, showGap, finishDrag]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { removeClone(); stopAutoScroll(); };
    }, [removeClone, stopAutoScroll]);

    // === SUBMIT & RETRY ===

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const positions = sentences.map((s, i) => s === originalSentences[i]);
        const correctCount = positions.filter(Boolean).length;
        const finalScore = Math.round((correctCount / originalSentences.length) * 100);

        setCorrectPositions(positions);
        setScore(finalScore);
        setSubmitted(true);

        try {
            await dbService.addSubmission({
                assignmentId: assignment.id,
                studentId,
                studentName,
                classId,
                attempt: attemptCount + 1,
                attemptNumber: attemptCount + 1,
                score: finalScore,
                answers: sentences.map((s, i) => ({
                    index: i,
                    sentence: s,
                    correct: s === originalSentences[i]
                })),
                details: [{
                    studentOrder: sentences,
                    correctOrder: originalSentences,
                    correctCount,
                    totalCount: originalSentences.length
                }],
                status: 'pending',
                submittedAt: Date.now(),
                timestamp: Date.now()
            } as any);
            toast.success(`제출 완료! ${finalScore}점`);
        } catch (err) {
            console.error('Submit error:', err);
            toast.error('제출 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        let shuffled = shuffleArray(originalSentences);
        let attempts = 0;
        while (shuffled.join('|||') === originalSentences.join('|||') && attempts < 10) {
            shuffled = shuffleArray(originalSentences);
            attempts++;
        }
        setSentences(shuffled);
        setSubmitted(false);
        setScore(0);
        setCorrectPositions([]);
        setAttemptCount(prev => prev + 1);
    };

    // ═══════════════════════════════════════
    //  RESULT VIEW
    // ═══════════════════════════════════════
    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                {/* Result Header */}
                <div className="bg-[#0A0E27] px-4 py-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                    <div className="relative z-10">
                        <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] mb-3 border border-white/10 text-white">
                            RESULT REPORT
                        </div>
                        <h1 className="text-xl font-bold text-white mb-4">{assignment.title}</h1>
                        <div className="flex justify-center items-baseline gap-2">
                            <span className="text-5xl font-black text-yellow-400 tracking-tighter">{score}</span>
                            <span className="text-lg text-slate-400 font-medium">/ 100</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            {correctPositions.filter(Boolean).length} / {originalSentences.length} 문장 정확
                        </p>
                    </div>
                </div>

                {/* Result Sentences */}
                <div className="max-w-2xl mx-auto p-4 space-y-2 pb-32">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">문장별 결과</h2>
                        <span className="text-xs text-slate-400">{score >= 100 ? '🎉 Perfect!' : `${correctPositions.filter(Boolean).length}개 정답`}</span>
                    </div>

                    {originalSentences.map((correctSentence, idx) => {
                        const studentSentence = sentences[idx];
                        const isCorrect = correctPositions[idx];
                        return (
                            <div key={idx} className={`p-4 rounded-xl border-2 transition-all ${
                                isCorrect
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : 'bg-red-50/30 border-red-200'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                                        isCorrect
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 space-y-1.5">
                                        {!isCorrect && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-red-500 uppercase">내 답:</span>
                                                <p className="text-sm text-red-600 line-through">{studentSentence}</p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-bold uppercase ${isCorrect ? 'text-emerald-600' : 'text-emerald-500'}`}>
                                                {isCorrect ? '✓ 정답' : '정답:'}
                                            </span>
                                            <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-800' : 'text-slate-700'}`}>{correctSentence}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 justify-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                    <button
                        onClick={handleRetry}
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            다시 도전
                        </span>
                    </button>
                    <button
                        onClick={onComplete}
                        className="px-10 py-3 bg-[#0A0E27] text-white font-bold rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <span className="flex items-center gap-2">
                            나가기
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  MAIN DRAG VIEW
    // ═══════════════════════════════════════
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navy Header */}
            <div className="sticky top-0 z-40 bg-[#0A0E27] px-4 py-4 shadow-xl relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                세부순서
                            </span>
                            {attemptCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold border border-white/10">
                                    {attemptCount + 1}차 시도
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onComplete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                        >
                            나가기
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </button>
                    </div>
                    <h2 className="text-lg font-bold text-white truncate">{assignment.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        ⠿ 손잡이를 잡고 드래그하여 올바른 순서로 배열하세요 · {sentences.length}문장
                    </p>
                </div>
            </div>

            {/* Sentence Cards */}
            <div
                ref={listRef}
                className="max-w-2xl mx-auto px-4 py-4 pb-32 space-y-2"
            >
                {sentences.map((sentence, idx) => (
                    <div
                        key={`${sentence}-${idx}`}
                        ref={el => { itemRefs.current[idx] = el; }}
                        className={`flex items-stretch rounded-xl border-2 select-none bg-white transition-colors ${
                            dragActive && dragIndexRef.current === idx
                                ? 'border-amber-300 bg-amber-50/30'
                                : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                        }`}
                    >
                        {/* ═══ DRAG HANDLE ═══ */}
                        <div
                            onPointerDown={(e) => handleHandlePointerDown(idx, e)}
                            className="flex-shrink-0 flex items-center justify-center px-2.5 cursor-grab active:cursor-grabbing bg-slate-50 hover:bg-amber-50 border-r border-slate-200 rounded-l-xl transition-colors touch-none"
                            style={{ touchAction: 'none' }}
                        >
                            <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="6" r="1.5" />
                                <circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" />
                                <circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" />
                                <circle cx="15" cy="18" r="1.5" />
                            </svg>
                        </div>

                        {/* ═══ SENTENCE TEXT (scrollable area — no drag here) ═══ */}
                        <div className="flex-1 p-4">
                            <p className="text-sm text-slate-700 leading-relaxed">{sentence}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Submit Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="max-w-2xl mx-auto flex items-center justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full max-w-xs px-8 py-3.5 bg-[#0A0E27] text-white font-bold rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                채점 중...
                            </>
                        ) : (
                            <>
                                제출하기
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
