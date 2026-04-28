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

    // Drag state — using refs for max performance (no re-renders during drag)
    const dragIndexRef = useRef<number | null>(null);
    const overIndexRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const floatingRef = useRef<HTMLDivElement | null>(null);
    const dragOffsetY = useRef(0);
    const dragOffsetX = useRef(0);
    const scrollIntervalRef = useRef<number | null>(null);
    const lastClientY = useRef(0);
    // Long-press detection
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingIndex = useRef<number | null>(null);
    const pendingPointerId = useRef<number | null>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

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

    // Create floating clone of dragged item
    const createFloatingClone = useCallback((sourceEl: HTMLElement, clientX: number, clientY: number) => {
        const rect = sourceEl.getBoundingClientRect();
        const clone = sourceEl.cloneNode(true) as HTMLDivElement;

        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'box-shadow 0.2s ease, transform 0.15s ease';
        clone.style.boxShadow = '0 20px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.12)';
        clone.style.transform = 'scale(1.04) rotate(0.5deg)';
        clone.style.borderColor = '#d97706';
        clone.style.backgroundColor = '#fffbeb';
        clone.style.borderRadius = '12px';
        clone.style.opacity = '0.97';
        clone.style.willChange = 'left, top';

        document.body.appendChild(clone);
        floatingRef.current = clone;

        dragOffsetY.current = clientY - rect.top;
        dragOffsetX.current = clientX - rect.left;
    }, []);

    // Update floating clone position (direct DOM, no React)
    const moveFloatingClone = useCallback((clientX: number, clientY: number) => {
        if (!floatingRef.current) return;
        floatingRef.current.style.left = `${clientX - dragOffsetX.current}px`;
        floatingRef.current.style.top = `${clientY - dragOffsetY.current}px`;
    }, []);

    // Remove floating clone
    const removeFloatingClone = useCallback(() => {
        if (floatingRef.current) { floatingRef.current.remove(); floatingRef.current = null; }
    }, []);

    // Auto-scroll when near edges
    const startAutoScroll = useCallback(() => {
        if (scrollIntervalRef.current) return;
        const threshold = 100;
        const maxSpeed = 16;
        const tick = () => {
            const y = lastClientY.current;
            const viewH = window.innerHeight;
            const scrollEl = document.scrollingElement || document.body;
            if (y < threshold) {
                const speed = Math.max(3, maxSpeed * (1 - y / threshold));
                scrollEl.scrollTop -= speed;
            } else if (y > viewH - threshold) {
                const speed = Math.max(3, maxSpeed * (1 - (viewH - y) / threshold));
                scrollEl.scrollTop += speed;
            }
            scrollIntervalRef.current = requestAnimationFrame(tick);
        };
        scrollIntervalRef.current = requestAnimationFrame(tick);
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (scrollIntervalRef.current) { cancelAnimationFrame(scrollIntervalRef.current); scrollIntervalRef.current = null; }
    }, []);

    const calcOverIndex = useCallback((clientY: number): number => {
        const items = itemRefs.current;
        for (let i = 0; i < items.length; i++) {
            const el = items[i];
            if (!el || i === dragIndexRef.current) continue;
            const rect = el.getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) return i;
        }
        return sentences.length - 1;
    }, [sentences.length]);

    const applyShifts = useCallback((newOverIndex: number) => {
        const dIdx = dragIndexRef.current;
        if (dIdx === null) return;
        const dragEl = itemRefs.current[dIdx];
        const dragH = dragEl ? dragEl.offsetHeight + 8 : 60;
        itemRefs.current.forEach((el, i) => {
            if (!el || i === dIdx) return;
            let shift = 0;
            if (dIdx < newOverIndex && i > dIdx && i <= newOverIndex) shift = -dragH;
            else if (dIdx > newOverIndex && i >= newOverIndex && i < dIdx) shift = dragH;
            el.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
            el.style.transform = shift !== 0 ? `translateY(${shift}px)` : '';
        });
    }, []);

    const clearShifts = useCallback(() => {
        itemRefs.current.forEach(el => { if (el) { el.style.transition = ''; el.style.transform = ''; } });
    }, []);

    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        pendingIndex.current = null;
        pendingPointerId.current = null;
    }, []);

    // Lock body scroll during drag
    const lockBodyScroll = useCallback(() => {
        document.body.style.touchAction = 'none';
        document.body.style.overscrollBehavior = 'none';
    }, []);
    const unlockBodyScroll = useCallback(() => {
        document.body.style.touchAction = '';
        document.body.style.overscrollBehavior = '';
    }, []);

    // Actually start dragging (called after long-press fires)
    const activateDrag = useCallback((index: number, clientX: number, clientY: number) => {
        const card = itemRefs.current[index];
        if (!card) return;

        isDragging.current = true;
        dragIndexRef.current = index;
        overIndexRef.current = index;
        lastClientY.current = clientY;

        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(30);

        // Prevent browser scroll while dragging
        lockBodyScroll();

        createFloatingClone(card, clientX, clientY);

        card.style.opacity = '0';
        card.style.maxHeight = `${card.offsetHeight}px`;
        card.style.transition = 'opacity 0.15s ease, max-height 0.25s ease, margin 0.25s ease, padding 0.25s ease';
        requestAnimationFrame(() => {
            card.style.maxHeight = '0px';
            card.style.padding = '0px';
            card.style.marginTop = '0px';
            card.style.marginBottom = '0px';
            card.style.overflow = 'hidden';
            card.style.border = 'none';
        });

        startAutoScroll();
    }, [createFloatingClone, startAutoScroll, lockBodyScroll]);

    // === POINTER EVENT HANDLERS ===

    const handlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
        startPos.current = { x: e.clientX, y: e.clientY };
        pendingIndex.current = index;
        pendingPointerId.current = e.pointerId;

        // Start long-press timer (300ms)
        cancelLongPress();
        longPressTimer.current = setTimeout(() => {
            const card = itemRefs.current[index];
            if (card) {
                try { card.setPointerCapture(pendingPointerId.current!); } catch {}
            }
            activateDrag(index, startPos.current.x, startPos.current.y);
        }, 300);
    }, [cancelLongPress, activateDrag]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // If long-press pending, check if finger moved too much → cancel (it's a scroll)
        if (longPressTimer.current) {
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                cancelLongPress();
            }
            return;
        }

        if (!isDragging.current || dragIndexRef.current === null) return;

        e.preventDefault();
        lastClientY.current = e.clientY;
        moveFloatingClone(e.clientX, e.clientY);

        const newOver = calcOverIndex(e.clientY);
        if (newOver !== overIndexRef.current) {
            overIndexRef.current = newOver;
            applyShifts(newOver);
        }
    }, [cancelLongPress, moveFloatingClone, calcOverIndex, applyShifts]);

    const restoreElement = useCallback((idx: number | null) => {
        if (idx !== null && itemRefs.current[idx]) {
            const el = itemRefs.current[idx]!;
            el.style.opacity = ''; el.style.maxHeight = ''; el.style.padding = '';
            el.style.marginTop = ''; el.style.marginBottom = ''; el.style.overflow = '';
            el.style.border = ''; el.style.transition = ''; el.style.transform = '';
        }
    }, []);

    const handlePointerUp = useCallback(() => {
        cancelLongPress();
        const dIdx = dragIndexRef.current;
        const oIdx = overIndexRef.current;

        removeFloatingClone();
        stopAutoScroll();
        clearShifts();
        restoreElement(dIdx);
        unlockBodyScroll();

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
    }, [cancelLongPress, removeFloatingClone, stopAutoScroll, clearShifts, restoreElement, unlockBodyScroll]);

    const handlePointerCancel = useCallback(() => {
        cancelLongPress();
        removeFloatingClone();
        stopAutoScroll();
        clearShifts();
        restoreElement(dragIndexRef.current);
        unlockBodyScroll();
        dragIndexRef.current = null;
        overIndexRef.current = null;
        isDragging.current = false;
    }, [cancelLongPress, removeFloatingClone, stopAutoScroll, clearShifts, restoreElement, unlockBodyScroll]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            removeFloatingClone();
            stopAutoScroll();
        };
    }, [removeFloatingClone, stopAutoScroll]);

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
            <div className="sticky top-0 z-40 bg-[#0A0E27] px-4 py-4 shadow-xl relative overflow-hidden">
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
                        문장을 드래그하여 올바른 순서로 배열하세요 · {sentences.length}문장
                    </p>
                </div>
            </div>

            {/* Instructions */}
            <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <p className="text-xs text-slate-500 font-medium">
                        문장을 <span className="font-bold text-amber-700">꾹 눌러</span> 드래그하면 순서를 바꿀 수 있습니다. 살짝 터치하면 스크롤됩니다.
                    </p>
                </div>
            </div>

            {/* Sentence Cards */}
            <div
                ref={containerRef}
                className="max-w-2xl mx-auto px-4 py-2 pb-32"
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
                {sentences.map((sentence, idx) => (
                    <div
                        key={`${sentence}-${idx}`}
                        ref={el => { itemRefs.current[idx] = el; }}
                        onPointerDown={(e) => handlePointerDown(idx, e)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 select-none bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md cursor-grab active:cursor-grabbing"
                    >
                        {/* Drag Handle + Number */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                            <span className="w-7 h-7 flex items-center justify-center bg-[#0A0E27] text-white rounded-lg text-xs font-bold shadow-sm">
                                {idx + 1}
                            </span>
                            <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" />
                                <circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="10" r="1.5" />
                                <circle cx="15" cy="10" r="1.5" />
                                <circle cx="9" cy="15" r="1.5" />
                                <circle cx="15" cy="15" r="1.5" />
                                <circle cx="9" cy="20" r="1.5" />
                                <circle cx="15" cy="20" r="1.5" />
                            </svg>
                        </div>

                        {/* Sentence Text */}
                        <p className="text-sm text-slate-700 leading-relaxed flex-1 pt-1">{sentence}</p>
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
