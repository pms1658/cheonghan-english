'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import StructureEditor, { MARK_STYLES, MarkType, tokenize } from './StructureEditor';
import { dbService } from '@/services/db';
import Logo from '@/components/common/Logo';
import { toast } from 'sonner';

interface FinalPassageViewProps {
    sentences: string[];
    answers: Record<number, any>; // Each has { marks: Mark[] }
    title: string;
    studentName?: string;
    studentId?: string;
    assignmentId?: string;
    score?: number;
    attempt?: number;
    onClose?: () => void;
}

// Helper: parse annotation key → { sentenceIdx, startIdx, endIdx }
function parseAnnotationKey(key: string): { sentenceIdx: number; startIdx: number; endIdx: number } | null {
    // Format: "sentenceIdx-tokenIdx" (single) or "sentenceIdx-startIdx:endIdx" (range)
    const match = key.match(/^(\d+)-(\d+)(?::(\d+))?$/);
    if (!match) return null;
    const sentenceIdx = parseInt(match[1]);
    const startIdx = parseInt(match[2]);
    const endIdx = match[3] !== undefined ? parseInt(match[3]) : startIdx;
    return { sentenceIdx, startIdx, endIdx };
}

// Helper: build annotation key
function buildAnnotationKey(sentenceIdx: number, startIdx: number, endIdx: number): string {
    if (startIdx === endIdx) return `${sentenceIdx}-${startIdx}`;
    return `${sentenceIdx}-${startIdx}:${endIdx}`;
}

// Helper: check if a token is within any annotation range
function getAnnotationForToken(annotations: Record<string, string>, sentenceIdx: number, tokenIdx: number): { key: string; value: string; startIdx: number; endIdx: number } | null {
    for (const [key, value] of Object.entries(annotations)) {
        const parsed = parseAnnotationKey(key);
        if (!parsed) continue;
        if (parsed.sentenceIdx === sentenceIdx && tokenIdx >= parsed.startIdx && tokenIdx <= parsed.endIdx) {
            return { key, value, startIdx: parsed.startIdx, endIdx: parsed.endIdx };
        }
    }
    return null;
}

export default function FinalPassageView({
    sentences,
    answers,
    title,
    studentName,
    studentId,
    assignmentId,
    score,
    attempt,
    onClose
}: FinalPassageViewProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const passageContainerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // Annotation state
    const [annotations, setAnnotations] = useState<Record<string, string>>({});
    const [annotationMode, setAnnotationMode] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingWord, setEditingWord] = useState<string>('');
    const [editingValue, setEditingValue] = useState('');
    const [popupPos, setPopupPos] = useState<{ top: number, left: number, above?: boolean } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [analysisNote, setAnalysisNote] = useState('');

    // Range selection state
    const [rangeSelectMode, setRangeSelectMode] = useState(false);
    const [rangeStart, setRangeStart] = useState<{ sentenceIdx: number; tokenIdx: number } | null>(null);

    // Load annotations from Firebase
    useEffect(() => {
        if (assignmentId && studentId) {
            dbService.getWordAnnotations(assignmentId, studentId).then(saved => {
                if (saved && Object.keys(saved).length > 0) {
                    if (saved._analysisNote) {
                        setAnalysisNote(saved._analysisNote);
                        delete saved._analysisNote;
                    }
                    setAnnotations(saved);
                }
            }).catch(e => {
                console.error('Failed to load annotations:', e);
            });
        }
    }, [assignmentId, studentId]);

    // Focus input when popup opens
    useEffect(() => {
        if (editingKey && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingKey]);

    // Get combined text for a range of tokens
    const getTokenTexts = useCallback((sentenceIdx: number, startIdx: number, endIdx: number): string => {
        const sentence = sentences[sentenceIdx];
        if (!sentence) return '';
        const tokens = tokenize(sentence);
        return tokens.slice(startIdx, endIdx + 1).map(t => t.text).join(' ');
    }, [sentences]);

    // Position popup near a clicked element
    const positionPopup = useCallback((el: HTMLElement) => {
        const container = passageContainerRef.current;
        if (!el || !container) return;

        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const popupWidth = 280;
        const popupHeight = 140; // approximate popup height
        const padding = 8;

        let left = (elRect.left - containerRect.left) + elRect.width / 2 - popupWidth / 2;
        left = Math.max(padding, Math.min(left, containerRect.width - popupWidth - padding));

        // Position ABOVE the element
        const topAbove = (elRect.top - containerRect.top) - popupHeight - 6;
        // Fallback: if not enough space above, position below
        const topBelow = (elRect.bottom - containerRect.top) + 6;
        const useAbove = topAbove > 0;

        setPopupPos({ top: useAbove ? topAbove : topBelow, left });
    }, []);

    const handleWordClick = useCallback((sentenceIdx: number, tokenIdx: number, word: string, event: React.MouseEvent) => {
        if (!annotationMode) return;

        const el = event.currentTarget as HTMLElement;

        // --- RANGE SELECT MODE: picking the end word ---
        if (rangeSelectMode && rangeStart) {
            // Must be in same sentence
            if (rangeStart.sentenceIdx !== sentenceIdx) {
                // Different sentence — ignore or reset
                return;
            }

            const start = Math.min(rangeStart.tokenIdx, tokenIdx);
            const end = Math.max(rangeStart.tokenIdx, tokenIdx);

            const key = buildAnnotationKey(sentenceIdx, start, end);
            const combinedText = getTokenTexts(sentenceIdx, start, end);

            setEditingKey(key);
            setEditingWord(combinedText);
            setEditingValue(annotations[key] || '');
            setRangeSelectMode(false);
            setRangeStart(null);

            positionPopup(el);
            return;
        }

        // --- NORMAL MODE: single word click ---
        // Check if this token is part of an existing range annotation
        const existingAnnotation = getAnnotationForToken(annotations, sentenceIdx, tokenIdx);
        if (existingAnnotation) {
            // Edit existing annotation (single or range)
            setEditingKey(existingAnnotation.key);
            setEditingWord(getTokenTexts(sentenceIdx, existingAnnotation.startIdx, existingAnnotation.endIdx));
            setEditingValue(existingAnnotation.value);
        } else {
            // New single word annotation
            const key = buildAnnotationKey(sentenceIdx, tokenIdx, tokenIdx);
            setEditingKey(key);
            setEditingWord(word);
            setEditingValue(annotations[key] || '');
        }

        positionPopup(el);
    }, [annotationMode, annotations, rangeSelectMode, rangeStart, getTokenTexts, positionPopup]);

    const handleStartRangeSelect = () => {
        if (!editingKey) return;
        const parsed = parseAnnotationKey(editingKey);
        if (!parsed) return;

        // Set the start point and enter range select mode
        setRangeStart({ sentenceIdx: parsed.sentenceIdx, tokenIdx: parsed.startIdx });
        setRangeSelectMode(true);
        setEditingKey(null);
        setPopupPos(null);
    };

    const handleCancelRangeSelect = () => {
        setRangeSelectMode(false);
        setRangeStart(null);
    };

    const handleSaveAnnotation = () => {
        if (!editingKey) return;
        setAnnotations(prev => {
            const next = { ...prev };
            if (editingValue.trim()) {
                next[editingKey] = editingValue.trim();
            } else {
                delete next[editingKey];
            }
            return next;
        });
        setHasChanges(true);
        setEditingKey(null);
        setPopupPos(null);
    };

    const handleDeleteAnnotation = () => {
        if (!editingKey) return;
        setAnnotations(prev => {
            const next = { ...prev };
            delete next[editingKey];
            return next;
        });
        setHasChanges(true);
        setEditingKey(null);
        setPopupPos(null);
    };

    const handleSaveToFirebase = async () => {
        if (!assignmentId || !studentId) {
            toast.error('저장할 수 없습니다. (과제 또는 학생 정보 없음)');
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave: Record<string, string> = { ...annotations };
            if (analysisNote.trim()) {
                dataToSave._analysisNote = analysisNote.trim();
            }
            await dbService.saveWordAnnotations(assignmentId, studentId, dataToSave);
            setHasChanges(false);
            toast.success(`저장 완료! (${Object.keys(annotations).length}개 메모)`);
        } catch (e) {
            console.error('Save failed:', e);
            toast.error('저장 실패! 다시 시도해주세요.');
        } finally {
            setIsSaving(false);
        }
    };


    const annotationCount = Object.keys(annotations).length;

    return (
        <div className="animate-fadeIn">

            {/* Action Bar - hidden when printing */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3" data-no-print>
                <div className="flex items-center gap-3">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            문장별 보기
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setAnnotationMode(!annotationMode);
                            setEditingKey(null);
                            setPopupPos(null);
                            setRangeSelectMode(false);
                            setRangeStart(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all shadow-sm text-sm border ${
                            annotationMode
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        {annotationMode ? '메모 모드 ON' : '단어 메모'}
                        {annotationCount > 0 && (
                            <span className="bg-amber-200 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{annotationCount}</span>
                        )}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleSaveToFirebase}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-sm text-sm disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                    )}
                </div>
            </div>

            {/* Annotation mode hint */}
            {annotationMode && !rangeSelectMode && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2" data-no-print>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span><strong>메모 모드:</strong> 단어를 클릭하면 뜻이나 메모를 추가할 수 있어요. 여러 단어 선택도 가능!</span>
                </div>
            )}

            {/* Range selection mode hint */}
            {rangeSelectMode && (
                <div className="mb-4 bg-blue-50 border border-blue-300 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center justify-between gap-2 animate-pulse" data-no-print>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        <span><strong>범위 선택 중:</strong> 끝 단어를 클릭하세요!</span>
                    </div>
                    <button
                        onClick={handleCancelRangeSelect}
                        className="px-3 py-1 bg-blue-200 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-300 transition-all flex-shrink-0"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* Click-away: close popup when clicking outside */}
            {editingKey && (
                <div
                    className="fixed inset-0 z-[9998]"
                    style={{ pointerEvents: 'auto', touchAction: 'auto' }}
                    onClick={() => { setEditingKey(null); setPopupPos(null); }}
                    onTouchStart={(e) => {
                        // Allow scroll through on touch — only close if it's a tap
                        const startY = e.touches[0].clientY;
                        const handler = (te: TouchEvent) => {
                            const endY = te.changedTouches[0].clientY;
                            if (Math.abs(endY - startY) < 10) {
                                setEditingKey(null);
                                setPopupPos(null);
                            }
                            document.removeEventListener('touchend', handler);
                        };
                        document.addEventListener('touchend', handler, { once: true });
                        e.stopPropagation();
                    }}
                    data-no-print
                />
            )}

            {/* Printable Content */}
            <div ref={printRef} data-print-passage>
                {/* Header */}
                <div className="flex items-center justify-between border-b-[3px] border-[#0A0E27] pb-4 mb-6">
                    <div className="flex items-center gap-3">
                        {/* Logo: hidden on screen, visible in print window */}
                        <div className="hidden" data-print-logo>
                            <div style={{ width: 48, height: 48, background: '#083973', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0 }}>
                                <Logo className="w-full h-full" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-[#1d1d1f] leading-tight">{title}</h2>
                            <p className="text-[11px] text-[#86868b] font-medium mt-0.5">
                                {studentName && <span>{studentName}</span>}
                                {attempt !== undefined && <span> · {attempt}차 시도</span>}
                            </p>
                        </div>
                    </div>
                    {score !== undefined && (
                        <div className="flex items-baseline gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg px-3 py-1">
                            <span className="text-xl font-black text-blue-600">{score}</span>
                            <span className="text-xs text-slate-400 font-bold">점</span>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-4 flex-wrap mb-6 px-5 py-3 bg-[#f5f5f7] rounded-xl">
                    {(Object.keys(MARK_STYLES) as MarkType[]).map(type => (
                        <div key={type} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6e6e73]">
                            <div className={`w-2.5 h-2.5 rounded-full ${MARK_STYLES[type].bg}`}></div>
                            <span>{MARK_STYLES[type].label}</span>
                            <span className="text-[#aeaeb2]">{MARK_STYLES[type].name}</span>
                        </div>
                    ))}
                </div>

                {/* Passage - continuous flowing text */}
                <style>{`
                    .passage-flow > div > div {
                        display: inline !important;
                        flex-direction: unset !important;
                    }
                    .passage-flow > div > div > div {
                        display: inline !important;
                        flex-wrap: wrap !important;
                        padding: 0 !important;
                        gap: 0 3px !important;
                    }
                    @media (min-width: 768px) {
                        .passage-flow > div > div > div {
                            gap: 0 5px !important;
                        }
                    }
                    .passage-flow > div > div > div > div {
                        display: inline-flex !important;
                    }
                    .passage-flow > div::after {
                        content: ' ';
                        display: inline;
                        white-space: pre;
                        font-size: 4px;
                    }
                `}</style>
                <div ref={passageContainerRef} className="relative">
                    <div className={`passage-flow leading-[3.0] text-[14px] md:text-[19px] md:leading-[3.2] font-medium tracking-tight ${annotationMode ? '' : 'pointer-events-none'}`}>
                        {sentences.map((sentence, idx) => {
                            const studentMarks = answers[idx]?.marks || [];
                            return (
                                <div key={idx} style={{ display: 'inline' }}>
                                    <StructureEditor
                                        text={sentence}
                                        initialMarks={studentMarks}
                                        readOnly={true}
                                        hideLegend={true}
                                        annotations={annotations}
                                        sentenceIndex={idx}
                                        onWordClick={annotationMode ? (tokenIdx, word, event) => handleWordClick(idx, tokenIdx, word, event) : undefined}
                                        rangeSelectMode={rangeSelectMode}
                                        rangeStart={rangeStart?.sentenceIdx === idx ? rangeStart.tokenIdx : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Annotation Popup — absolute positioned within passage */}
                    {editingKey && popupPos && (
                        <div
                            ref={popupRef}
                            className="absolute z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-[280px] max-w-[calc(100vw-24px)]"
                            style={{ top: popupPos.top, left: popupPos.left }}
                            data-no-print
                        >
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">단어 메모</div>
                            <div className="text-sm font-bold text-slate-800 mb-2">&ldquo;{editingWord}&rdquo;</div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveAnnotation();
                                    if (e.key === 'Escape') { setEditingKey(null); setPopupPos(null); }
                                }}
                                placeholder="뜻, 메모 등을 입력하세요..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleSaveAnnotation}
                                    className="flex-1 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600 transition-all"
                                >
                                    확인
                                </button>
                                <button
                                    onClick={handleStartRangeSelect}
                                    className="py-1.5 px-3 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all border border-blue-200 flex items-center gap-1"
                                    title="여러 단어를 선택하여 메모"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                    범위
                                </button>
                                {annotations[editingKey] && (
                                    <button
                                        onClick={handleDeleteAnnotation}
                                        className="py-1.5 px-3 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-200"
                                    >
                                        삭제
                                    </button>
                                )}
                                <button
                                    onClick={() => { setEditingKey(null); setPopupPos(null); }}
                                    className="py-1.5 px-3 bg-slate-100 text-slate-500 font-bold rounded-lg text-xs hover:bg-slate-200 transition-all"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Analysis Notes Section — blue frame */}
                <div className="analysis-notes-print mt-6 border-2 border-blue-400 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">분석 노트</span>
                        </div>
                        {/* Dedicated save button for notes */}
                        <button
                            onClick={handleSaveToFirebase}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-[11px] font-bold rounded-lg hover:bg-blue-600 transition-all shadow-sm disabled:opacity-50"
                            data-no-print
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                    <textarea
                        value={analysisNote}
                        onChange={e => { setAnalysisNote(e.target.value); setHasChanges(true); }}
                        placeholder="지문 분석, 문법 정리, 단어 정리 등 자유롭게 메모하세요..."
                        className="w-full min-h-[100px] p-3 text-[13px] text-slate-800 leading-relaxed bg-blue-50/30 border border-blue-100 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 font-medium placeholder:text-slate-300"
                    />
                </div>

                {/* Footer for print */}
                <div className="mt-4 text-center text-[9px] text-[#aeaeb2] font-medium">
                    CheongHan English Institute | {new Date().toLocaleDateString('ko-KR')}
                </div>
            </div>
        </div>
    );
}
