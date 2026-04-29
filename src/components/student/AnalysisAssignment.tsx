'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AnalysisViewer, { normalizeAnalyzedString } from './AnalysisViewer';
import StructureEditor, { parseAnalysisString, tokenize } from './StructureEditor';
import { AnalysisSentence } from '@/types';
import { dbService } from '@/services/db';
import { toast } from 'sonner';


interface DeepAnalysisData {
    title: string;
    passage: string;
    sentences: (AnalysisSentence & { id: string | number; wordByWord?: string; grammarNotes?: string[] })[];
    // Extended fields
    summaryEn?: string;
    summaryKr?: string;
    topic?: string;
    claim?: string;
    structure?: {
        intro?: { sentenceIds: number[]; note: string };
        body?: { sentenceIds: number[]; note: string }[];
        conclusion?: { sentenceIds: number[]; note: string };
    };
    keyGrammar?: { point: string; explanation: string; example: string; related?: string }[];
    vocabSummary?: { word: string; meaning: string; pos: string; synonym?: string; antonym?: string }[];
    examPrediction?: { type: string; likelihood: string; reason: string }[];
    tfCheck?: { statement: string; answer: boolean; explanation: string }[];
    topicSentenceId?: number;
}

interface AnalysisAssignmentProps {
    assignmentId: string;
    studentId?: string;
    data: DeepAnalysisData;
    onExit?: () => void;
    initialStudentWork?: {
        sentenceId: string;
        translation?: string;
        notes?: string;
    }[];
}

export default function AnalysisAssignment({ assignmentId, studentId, data, onExit, initialStudentWork = [] }: AnalysisAssignmentProps) {
    const [isCompleted, setIsCompleted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [viewMode, setViewMode] = useState<'sentences' | 'passage'>('sentences');

    // --- Annotation (memo) system ---
    const [annotations, setAnnotations] = useState<Record<string, string>>({});
    const [annotationMode, setAnnotationMode] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingWord, setEditingWord] = useState('');
    const [editingValue, setEditingValue] = useState('');
    const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
    const [memoSaving, setMemoSaving] = useState(false);
    const [memoHasChanges, setMemoHasChanges] = useState(false);
    const [rangeSelectMode, setRangeSelectMode] = useState(false);
    const [rangeStart, setRangeStart] = useState<{ sentenceIdx: number; tokenIdx: number } | null>(null);
    const passageRef = useRef<HTMLDivElement>(null);
    const memoInputRef = useRef<HTMLInputElement>(null);

    // Load annotations
    useEffect(() => {
        if (assignmentId && studentId) {
            dbService.getWordAnnotations(assignmentId, studentId).then(saved => {
                if (saved && Object.keys(saved).length > 0) {
                    const clean = { ...saved };
                    delete clean._analysisNote;
                    setAnnotations(clean);
                }
            }).catch(() => {});
        }
    }, [assignmentId, studentId]);

    useEffect(() => { if (editingKey && memoInputRef.current) memoInputRef.current.focus(); }, [editingKey]);

    const getTokenTexts = useCallback((sentIdx: number, start: number, end: number) => {
        const sent = data.sentences[sentIdx];
        if (!sent) return '';
        const tokens = tokenize(sent.original);
        return tokens.slice(start, end + 1).map(t => t.text).join(' ');
    }, [data.sentences]);

    const positionPopup = useCallback((el: HTMLElement) => {
        const container = passageRef.current;
        if (!el || !container) return;
        const eR = el.getBoundingClientRect();
        const cR = container.getBoundingClientRect();
        let left = (eR.left - cR.left) + eR.width / 2 - 140;
        left = Math.max(8, Math.min(left, cR.width - 288));
        const topAbove = (eR.top - cR.top) - 146;
        const topBelow = (eR.bottom - cR.top) + 6;
        setPopupPos({ top: topAbove > 0 ? topAbove : topBelow, left });
    }, []);

    const buildKey = (si: number, s: number, e: number) => s === e ? `${si}-${s}` : `${si}-${s}:${e}`;

    const handleMemoWordClick = useCallback((sentIdx: number, tokenIdx: number, word: string, event: React.MouseEvent) => {
        if (!annotationMode) return;
        const el = event.currentTarget as HTMLElement;
        if (rangeSelectMode && rangeStart) {
            if (rangeStart.sentenceIdx !== sentIdx) return;
            const s = Math.min(rangeStart.tokenIdx, tokenIdx);
            const e = Math.max(rangeStart.tokenIdx, tokenIdx);
            const key = buildKey(sentIdx, s, e);
            setEditingKey(key);
            setEditingWord(getTokenTexts(sentIdx, s, e));
            setEditingValue(annotations[key] || '');
            setRangeSelectMode(false);
            setRangeStart(null);
            positionPopup(el);
            return;
        }
        // Check existing
        for (const [k, v] of Object.entries(annotations)) {
            const m = k.match(/^(\d+)-(\d+)(?::(\d+))?$/);
            if (!m) continue;
            const si = parseInt(m[1]), sI = parseInt(m[2]), eI = m[3] !== undefined ? parseInt(m[3]) : sI;
            if (si === sentIdx && tokenIdx >= sI && tokenIdx <= eI) {
                setEditingKey(k); setEditingWord(getTokenTexts(sentIdx, sI, eI)); setEditingValue(v); positionPopup(el); return;
            }
        }
        const key = buildKey(sentIdx, tokenIdx, tokenIdx);
        setEditingKey(key); setEditingWord(word); setEditingValue(annotations[key] || ''); positionPopup(el);
    }, [annotationMode, annotations, rangeSelectMode, rangeStart, getTokenTexts, positionPopup]);

    const handleMemoSave = () => {
        if (!editingKey) return;
        setAnnotations(prev => { const n = { ...prev }; if (editingValue.trim()) n[editingKey] = editingValue.trim(); else delete n[editingKey]; return n; });
        setMemoHasChanges(true); setEditingKey(null); setPopupPos(null);
    };
    const handleMemoDelete = () => {
        if (!editingKey) return;
        setAnnotations(prev => { const n = { ...prev }; delete n[editingKey]; return n; });
        setMemoHasChanges(true); setEditingKey(null); setPopupPos(null);
    };
    const handleMemoSaveToFirebase = async () => {
        if (!assignmentId || !studentId) { toast.error('저장 불가'); return; }
        setMemoSaving(true);
        try {
            await dbService.saveWordAnnotations(assignmentId, studentId, annotations);
            setMemoHasChanges(false);
            toast.success(`저장 완료! (${Object.keys(annotations).length}개 메모)`);
        } catch { toast.error('저장 실패'); } finally { setMemoSaving(false); }
    };

    const handleComplete = async () => {
        if (!studentId) { toast.error('학생 세션을 찾을 수 없습니다.'); return; }
        setIsSaving(true);
        try {
            await dbService.addSubmission({
                assignmentId,
                studentId,
                answers: [],
                score: 100,
                attempt: 1,
                status: 'passed',
                submittedAt: Date.now()
            } as any);
            setIsCompleted(true);
            toast.success('학습 완료 처리되었습니다!');
        } catch (err) {
            console.error('Failed to save completion:', err);
            toast.error('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSaving(false);
        }
    };

    const { structure, keyGrammar, vocabSummary, examPrediction, tfCheck } = data;
    const hasSidePanel = !!(data.topic || data.claim || structure || keyGrammar?.length || examPrediction?.length);

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Navy Header — Matching other learning tools */}
            <header className="bg-[#0A0E27] sticky top-0 z-30 relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="max-w-[1400px] mx-auto px-4 py-4 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                                    Analysis
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                    {data.sentences.length}개 문장
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-white truncate">{data.title}</h1>
                            {data.summaryKr && (
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{data.summaryKr}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Print button */}
                            <button
                                onClick={() => window.open(`/analysis-print/${assignmentId}?studentId=${studentId || ''}&mode=passage`, '_blank')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                인쇄
                            </button>
                            {/* Exit button */}
                            {onExit && (
                                <button
                                    onClick={onExit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                                >
                                    나가기
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-4 py-8">

            {/* SUMMARY Bar */}
            {(data.topic || data.claim) && (
                <div className="mb-6 bg-gradient-to-r from-[#0A0E27] to-[#1a2456] text-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider">SUMMARY</span>
                    </div>
                    {data.topic && (
                        <div className="mb-2">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">주제</span>
                            <p className="text-white/90 font-medium text-sm">{data.topic}</p>
                        </div>
                    )}
                    {data.claim && (
                        <div>
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">요지</span>
                            <p className="text-white/90 font-medium text-sm">{data.claim}</p>
                        </div>
                    )}
                </div>
            )}

            {/* View Mode Toggle */}
            <div className="mb-6 flex items-center justify-center gap-2 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-100 shadow-sm">
                <button
                    onClick={() => setViewMode('sentences')}
                    className={`flex-1 max-w-[200px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'sentences' ? 'bg-[#0A0E27] text-white shadow-md' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    📋 문장별 상세
                </button>
                <button
                    onClick={() => setViewMode('passage')}
                    className={`flex-1 max-w-[200px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'passage' ? 'bg-[#0A0E27] text-white shadow-md' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    📖 전체 지문
                </button>
            </div>

            {viewMode === 'passage' ? (
                /* ===== FULL PASSAGE STRUCTURE VIEW ===== */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">구조독해 전체 보기</span>
                        <div className="flex-1"></div>
                        {/* Memo mode toggle */}
                        <button
                            onClick={() => { setAnnotationMode(!annotationMode); setEditingKey(null); setPopupPos(null); setRangeSelectMode(false); setRangeStart(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-all text-xs border ${
                                annotationMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            {annotationMode ? '메모 ON' : '단어 메모'}
                            {Object.keys(annotations).length > 0 && (
                                <span className="bg-amber-200 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{Object.keys(annotations).length}</span>
                            )}
                        </button>
                        {memoHasChanges && (
                            <button onClick={handleMemoSaveToFirebase} disabled={memoSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-xs hover:bg-emerald-600 transition-all disabled:opacity-50">
                                {memoSaving ? '저장 중...' : '💾 저장'}
                            </button>
                        )}
                    </div>
                    {/* Annotation hint */}
                    {annotationMode && !rangeSelectMode && (
                        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
                            <span>📝 <strong>메모 모드:</strong> 단어를 클릭하면 뜻이나 메모를 추가할 수 있어요.</span>
                        </div>
                    )}
                    {rangeSelectMode && (
                        <div className="mx-5 mt-4 bg-blue-50 border border-blue-300 rounded-xl px-4 py-2.5 text-xs text-blue-800 flex items-center justify-between animate-pulse">
                            <span>🔗 <strong>범위 선택 중:</strong> 끝 단어를 클릭하세요!</span>
                            <button onClick={() => { setRangeSelectMode(false); setRangeStart(null); }} className="px-2 py-1 bg-blue-200 text-blue-700 font-bold rounded text-[10px]">취소</button>
                        </div>
                    )}
                    {/* Click-away overlay */}
                    {editingKey && (
                        <div className="fixed inset-0 z-[9998]" onClick={() => { setEditingKey(null); setPopupPos(null); }} />
                    )}
                    <style>{`
                        .analysis-passage-flow > div > div {
                            display: inline !important;
                            flex-direction: unset !important;
                        }
                        .analysis-passage-flow > div > div > div {
                            display: inline !important;
                            flex-wrap: wrap !important;
                            padding: 0 !important;
                            gap: 0 3px !important;
                        }
                        @media (min-width: 768px) {
                            .analysis-passage-flow > div > div > div {
                                gap: 0 5px !important;
                            }
                        }
                        .analysis-passage-flow > div > div > div > div {
                            display: inline-flex !important;
                        }
                        .analysis-passage-flow > div::after {
                            content: ' ';
                            display: inline;
                            white-space: pre;
                            font-size: 4px;
                        }
                        /* Force smaller text & tighter line height globally for StructureEditor inside passage mode */
                        .analysis-passage-flow span,
                        .analysis-passage-flow div {
                            font-size: inherit !important;
                            line-height: inherit !important;
                        }
                    `}</style>
                    <div ref={passageRef} className="relative p-6">
                        <div className={`analysis-passage-flow leading-[2.6] text-[12px] md:text-[13px] md:leading-[2.8] font-medium tracking-tight ${annotationMode ? '' : 'pointer-events-none'}`}>
                            {data.sentences.map((sent, idx) => {
                                const analyzed = normalizeAnalyzedString(sent.analyzed || '');
                                const marks = analyzed ? parseAnalysisString(sent.original, analyzed) : [];

                                return (
                                    <div key={idx} style={{ display: 'inline' }}>
                                        <StructureEditor
                                            text={sent.original}
                                            initialMarks={marks}
                                            readOnly={true}
                                            hideLegend={true}
                                            annotations={annotations}
                                            sentenceIndex={idx}
                                            onWordClick={annotationMode ? (tokenIdx, word, event) => handleMemoWordClick(idx, tokenIdx, word, event) : undefined}
                                            rangeSelectMode={rangeSelectMode}
                                            rangeStart={rangeStart?.sentenceIdx === idx ? rangeStart.tokenIdx : undefined}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        {/* Annotation popup */}
                        {editingKey && popupPos && (
                            <div className="absolute z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-[280px]" style={{ top: popupPos.top, left: popupPos.left }}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">단어 메모</div>
                                <div className="text-sm font-bold text-slate-800 mb-2">&ldquo;{editingWord}&rdquo;</div>
                                <input ref={memoInputRef} type="text" value={editingValue} onChange={e => setEditingValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleMemoSave(); if (e.key === 'Escape') { setEditingKey(null); setPopupPos(null); } }}
                                    placeholder="뜻, 메모 등을 입력하세요..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={handleMemoSave} className="flex-1 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600">확인</button>
                                    <button onClick={() => {
                                        if (!editingKey) return;
                                        const m = editingKey.match(/^(\d+)-(\d+)/);
                                        if (m) { setRangeStart({ sentenceIdx: parseInt(m[1]), tokenIdx: parseInt(m[2]) }); setRangeSelectMode(true); setEditingKey(null); setPopupPos(null); }
                                    }} className="py-1.5 px-3 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs border border-blue-200">범위</button>
                                    {annotations[editingKey] && (
                                        <button onClick={handleMemoDelete} className="py-1.5 px-3 bg-red-50 text-red-600 font-bold rounded-lg text-xs border border-red-200">삭제</button>
                                    )}
                                    <button onClick={() => { setEditingKey(null); setPopupPos(null); }} className="py-1.5 px-3 bg-slate-100 text-slate-500 font-bold rounded-lg text-xs">취소</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Translation list */}
                    <div className="border-t border-slate-100 p-5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">해석</span>
                        <div className="space-y-2">
                            {data.sentences.map((sent, idx) => {
                                const sentId = typeof sent.id === 'number' ? sent.id : idx + 1;
                                return (
                                    <div key={idx} className="flex gap-2 text-sm">
                                        <span className="text-slate-400 font-bold w-5 text-right flex-shrink-0">{sentId}</span>
                                        <p className="text-slate-700 leading-relaxed">{sent.translation}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
            /* ===== SENTENCE-BY-SENTENCE VIEW ===== */
            <div className={`flex gap-6 ${hasSidePanel ? 'flex-col lg:flex-row' : ''}`}>
                {/* LEFT: Sentence Analysis */}
                <div className={`flex-1 min-w-0 ${hasSidePanel ? 'lg:w-[65%]' : 'w-full'}`}>
                    <div className="flex flex-col gap-6">
                        {data.sentences.map((sent, idx) => {
                            const sentId = typeof sent.id === 'number' ? sent.id : idx + 1;
                            const isTopicSentence = data.topicSentenceId === sentId;
                            // Find which section this sentence belongs to
                            const isIntro = structure?.intro?.sentenceIds?.includes(sentId);
                            const isConclusion = structure?.conclusion?.sentenceIds?.includes(sentId);
                            const bodySection = Array.isArray(structure?.body) ? structure.body.find(b => b.sentenceIds?.includes(sentId)) : null;

                            // Section label
                            let sectionLabel = '';
                            let sectionColor = '';
                            if (isIntro && structure?.intro?.sentenceIds?.[0] === sentId) {
                                sectionLabel = '도입부';
                                sectionColor = 'bg-blue-100 text-blue-700 border-blue-200';
                            }
                            if (bodySection && bodySection.sentenceIds?.[0] === sentId) {
                                sectionLabel = '본론';
                                sectionColor = 'bg-green-100 text-green-700 border-green-200';
                            }
                            if (isConclusion && structure?.conclusion?.sentenceIds?.[0] === sentId) {
                                sectionLabel = '결론';
                                sectionColor = 'bg-red-100 text-red-700 border-red-200';
                            }

                            return (
                                <div key={idx}>
                                    {/* Section Divider */}
                                    {sectionLabel && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sectionColor}`}>{sectionLabel}</span>
                                            <div className="flex-1 border-t border-slate-200"></div>
                                        </div>
                                    )}

                                    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                                        isTopicSentence ? 'border-amber-300 ring-1 ring-amber-200/50' : 'border-slate-200'
                                    }`}>
                                        {/* Topic sentence badge */}
                                        {isTopicSentence && (
                                            <div className="bg-amber-50 px-5 py-1.5 border-b border-amber-200/50 flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-amber-700">⭐ 주제문장 (Topic Sentence)</span>
                                            </div>
                                        )}
                                        {/* Structure Analysis */}
                                        <div className="p-5">
                                            <div className="flex-1">
                                                <AnalysisViewer sentences={[sent]} expandAll={true} startIndex={idx} />
                                            </div>

                                            {/* Word-by-Word */}
                                            {(sent as any).wordByWord && (
                                                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-1">단어별 해석</span>
                                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">{(sent as any).wordByWord}</p>
                                                </div>
                                            )}

                                            {/* Grammar Notes (extended) */}
                                            {(sent as any).grammarNotes?.length > 0 && (
                                                <div className="mt-3 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                                                    <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wider block mb-1">문법 포인트</span>
                                                    <ul className="space-y-1">
                                                        {(sent as any).grammarNotes.map((note: string, ni: number) => (
                                                            <li key={ni} className="text-xs text-sky-800 font-medium flex items-start gap-1.5">
                                                                <span className="text-sky-400 mt-0.5">•</span>
                                                                {note}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Side Panel */}
                {hasSidePanel && (
                    <div className="lg:w-[35%] lg:sticky lg:top-4 lg:self-start space-y-4">
                        {/* 글의 구조 · 해석 */}
                        {structure && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">📐</span>
                                    글의 구조 · 해석
                                </h3>
                                <div className="space-y-4">
                                    {/* 도입부 */}
                                    {structure.intro && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">도입부</span>
                                                {structure.intro.note && <span className="text-[10px] text-slate-400 italic truncate">{structure.intro.note}</span>}
                                            </div>
                                            <div className="space-y-1 pl-2 border-l-2 border-blue-200">
                                                {data.sentences.filter((_, i) => {
                                                    const sId = typeof data.sentences[i].id === 'number' ? data.sentences[i].id : i + 1;
                                                    return structure.intro!.sentenceIds?.includes(sId as number);
                                                }).map((sent, si) => {
                                                    const sentId = typeof sent.id === 'number' ? sent.id : (structure.intro!.sentenceIds?.[si] || si + 1);
                                                    return (
                                                        <div key={si} className="flex gap-1.5 text-[11px] pl-1">
                                                            <span className="text-blue-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt((sentId as number) - 1) || sentId}</span>
                                                            <p className="text-slate-600 leading-relaxed">{sent.translation}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {/* 본론 */}
                                    {structure.body?.map((b, bi) => (
                                        <div key={bi}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">본론{structure.body!.length > 1 ? ` ${bi + 1}` : ''}</span>
                                                {b.note && <span className="text-[10px] text-slate-400 italic truncate">{b.note}</span>}
                                            </div>
                                            <div className="space-y-1 pl-2 border-l-2 border-green-200">
                                                {data.sentences.filter((_, i) => {
                                                    const sId = typeof data.sentences[i].id === 'number' ? data.sentences[i].id : i + 1;
                                                    return b.sentenceIds?.includes(sId as number);
                                                }).map((sent, si) => {
                                                    const sentId = typeof sent.id === 'number' ? sent.id : (b.sentenceIds?.[si] || si + 1);
                                                    return (
                                                        <div key={si} className="flex gap-1.5 text-[11px] pl-1">
                                                            <span className="text-green-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt((sentId as number) - 1) || sentId}</span>
                                                            <p className="text-slate-600 leading-relaxed">{sent.translation}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {/* 결론 */}
                                    {structure.conclusion && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">결론</span>
                                                {structure.conclusion.note && <span className="text-[10px] text-slate-400 italic truncate">{structure.conclusion.note}</span>}
                                            </div>
                                            <div className="space-y-1 pl-2 border-l-2 border-red-200">
                                                {data.sentences.filter((_, i) => {
                                                    const sId = typeof data.sentences[i].id === 'number' ? data.sentences[i].id : i + 1;
                                                    return structure.conclusion!.sentenceIds?.includes(sId as number);
                                                }).map((sent, si) => {
                                                    const sentId = typeof sent.id === 'number' ? sent.id : (structure.conclusion!.sentenceIds?.[si] || si + 1);
                                                    return (
                                                        <div key={si} className="flex gap-1.5 text-[11px] pl-1">
                                                            <span className="text-red-500 font-bold flex-shrink-0">{"❶❷❸❹❺❻❼❽❾❿".charAt((sentId as number) - 1) || sentId}</span>
                                                            <p className="text-slate-600 leading-relaxed">{sent.translation}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 핵심 문법 */}
                        {keyGrammar && keyGrammar.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold">📝</span>
                                    핵심 문법 사항
                                </h3>
                                <div className="space-y-4">
                                    {keyGrammar.map((kg, ki) => (
                                        <div key={ki} className="border-l-2 border-purple-300 pl-3">
                                            <h4 className="text-xs font-bold text-purple-700 mb-1">{kg.point}</h4>
                                            <p className="text-[11px] text-slate-600 leading-relaxed mb-1">{kg.explanation}</p>
                                            {kg.example && (
                                                <p className="text-[11px] text-slate-500 italic bg-purple-50 p-2 rounded-lg">예: {kg.example}</p>
                                            )}
                                            {kg.related && (
                                                <p className="text-[10px] text-purple-400 mt-1">{kg.related}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 변형문제 예상 */}
                        {examPrediction && examPrediction.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold">🎯</span>
                                    변형문제 예상
                                </h3>
                                <div className="space-y-2">
                                    {examPrediction.map((ep, ei) => (
                                        <div key={ei} className="flex items-start gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                ep.likelihood === '높음' ? 'bg-red-100 text-red-600' :
                                                ep.likelihood === '보통' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>{ep.likelihood}</span>
                                            <div>
                                                <span className="text-xs font-bold text-slate-700">{ep.type}</span>
                                                <p className="text-[11px] text-slate-500">{ep.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            )}

            {/* Bottom Sections */}
            <div className="mt-8 space-y-6">
                {/* Vocabulary Summary */}
                {vocabSummary && vocabSummary.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold">📚</span>
                            어휘 종합
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">Word</th>
                                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">뜻</th>
                                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">품사</th>
                                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">유의어</th>
                                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase">반의어</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vocabSummary.map((v, vi) => (
                                        <tr key={vi} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 font-bold text-slate-800">{v.word}</td>
                                            <td className="py-2 px-3 text-slate-600">{v.meaning}</td>
                                            <td className="py-2 px-3 text-slate-400 text-xs">{v.pos}</td>
                                            <td className="py-2 px-3 text-emerald-600 text-xs">{v.synonym || '-'}</td>
                                            <td className="py-2 px-3 text-red-500 text-xs">{v.antonym || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* T/F Check */}
                {tfCheck && tfCheck.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-5 h-5 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                                T/F CHECK
                            </h3>
                            <button
                                onClick={() => setShowAnswers(!showAnswers)}
                                className="text-xs font-bold text-cyan-600 hover:text-cyan-800 transition-colors"
                            >
                                {showAnswers ? '정답 숨기기' : '정답 보기'}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {tfCheck.map((tf, ti) => (
                                <div key={ti} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 mt-0.5">{ti + 1}.</span>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-700 font-medium mb-1">{tf.statement}</p>
                                        {showAnswers && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    tf.answer ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {tf.answer ? 'TRUE ✓' : 'FALSE ✗'}
                                                </span>
                                                <span className="text-[11px] text-slate-500">{tf.explanation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* Sticky Footer — Complete Button */}
            <div className="fixed bottom-0 left-0 lg:left-[220px] xl:left-[280px] right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+3.5rem))] flex justify-center z-[101] shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.08)]">
                <button
                    onClick={handleComplete}
                    disabled={isCompleted || isSaving}
                    className={`
                        font-bold py-3 px-12 rounded-full shadow-lg transition-all flex items-center gap-2
                        ${isCompleted
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-lime-600 text-white hover:bg-lime-700 hover:scale-105 active:scale-95'}
                    `}
                >
                    {isCompleted ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            학습 완료 ✓
                        </>
                    ) : isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            저장 중...
                        </>
                    ) : '✅ 학습 완료'}
                </button>
            </div>
        </div>
    );
}
