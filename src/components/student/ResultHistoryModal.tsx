import { useEffect, useState } from 'react';
import { dbService, Submission } from '@/services/db';
import StructureEditor, { parseAnalysisString } from '@/components/student/StructureEditor';
import FinalPassageView from '@/components/student/FinalPassageView';
import { Assignment } from '@/types';
import { toast } from 'sonner';

interface ResultHistoryModalProps {
    assignmentId: string;
    assignmentTitle: string;
    studentId: string;
    assignmentType?: string;
    onClose: () => void;
    onViewDetail: (submission: Submission) => void;
    onRefresh?: () => void;
}

export default function ResultHistoryModal({
    assignmentId,
    assignmentTitle,
    studentId,
    assignmentType,
    onClose,
    onViewDetail,
    onRefresh
}: ResultHistoryModalProps) {
    const [history, setHistory] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [passageViewSub, setPassageViewSub] = useState<Submission | null>(null);
    const [passageAssignment, setPassageAssignment] = useState<any>(null);
    const [splitWordsPerChunk, setSplitWordsPerChunk] = useState<number | string>('');
    const [splitProcessing, setSplitProcessing] = useState(false);
    const [writingDetailSub, setWritingDetailSub] = useState<Submission | null>(null);
    const [vocabDetailSub, setVocabDetailSub] = useState<Submission | null>(null);
    const [vocabWords, setVocabWords] = useState<any[]>([]);
    const [vocabConfig, setVocabConfig] = useState<any>(null);

    const loadData = async () => {
        const data = await dbService.getSubmissionHistory(studentId, assignmentId);
        setHistory(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [assignmentId, studentId]);

    const handleApprove = async () => {
        if (!selectedSubmission) return;
        const docId = (selectedSubmission as any).docId || selectedSubmission.id;
        if (confirm('승인하시겠습니까?')) {
            await dbService.updateSubmissionStatus(docId, 'approved');
            toast.success('승인되었습니다.');
            setSelectedSubmission(null);
            await loadData();
            onRefresh?.();
        }
    };

    const handleReject = async () => {
        if (!selectedSubmission) return;
        const docId = (selectedSubmission as any).docId || selectedSubmission.id;
        if (confirm('반려하시겠습니까? 기존 제출 기록이 삭제되고 학생이 다시 선택해야 합니다.')) {
            await dbService.deleteSubmission(docId);
            toast.success('반려 및 기록이 삭제되었습니다.');
            setSelectedSubmission(null);
            await loadData();
            onRefresh?.();
        }
    };

    const handleApproveWithSplit = async () => {
        if (!selectedSubmission) return;
        const docId = (selectedSubmission as any).docId || selectedSubmission.id;
        const words = selectedSubmission.answers || [];
        const chunkSize = Math.max(5, Number(splitWordsPerChunk) || 30);
        const chunks: any[][] = [];
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize));
        }
        if (chunks.length <= 1) {
            await handleApprove();
            return;
        }

        setSplitProcessing(true);
        try {
            // Load assignment to get config
            const assignment = await dbService.getAssignmentById(assignmentId);
            if (!assignment) { toast.error('과제를 찾을 수 없습니다.'); return; }

            // 1. Approve the original submission
            await dbService.updateSubmissionStatus(docId, 'approved');

            // 2. Create split vocabulary sub-assignments
            for (let i = 0; i < chunks.length; i++) {
                const newAssignment = {
                    title: `${assignmentTitle} (${i + 1}/${chunks.length})`,
                    type: 'vocabulary' as const,
                    words: chunks[i],
                    classIds: [],
                    studentIds: [studentId],
                    deadline: assignment.deadline || '',
                    category: assignment.category || 'sat',
                    sentences: [],
                    vocabConfig: assignment.vocabConfig || { studyMode: 'selection', failMode: 'accumulate', testMode: 'default' },
                    status: 'assigned' as const,
                    createdAt: new Date().toISOString(),
                    parentAssignmentId: assignmentId,
                    parentStudentId: studentId,
                    order: i
                };
                await dbService.addAssignment(newAssignment as any);
            }

            toast.success(`승인 완료! ${words.length}개 단어를 ${chunks.length}개 과제로 분할했습니다.`);
            setSelectedSubmission(null);
            await loadData();
            onRefresh?.();
        } catch (e) {
            console.error(e);
            toast.error('분할 승인 중 오류가 발생했습니다.');
        } finally {
            setSplitProcessing(false);
        }
    };

    // Approval View / Selected Words View
    if (selectedSubmission && (selectedSubmission.status === 'pending_review' || selectedSubmission.attempt === 0)) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10">
                    <div className={`${selectedSubmission.status === 'pending_review' ? 'bg-orange-500' : 'bg-slate-800'} p-6 text-white flex justify-between items-center`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold">
                                    {selectedSubmission.status === 'pending_review' ? '단어 선택 승인' : '선택된 단어 목록'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded ${selectedSubmission.status === 'pending_review' ? 'bg-white/20' : 'bg-green-500/20 text-green-300 border border-green-500/30'} text-[10px] font-bold`}>
                                    {selectedSubmission.status === 'pending_review' ? '검토 필요' : '승인 완료'}
                                </span>
                            </div>
                            <p className="text-xs text-orange-100">{assignmentTitle}</p>
                        </div>
                        <button onClick={() => setSelectedSubmission(null)} className="text-white/70 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            학생이 선택한 <span className="font-bold text-orange-600">{selectedSubmission.answers?.length || 0}개</span>의 단어:
                        </p>
                        {selectedSubmission.answers?.map((word: any, idx: number) => (
                            <div key={idx} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/10 hover:border-orange-200 transition-colors">
                                <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full text-slate-400 text-xs font-bold border border-slate-200 dark:border-white/10 shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base font-bold text-slate-800 dark:text-white">{word.term}</span>
                                        <span className="text-sm text-slate-500">{word.meaning}</span>
                                    </div>
                                    {word.contextSentence && (
                                        <p className="text-xs text-slate-400 bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-white/10 italic">
                                            &quot;{word.contextSentence}&quot;
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-white/10 space-y-3">
                        {/* Split Config */}
                        {selectedSubmission.status === 'pending_review' && (selectedSubmission.answers?.length || 0) > 5 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">과제당 단어 수</span>
                                    <input
                                        type="number"
                                        min={5}
                                        max={selectedSubmission.answers?.length || 100}
                                        value={splitWordsPerChunk}
                                        placeholder="30"
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '') { setSplitWordsPerChunk(''); return; }
                                            setSplitWordsPerChunk(Number(val));
                                        }}
                                        className="w-20 px-2 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <span className="text-xs text-slate-400">개</span>
                                    {Number(splitWordsPerChunk) >= 5 && (
                                        <span className="text-xs font-bold text-blue-600 ml-auto">
                                            → {Math.ceil((selectedSubmission.answers?.length || 0) / Number(splitWordsPerChunk))}개 과제
                                        </span>
                                    )}
                                </div>
                                {Number(splitWordsPerChunk) >= 5 && (selectedSubmission.answers?.length || 0) > Number(splitWordsPerChunk) && (
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        {Array.from({ length: Math.ceil((selectedSubmission.answers?.length || 0) / Number(splitWordsPerChunk)) }, (_, i) => {
                                            const start = i * Number(splitWordsPerChunk);
                                            const end = Math.min(start + Number(splitWordsPerChunk), selectedSubmission.answers?.length || 0);
                                            return `${i + 1}번: ${end - start}개`;
                                        }).join(' · ')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                            >
                                닫기
                            </button>
                            {selectedSubmission.status === 'pending_review' && (
                                <>
                                    <button
                                        onClick={handleReject}
                                        className="px-5 py-2.5 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors"
                                    >
                                        반려
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
                                    >
                                        그대로 승인
                                    </button>
                                    {Number(splitWordsPerChunk) >= 5 && (selectedSubmission.answers?.length || 0) > Number(splitWordsPerChunk) && (
                                        <button
                                            onClick={handleApproveWithSplit}
                                            disabled={splitProcessing}
                                            className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                                        >
                                            {splitProcessing ? '처리중...' : `분할 승인 (${Math.ceil((selectedSubmission.answers?.length || 0) / Number(splitWordsPerChunk))}개)`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleOpenPassageView = async (sub: Submission) => {
        try {
            const assignment = await dbService.getAssignmentById(sub.assignmentId);
            if (assignment) {
                setPassageAssignment(assignment);
                setPassageViewSub(sub);
            }
        } catch (e) {
            console.error('Failed to load assignment for passage view:', e);
        }
    };

    // Passage View Overlay
    if (passageViewSub && passageAssignment) {
        const passageSentences = passageAssignment.sentences?.map((s: any) => typeof s === 'string' ? s : s.original) || [];
        // Reconstruct answers from submission
        const answersRecord: Record<number, any> = {};
        if (passageViewSub.answers && Array.isArray(passageViewSub.answers)) {
            passageViewSub.answers.forEach((item: any) => {
                if (item && typeof item.index === 'number' && item.value) {
                    answersRecord[item.index] = item.value;
                }
            });
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                    <div className="bg-[#0A0E27] p-6 text-white flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold">📖 최종 성적표</h3>
                                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-bold border border-green-500/30">
                                    {passageViewSub.attempt}차 시도 · {passageViewSub.score}점
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">{assignmentTitle}</p>
                        </div>
                        <button onClick={() => { setPassageViewSub(null); setPassageAssignment(null); }} className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
                        <FinalPassageView
                            sentences={passageSentences}
                            answers={answersRecord}
                            title={assignmentTitle}
                            studentName={passageViewSub.studentName}
                            studentId={studentId}
                            assignmentId={assignmentId}
                            score={passageViewSub.score}
                            attempt={passageViewSub.attempt}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Vocabulary Detail View Overlay
    if (vocabDetailSub && vocabWords.length > 0) {
        const answers = vocabDetailSub.answers || [];
        const answersMap: Record<number, string> = {};
        if (Array.isArray(answers)) {
            answers.forEach((a: any) => {
                if (a && typeof a.index === 'number') {
                    answersMap[a.index] = a.value || '';
                }
            });
        }
        const testMode = vocabConfig?.testMode || 'default';
        const isReverse = testMode === 'reverse' || testMode === 'typing';

        const checkCorrect = (word: any, idx: number): boolean => {
            const userAnswer = answersMap[idx];
            if (!userAnswer) return false;
            if (testMode === 'typing-ko') {
                // For AI graded, we check if details contains grading info
                const details = (vocabDetailSub as any).details || [];
                if (details[0]?.type === 'typing-ko-ai-graded') {
                    // AI grading results not stored per-word in submission, compare loosely
                    return userAnswer.trim() === word.meaning?.trim();
                }
                return userAnswer.trim() === word.meaning?.trim();
            }
            if (isReverse || testMode === 'typing') {
                return userAnswer.trim().toLowerCase() === word.term?.trim().toLowerCase();
            }
            return userAnswer === word.meaning;
        };

        const wrongCount = vocabWords.filter((w, i) => !checkCorrect(w, i)).length;
        const correctCount = vocabWords.length - wrongCount;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                    <div className="bg-emerald-800 p-6 text-white flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold">📝 단어 테스트 결과</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${vocabDetailSub.score === 100 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                                    {vocabDetailSub.attempt}차 · {vocabDetailSub.score}점
                                </span>
                            </div>
                            <p className="text-xs text-emerald-200">{assignmentTitle}</p>
                        </div>
                        <button onClick={() => { setVocabDetailSub(null); setVocabWords([]); setVocabConfig(null); }} className="text-emerald-300 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Summary Bar */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-white/10 flex items-center gap-4">
                        <span className="text-xs font-bold text-emerald-600">✅ 정답 {correctCount}개</span>
                        <span className="text-xs font-bold text-red-500">❌ 오답 {wrongCount}개</span>
                        <span className="text-xs text-slate-400 ml-auto">총 {vocabWords.length}문제</span>
                    </div>

                    {/* Word List */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                        {vocabWords.map((word, idx) => {
                            const userAnswer = answersMap[idx];
                            const isCorrect = checkCorrect(word, idx);
                            const correctAnswer = (testMode === 'typing-ko') ? word.meaning : (isReverse ? word.term : word.meaning);
                            const questionText = (testMode === 'typing-ko') ? word.term : (isReverse ? word.meaning : word.term);

                            return (
                                <div key={idx} className={`p-3 rounded-xl border-l-4 bg-slate-50 dark:bg-slate-800 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold text-slate-400 mb-0.5">Q{idx + 1}</div>
                                            <div className="font-bold text-slate-800 dark:text-white text-base mb-0.5">{questionText}</div>
                                            <div className="text-[13px] text-slate-500">
                                                <span className="font-semibold text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 mr-2">정답</span>
                                                {correctAnswer}
                                            </div>
                                            {!isCorrect && (
                                                <div className="text-[13px] text-red-500 mt-0.5">
                                                    <span className="font-semibold text-[10px] bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-red-500 mr-2">나의 답</span>
                                                    {userAnswer || '(미입력)'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3 flex items-center">
                                            {isCorrect ? (
                                                <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Writing Detail View Overlay
    if (writingDetailSub) {
        const details = (writingDetailSub as any).details || [];
        const retryDetails = (writingDetailSub as any).retryDetails || [];
        const retryScore = (writingDetailSub as any).retryScore;
        const retryRounds = (writingDetailSub as any).retryRounds || 0;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
                    <div className="bg-fuchsia-900 p-6 text-white flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold">✍️ 구조작문 결과</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${writingDetailSub.score >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                                    {writingDetailSub.attempt}차 · {writingDetailSub.score}점 {writingDetailSub.score >= 90 ? 'PASS' : 'RETRY'}
                                </span>
                                {retryScore !== undefined && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/20 text-blue-300 border-blue-500/30">
                                        재도전 {retryScore}점
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-fuchsia-300">{assignmentTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const printWindow = window.open('', '_blank');
                                    if (!printWindow) return;
                                    printWindow.document.write(`<html><head><title>구조작문 - ${writingDetailSub.studentName}</title>
                                        <style>
                                            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                                            h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 24px; }
                                            .meta { margin-bottom: 30px; color: #666; font-size: 13px; }
                                            .item { margin-bottom: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
                                            .q { font-size: 13px; color: #64748b; margin-bottom: 6px; }
                                            .korean { font-size: 15px; font-weight: bold; margin-bottom: 8px; }
                                            .answer { font-size: 14px; color: #334155; }
                                            @media print { body { padding: 20px; } }
                                        </style>
                                    </head><body>
                                        <h1>구조작문 - ${writingDetailSub.studentName || ''}</h1>
                                        <div class="meta">
                                            <strong>과제:</strong> ${assignmentTitle}<br>
                                            <strong>1차 점수:</strong> ${writingDetailSub.score}점${retryScore !== undefined ? ` → 재도전 ${retryScore}점` : ''}
                                        </div>
                                        ${details.map((r: any, i: number) => `
                                            <div class="item">
                                                <div class="q">Q${i + 1}</div>
                                                <div class="korean">${r.korean}</div>
                                                <div class="answer">→ ${r.studentAnswer}</div>
                                            </div>
                                        `).join('')}
                                    </body></html>`);
                                    printWindow.document.close();
                                    setTimeout(() => printWindow.print(), 300);
                                }}
                                className="text-[10px] font-bold text-fuchsia-200 hover:text-white transition-colors"
                            >
                                🖨️ 인쇄
                            </button>
                            <button onClick={() => setWritingDetailSub(null)} className="text-fuchsia-300 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-3">
                        {/* First Attempt Label */}
                        {retryDetails.length > 0 && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">📝 1차 시도</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${writingDetailSub.score >= 90 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    평균 {writingDetailSub.score}점
                                </span>
                            </div>
                        )}
                        {details.map((r: any, i: number) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400">Q{(r.problemIdx !== undefined ? r.problemIdx : i) + 1}</span>
                                    <span className={`text-xs font-bold ${r.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.score}점</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{r.korean}</p>
                                <div className="pt-1 border-t border-slate-200 dark:border-white/10">
                                    <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 mr-1">내 답:</span>{r.studentAnswer}</p>
                                    <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 mr-1">정답:</span>{r.correctAnswer}</p>
                                </div>
                                {r.feedback && (
                                    <div className="mt-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-white/10">
                                        <span className="text-[10px] font-bold text-fuchsia-500">피드백:</span>
                                        <p className="text-xs text-slate-600 mt-0.5">{r.feedback}</p>
                                    </div>
                                )}
                                {r.grammarNotes && (
                                    <p className="text-[10px] text-slate-400"><span className="font-bold">📝 </span>{r.grammarNotes}</p>
                                )}
                            </div>
                        ))}

                        {/* Retry Results */}
                        {retryDetails.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mt-6 mb-1 pt-4 border-t-2 border-dashed border-slate-200 dark:border-white/10">
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">🔄 재도전 {retryRounds > 0 ? `(${retryRounds}회)` : ''}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${retryScore >= 90 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        평균 {retryScore}점
                                    </span>
                                    {retryScore > writingDetailSub.score && (
                                        <span className="text-[10px] font-bold text-emerald-500">
                                            ↑ +{retryScore - writingDetailSub.score}점 향상
                                        </span>
                                    )}
                                </div>
                                {retryDetails.map((r: any, i: number) => (
                                    <div key={`retry-${i}`} className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-blue-400">Q{(r.problemIdx !== undefined ? r.problemIdx : i) + 1}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-500 font-bold">재도전</span>
                                            </div>
                                            <span className={`text-xs font-bold ${r.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.score}점</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{r.korean}</p>
                                        <div className="pt-1 border-t border-blue-100 dark:border-blue-500/10">
                                            <p className="text-xs text-slate-600"><span className="font-bold text-blue-400 mr-1">내 답:</span>{r.studentAnswer}</p>
                                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 mr-1">정답:</span>{r.correctAnswer}</p>
                                        </div>
                                        {r.feedback && (
                                            <div className="mt-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-xl border border-blue-100 dark:border-white/10">
                                                <span className="text-[10px] font-bold text-blue-500">피드백:</span>
                                                <p className="text-xs text-slate-600 mt-0.5">{r.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}

                        {details.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">상세 결과 데이터가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Normal History View
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10">
                <div className="bg-[#0A0E27] p-6 text-white flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold">학습 이력</h3>
                            {assignmentType === 'vocabulary' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                    단어
                                </span>
                            ) : assignmentType === 'selection' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    단어선택
                                </span>
                            ) : (assignmentType === 'transform' || assignmentType === 'variant_session') ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    변형문제
                                </span>
                            ) : (assignmentType === 'writing' || assignmentType === 'writing_session') ? (
                                <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold border border-fuchsia-500/30">
                                    구조작문
                                </span>
                            ) : assignmentType === 'sentence_order' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    세부순서
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                                    구조독해
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">{assignmentTitle}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400 font-medium">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-medium">아직 학습 기록이 없습니다.</div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((sub, idx) => (
                                <div
                                    key={sub.id}
                                    onClick={async () => {
                                        if (sub.status === 'pending_review' || sub.attempt === 0) {
                                            setSelectedSubmission(sub);
                                        } else if (assignmentType === 'writing' || assignmentType === 'writing_session') {
                                            // Show writing detail inline
                                            setWritingDetailSub(sub);
                                        } else if (assignmentType === 'vocabulary' || assignmentType === 'selection') {
                                            // Show vocabulary detail inline
                                            try {
                                                const assignment = await dbService.getAssignmentById(assignmentId);
                                                if (assignment) {
                                                    // For selection type, check if there's a selection submission with filtered words
                                                    if (assignment.type === 'selection') {
                                                        const selectionSub = history.find(h => h.status === 'approved' && h.attempt === 0);
                                                        if (selectionSub?.details?.[0]?.selectedIndices) {
                                                            const indices = selectionSub.details[0].selectedIndices;
                                                            setVocabWords((assignment.words || []).filter((_: any, i: number) => indices.includes(i)));
                                                        } else {
                                                            setVocabWords(assignment.words || []);
                                                        }
                                                    } else {
                                                        setVocabWords(assignment.words || []);
                                                    }
                                                    setVocabConfig(assignment.vocabConfig || {});
                                                    setVocabDetailSub(sub);
                                                }
                                            } catch (e) {
                                                console.error('Failed to load vocab assignment:', e);
                                            }
                                        } else {
                                            // Navigate to full result page
                                            window.open(`/student/assignment/${assignmentId}?viewAttempt=${sub.attempt}&studentId=${studentId}`, '_blank');
                                        }
                                    }}
                                    className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer hover:shadow-md ${sub.status === 'pending_review' ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/20 hover:border-orange-300' : 'hover:border-blue-300'}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            {sub.status === 'pending_review' ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 animate-pulse">
                                                    승인 대기중
                                                </span>
                                            ) : sub.attempt === 0 ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                    단어 선택 완료
                                                </span>
                                            ) : (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sub.attempt === 1 ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                    sub.attempt === 2 ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                                        'bg-red-100 text-red-600 border-red-200'
                                                    }`}>
                                                    {sub.attempt}차 시도
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(sub.timestamp || 0).toLocaleString()}
                                            </span>
                                            {/* Mastery Badges */}
                                            {(sub as any).masteryLevel === 1 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                                                    <span>🥈</span> 실버
                                                </span>
                                            )}
                                            {(sub as any).masteryLevel === 2 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 flex items-center gap-1">
                                                    <span>👑</span> 골드
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-white">
                                            {sub.status === 'pending_review' ? '어휘 선택 검토 중' : sub.attempt === 0 ? '선택된 단어 보기' : (sub.score != null && sub.score >= 0 ? `${sub.score}점` : '-')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        {/* Passage View button for passed structure attempts (exclude vocab, selection, transform, writing) */}
                                        {sub.attempt > 0 && sub.score >= 80 && assignmentType !== 'vocabulary' && assignmentType !== 'selection' && assignmentType !== 'transform' && assignmentType !== 'writing' && assignmentType !== 'writing_session' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenPassageView(sub); }}
                                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                📖 지문 보기
                                            </button>
                                        )}
                                        {/* Writing: inline print button */}
                                        {sub.attempt > 0 && (assignmentType === 'writing' || assignmentType === 'writing_session') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const details = (sub as any).details || [];
                                                    const printWindow = window.open('', '_blank');
                                                    if (!printWindow) return;
                                                    printWindow.document.write(`<html><head><title>구조작문</title>
                                                        <style>
                                                            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                                                            h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 24px; }
                                                            .meta { margin-bottom: 30px; color: #666; font-size: 13px; }
                                                            .item { margin-bottom: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
                                                            .q { font-size: 13px; color: #64748b; margin-bottom: 6px; }
                                                            .korean { font-size: 15px; font-weight: bold; margin-bottom: 8px; }
                                                            .answer { font-size: 14px; color: #334155; }
                                                            @media print { body { padding: 20px; } }
                                                        </style>
                                                    </head><body>
                                                        <h1>구조작문 - ${sub.studentName || ''}</h1>
                                                        <div class="meta"><strong>과제:</strong> ${assignmentTitle}<br><strong>점수:</strong> ${sub.score}점</div>
                                                        ${details.map((r: any, i: number) => `
                                                            <div class="item">
                                                                <div class="q">Q${i + 1}</div>
                                                                <div class="korean">${r.korean}</div>
                                                                <div class="answer">→ ${r.studentAnswer}</div>
                                                            </div>
                                                        `).join('')}
                                                    </body></html>`);
                                                    printWindow.document.close();
                                                    setTimeout(() => printWindow.print(), 300);
                                                }}
                                                className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 px-2 py-1 rounded-lg hover:bg-fuchsia-100 transition-colors"
                                            >
                                                🖨️ 인쇄
                                            </button>
                                        )}
                                        <span className="text-[10px] font-bold group-hover:text-blue-500">{(assignmentType === 'writing' || assignmentType === 'writing_session') ? '결과 보기' : '리포트 보기'}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-white/10 flex justify-center">
                    {assignmentType !== 'writing' && assignmentType !== 'writing_session' && (
                        <button
                            onClick={() => window.location.href = `/student/assignment/${assignmentId}?mode=practice`}
                            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 dark:text-slate-300 rounded-xl font-bold shadow-sm transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            복습하기 (새로고침)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
