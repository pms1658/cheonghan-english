import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Assignment, Word } from '@/types';
import { dbService } from '@/services/db';
import VocabOverview from './vocab/VocabOverview';
import FlashcardStudy from './vocab/FlashcardStudy';
import VocabTest from './vocab/VocabTest';
import VocabResult from './vocab/VocabResult';
import VocabSelector from './vocab/VocabSelector';

interface VocabularyAssignmentProps {
    assignment: Assignment;
    student: { id: string, name: string, classId: string };
    onExit: () => void;
}

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toast } from 'sonner';

export default function VocabularyAssignment({ assignment, student, onExit }: VocabularyAssignmentProps) {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<'loading' | 'selector' | 'pending' | 'rejected' | 'overview' | 'study' | 'test' | 'grading' | 'result'>('loading');
    const [words, setWords] = useState<Word[]>(assignment.words || []);
    const [baseWords, setBaseWords] = useState<Word[]>(assignment.words || []); // For retry reset

    // Internal State
    const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
    const [testScore, setTestScore] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);
    const [isStudied, setIsStudied] = useState(false);
    const [testCurrentIndex, setTestCurrentIndex] = useState(0);
    const [shuffleOrder, setShuffleOrder] = useState<number[] | undefined>(undefined);
    const [aiGradingResults, setAiGradingResults] = useState<Record<number, boolean> | null>(null);

    // --- Auto-draft save for PWA resilience ---
    const draftKey = `CHEONGHAN_VOCAB_DRAFT_${assignment.id}_${student.id}`;
    const draftRef = useRef({ mode: 'loading' as string, testAnswers: {} as Record<number, string>, testCurrentIndex: 0, shuffleOrder: undefined as number[] | undefined });

    const saveDraft = useCallback(() => {
        const d = draftRef.current;
        if (d.mode === 'loading' || d.mode === 'result' || d.mode === 'grading' || d.mode === 'pending' || d.mode === 'rejected' || d.mode === 'selector') return;
        try {
            localStorage.setItem(draftKey, JSON.stringify({
                mode: d.mode,
                testAnswers: d.testAnswers,
                testCurrentIndex: d.testCurrentIndex,
                shuffleOrder: d.shuffleOrder,
                savedAt: Date.now()
            }));
        } catch { /* quota exceeded */ }
    }, [draftKey]);

    // Keep ref in sync
    useEffect(() => {
        draftRef.current = { mode, testAnswers, testCurrentIndex, shuffleOrder };
    }, [mode, testAnswers, testCurrentIndex, shuffleOrder]);

    // Save on visibility change (PWA minimize)
    useEffect(() => {
        const onHide = () => { if (document.visibilityState === 'hidden') saveDraft(); };
        const onPageHide = () => saveDraft();
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('beforeunload', onPageHide);
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('beforeunload', onPageHide);
        };
    }, [saveDraft]);

    // Initial Load
    useEffect(() => {

        const checkStatus = async () => {

            try {
                // [Fix] Check Mode Param FIRST to allow overrides (e.g. view words without selecting)
                const modeParam = searchParams?.get('mode');
                if (modeParam === 'overview') {
                    setMode('overview');
                    return; // Priority Exit
                }

                const history = await dbService.getSubmissionHistory(student.id, assignment.id);

                if (!history) {
                    setAttemptCount(0);
                    setMode('overview'); // Safe default
                    return;
                }
                setAttemptCount(history.length);

                // Check for Selection Workflow
                if (assignment.type === 'selection') {
                    if (!history || history.length === 0) {
                        setMode('selector');
                        return;
                    }

                    const selectionSub = history.find(h => h.status === 'pending_review' || h.status === 'approved' || h.status === 'selection_rejected');

                    if (!selectionSub) {
                        setMode('selector');
                        return;
                    }

                    if (selectionSub.status === 'pending_review') {
                        setMode('pending');
                        return;
                    }

                    if (selectionSub.status === 'selection_rejected') {
                        setMode('rejected');
                        return;
                    }

                    if (selectionSub.status === 'approved') {
                        // Filter words based on selection
                        if (Array.isArray(selectionSub.details) && selectionSub.details.length > 0 && selectionSub.details[0]?.selectedIndices) {
                            const indices: number[] = selectionSub.details[0].selectedIndices;
                            const filteredWords = (assignment.words || []).filter((_, i) => indices.includes(i));
                            setWords(filteredWords);
                            setBaseWords(filteredWords); // Set baseWords for selection mode
                        }
                    }
                }

                // Normal Flow (or Approved Selection)
                const studySubmissions = history.filter(h => h.status !== 'pending_review' && h.status !== 'approved' && h.status !== 'selection_rejected');

                if (studySubmissions.length === 0) {
                    setMode('overview');
                } else {
                    const lastSub = studySubmissions[studySubmissions.length - 1];

                    setIsStudied(true);

                    if (lastSub.score !== -1) {
                        setTestScore(lastSub.score);
                        // Safely restore answers
                        if (Array.isArray(lastSub.answers)) {
                            const restoredAnswers: Record<number, string> = {};
                            lastSub.answers.forEach((a: any) => {
                                if (a && typeof a.index === 'number') {
                                    restoredAnswers[a.index] = a.value || '';
                                }
                            });
                            setTestAnswers(restoredAnswers);
                        }
                    }

                    if (modeParam === 'practice' && lastSub.score !== -1) {
                        setMode('result');
                    } else {
                        // Try to restore draft (study/test in progress)
                        const savedDraft = localStorage.getItem(draftKey);
                        if (savedDraft) {
                            try {
                                const parsed = JSON.parse(savedDraft);
                                // Only restore if fresh (< 2 hours)
                                if (parsed.savedAt && Date.now() - parsed.savedAt < 2 * 60 * 60 * 1000) {
                                    if (parsed.mode === 'test' && parsed.testAnswers && Object.keys(parsed.testAnswers).length > 0) {
                                        setTestAnswers(parsed.testAnswers);
                                        setTestCurrentIndex(parsed.testCurrentIndex || 0);
                                        if (parsed.shuffleOrder) setShuffleOrder(parsed.shuffleOrder);
                                        setMode('test');
                                        toast.info(`📝 단어 테스트 진행 상황이 복원되었습니다.`, { duration: 4000 });
                                        localStorage.removeItem(draftKey);
                                        return; // Don't fall through to overview
                                    } else if (parsed.mode === 'study') {
                                        setMode('study');
                                        toast.info(`📝 단어 학습 진행 상황이 복원되었습니다.`, { duration: 4000 });
                                        localStorage.removeItem(draftKey);
                                        return;
                                    }
                                }
                                localStorage.removeItem(draftKey);
                            } catch { localStorage.removeItem(draftKey); }
                        }
                        setMode('overview');
                    }
                }
            } catch (error) {
                console.error('[VocabAssignment] Error in checkStatus:', error);
                toast.error('데이터를 불러오는 중 오류가 발생했습니다. (기본 모드로 진입합니다)');
                setMode('overview');
            }
        };
        checkStatus();

    }, [assignment.id, student.id, searchParams, assignment.type, assignment.words]);

    const handleSelectionSubmit = async (selectedIndices: number[]) => {
        try {
            // Save selected words as a snapshot in answers
            const selectedWords = (assignment.words || []).filter((_, i) => selectedIndices.includes(i));

            // Safely determine classId (student.classId might be undefined if multiple classes exist)
            const targetClassId = student?.classId || (assignment?.classIds && assignment.classIds[0]) || 'individual';

            await dbService.addSubmission({
                studentId: student.id,
                studentName: student.name || 'Anonymous',
                classId: targetClassId,
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                attempt: 0,
                score: -1,
                details: [{ type: 'selection', selectedIndices }],
                status: 'pending_review',
                answers: selectedWords // Save actual words for teacher review
            } as any);
            setMode('pending');
        } catch (error) {
            console.error('Failed to submit selection:', error);
            toast.error('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            throw error; // Propagate to VocabSelector to reset loading state
        }
    };

    const handleTestComplete = async (finalAnswers: Record<number, string>) => {
        // Calculate Score
        const config = assignment.vocabConfig || { studyMode: 'selection', failMode: 'restart', testMode: 'default' };
        const testMode = config.testMode || 'default';

        // ★ typing-ko: AI batch grading
        if (testMode === 'typing-ko') {
            setTestAnswers(finalAnswers);
            setMode('grading');

            try {
                // Build items for API
                const items = words.map((w, idx) => ({
                    word: w.term,
                    correctMeaning: w.meaning,
                    studentInput: finalAnswers[idx] || ''
                }));

                const res = await fetch('/api/grade-vocab-ko', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });

                if (!res.ok) throw new Error('AI grading failed');
                const data = await res.json();
                const results: Record<number, boolean> = data.results || {};

                // Calculate score from AI results
                let correctCount = 0;
                words.forEach((_, idx) => {
                    if (results[idx]) correctCount++;
                });
                const score = Math.round((correctCount / words.length) * 100);

                setAiGradingResults(results);
                setTestScore(score);
                setMode('result');
                const nextAttempt = attemptCount + 1;
                setAttemptCount(nextAttempt);
                setIsStudied(true);

                // Save to DB
                await dbService.addSubmission({
                    studentId: student.id,
                    studentName: student.name,
                    classId: student.classId,
                    assignmentId: assignment.id,
                    assignmentTitle: assignment.title,
                    attempt: nextAttempt,
                    score: score,
                    details: [{ type: 'typing-ko-ai-graded' }],
                    answers: Object.entries(finalAnswers).map(([k, v]) => ({ index: Number(k), value: v }))
                } as any);

                localStorage.removeItem(draftKey);
                toast.success(`AI 채점 완료!\n점수: ${score}점`);
            } catch (error) {
                console.error('[typing-ko] AI grading error:', error);
                toast.error('AI 채점에 실패했습니다. 다시 시도해주세요.');
                setMode('test'); // Fall back to test so they can try again
            }
            return;
        }

        // ★ Non-AI modes: original logic
        let correctCount = 0;
        words.forEach((w, idx) => {
            const answer = finalAnswers[idx] || '';
            const isReverse = testMode === 'reverse' || testMode === 'typing';

            if (isReverse) {
                if (answer.trim().toLowerCase() === w.term.trim().toLowerCase()) correctCount++;
            } else {
                if (answer === w.meaning) correctCount++;
            }
        });
        const score = Math.round((correctCount / words.length) * 100);

        setTestAnswers(finalAnswers);
        setTestScore(score);
        setAiGradingResults(null); // Clear any old AI results
        setMode('result');
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);
        setIsStudied(true);

        // Save to DB
        await dbService.addSubmission({
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            attempt: nextAttempt,
            score: score,
            details: [],
            answers: Object.entries(finalAnswers).map(([k, v]) => ({ index: Number(k), value: v }))
        } as any);

        // Clear draft on test completion
        localStorage.removeItem(draftKey);

        toast.success(`테스트가 완료되었습니다.\n점수: ${score}점`);
    };

    const handleStudyComplete = async () => {
        if (confirm('학습을 완료했습니다. 바로 테스트를 보시겠습니까?')) {
            setMode('test');
        } else {
            setMode('overview');
        }

        setIsStudied(true);
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);

        await dbService.addSubmission({
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            attempt: nextAttempt,
            score: -1,
            details: [{ type: 'study_complete' }],
            answers: []
        } as any);
    };

    const handleRetry = (onlyWrong: boolean = false) => {
        if (onlyWrong) {
            const config = assignment.vocabConfig || { studyMode: 'selection', failMode: 'restart', testMode: 'default' };
            const testMode = config.testMode || 'default';

            const wrongWords = words.filter((w, idx) => {
                // ★ typing-ko: Use AI grading results
                if (testMode === 'typing-ko' && aiGradingResults) {
                    return !aiGradingResults[idx];
                }

                const isReverse = testMode === 'reverse' || testMode === 'typing';
                const answer = testAnswers[idx];
                if (!answer) return true;

                if (isReverse) {
                    return answer.trim().toLowerCase() !== w.term.trim().toLowerCase();
                } else {
                    return answer !== w.meaning;
                }
            });

            if (wrongWords.length > 0) {
                setWords(wrongWords);
            } else {
                toast.info('틀린 문제가 없거나 모든 문제를 맞추셨습니다.');
                setWords(baseWords);
            }
        } else {
            setWords(baseWords);
        }

        // Reset test state
        setTestAnswers({});
        setTestScore(0);
        setTestCurrentIndex(0);
        setShuffleOrder(undefined);
        setAiGradingResults(null);
        setMode('test');
    };



    if (mode === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (mode === 'grading') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0A0E27] flex flex-col items-center justify-center" style={{ top: 0, left: 0, width: '100vw', height: '100vh' }}>
                <div className="w-20 h-20 bg-[#083973] rounded-[1.2rem] flex items-center justify-center p-2 shadow-2xl shadow-blue-900/30 overflow-hidden animate-pulse mb-6">
                    <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">AI 채점 중...</h2>
                    <p className="text-sm text-slate-400">
                        입력하신 뜻을 AI가 분석하고 있습니다.<br />
                        유의어와 문맥을 고려하여 채점합니다.
                    </p>
                </div>
                <div className="mt-4 flex justify-center gap-1">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        );
    }

    if (mode === 'selector') {
        return <VocabSelector words={assignment.words || []} onSubmit={handleSelectionSubmit} onExit={onExit} />;
    }

    if (mode === 'pending') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-sm w-full">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">선생님 확인 대기중</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        선택하신 단어 리스트를 선생님이 확인하고 있습니다.<br />
                        승인이 완료되면 학습을 시작할 수 있습니다.
                    </p>
                    <button onClick={onExit} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">
                        나가기
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'rejected') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-sm w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">선택이 반려되었습니다</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        선생님이 단어 재선택을 요청하셨습니다.<br />
                        (너무 적은 단어를 선택했거나, 다시 검토가 필요합니다.)
                    </p>
                    <button onClick={() => setMode('selector')} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-all">
                        다시 선택하기
                    </button>
                    <button onClick={onExit} className="mt-3 w-full py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl">
                        나가기
                    </button>
                </div>
            </div>
        );
    }

    const config = assignment.vocabConfig || { studyMode: 'selection', failMode: 'restart', testMode: 'default' };
    const currentTestMode = config.testMode || 'default';


    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <ErrorBoundary>
                {mode === 'overview' && (
                    <VocabOverview
                        title={assignment.title}
                        words={words}
                        config={config}
                        isStudied={isStudied}
                        onStartStudy={() => setMode('study')}
                        onStartTest={() => setMode('test')}
                        onExit={onExit}
                    />
                )}

                {mode === 'study' && (
                    <FlashcardStudy
                        words={words}
                        onFinish={handleStudyComplete}
                        onExit={() => setMode('overview')}
                    />
                )}

                {mode === 'test' && (
                    <VocabTest
                        words={words}
                        allWords={assignment.words || []}
                        testMode={currentTestMode}
                        onComplete={handleTestComplete}
                        onExit={() => setMode('overview')}
                        initialAnswers={Object.keys(testAnswers).length > 0 ? testAnswers : undefined}
                        initialIndex={testCurrentIndex > 0 ? testCurrentIndex : undefined}
                        initialShuffleOrder={shuffleOrder}
                        onShuffleReady={(order) => setShuffleOrder(order)}
                        onAnswerUpdate={(answers, idx) => {
                            setTestAnswers(answers);
                            setTestCurrentIndex(idx);
                        }}
                    />
                )}

                {mode === 'result' && (
                    <VocabResult
                        score={testScore}
                        words={words}
                        finalAnswers={testAnswers}
                        testMode={currentTestMode}
                        aiResults={aiGradingResults}
                        onRetry={handleRetry}
                        onExit={onExit}
                        onOverview={() => {
                            setWords(baseWords);
                            setMode('overview');
                        }}
                    />
                )}
            </ErrorBoundary>
        </div>
    );
}
