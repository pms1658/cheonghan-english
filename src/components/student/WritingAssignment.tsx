'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { getSessionById, getThemeById, LEVELS, WritingLevel } from '@/data/writingModules';
import { dbService } from '@/services/db';
import { Assignment } from '@/types';
import { toast } from 'sonner';

interface WritingProblem {
    id: number;
    korean: string;
    answer: string;
    keyGrammar: string;
}

interface GradeResult {
    score: number;
    feedback: string;
    correctedSentence: string;
    grammarNotes: string;
}

interface ProblemResult {
    problemIdx: number;
    korean: string;
    studentAnswer: string;
    correctAnswer: string;
    score: number;
    feedback: string;
    correctedSentence: string;
    grammarNotes: string;
    keyGrammar: string;
}

interface WritingAssignmentProps {
    assignment: Assignment;
    studentId: string;
    studentName: string;
    classId: string;
    onComplete: () => void;
}

type Phase = 'intro' | 'test' | 'grading' | 'results' | 'retry';

export default function WritingAssignment({ assignment, studentId, studentName, classId, onComplete }: WritingAssignmentProps) {
    const config = assignment.writingConfig;
    const session = config ? getSessionById(config.sessionId) : null;
    const theme = session ? getThemeById(session.themeId) : null;
    const levelConfig = config ? LEVELS.find(l => l.id === config.level) : null;

    // States
    const [phase, setPhase] = useState<Phase>('intro');
    const [problems, setProblems] = useState<WritingProblem[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [attemptCount, setAttemptCount] = useState(0);

    // Results
    const [firstAttemptResults, setFirstAttemptResults] = useState<ProblemResult[]>([]);
    const [retryResults, setRetryResults] = useState<ProblemResult[]>([]);
    const [retryIndices, setRetryIndices] = useState<number[]>([]);
    const [retryRound, setRetryRound] = useState(0);

    // Load previous attempt count
    useEffect(() => {
        if (!assignment?.id || !studentId) return;
        const loadAttempts = async () => {
            try {
                const subs = await dbService.getStudentSubmissions(studentId);
                const count = subs.filter(s => s.assignmentId === assignment.id).length;
                setAttemptCount(count);
            } catch (e) { console.error(e); }
        };
        loadAttempts();
    }, [assignment?.id, studentId]);

    // Generate problems
    const handleGenerateProblems = useCallback(async () => {
        if (!session || !config) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/generate-writing-problems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionTitle: session.title,
                    sessionFormula: session.formula,
                    sessionDescription: session.description,
                    sessionExample: `${session.exampleKo} → ${session.exampleEn}`,
                    level: config.level,
                    targetGrade: config.targetGrade,
                    problemCount: config.problemCount,
                    bidirectional: session.bidirectional,
                })
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            const generated = data.problems || [];
            setProblems(generated);
            setStudentAnswers(new Array(generated.length).fill(''));
            setPhase('test');
            setCurrentIdx(0);
            setFirstAttemptResults([]);
            setRetryResults([]);
            setRetryIndices([]);
            setRetryRound(0);
        } catch (err: any) {
            toast.error('문제 생성에 실패했습니다: ' + (err.message || ''));
        } finally {
            setIsGenerating(false);
        }
    }, [session, config]);

    // Batch grade all answers
    const handleBatchGrade = useCallback(async (answersToGrade: string[], problemsToGrade: WritingProblem[], isRetry = false) => {
        if (!session || !config) return;
        setPhase('grading');

        try {
            const res = await fetch('/api/grade-writing-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    problems: problemsToGrade.map((p, i) => ({
                        korean: p.korean,
                        studentAnswer: answersToGrade[i]?.trim() || '(미작성)',
                        correctAnswer: p.answer,
                        keyGrammar: p.keyGrammar,
                    })),
                    targetGrammar: `${session.title} (${session.formula})`,
                    level: config.level,
                })
            });

            if (!res.ok) throw new Error('Grading failed');
            const data = await res.json();

            const results: ProblemResult[] = (data.results || []).map((r: GradeResult, i: number) => ({
                problemIdx: isRetry ? retryIndices[i] : i,
                korean: problemsToGrade[i].korean,
                studentAnswer: answersToGrade[i]?.trim() || '(미작성)',
                correctAnswer: problemsToGrade[i].answer,
                score: r.score,
                feedback: r.feedback,
                correctedSentence: r.correctedSentence,
                grammarNotes: r.grammarNotes,
                keyGrammar: problemsToGrade[i].keyGrammar,
            }));

            if (isRetry) {
                setRetryResults(results);
            } else {
                setFirstAttemptResults(results);
            }
            setPhase('results');
        } catch (err: any) {
            toast.error('채점에 실패했습니다: ' + (err.message || ''));
            setPhase('test');
        }
    }, [session, config, retryIndices]);

    // Submit all answers for grading
    const handleSubmitAll = () => {
        const unanswered = studentAnswers.filter(a => !a.trim()).length;
        if (unanswered > 0) {
            if (!confirm(`${unanswered}개 문제가 미작성입니다. 그래도 제출하시겠습니까?`)) return;
        }
        handleBatchGrade(studentAnswers, problems, false);
    };

    // Start retry with failed problems
    const handleStartRetry = () => {
        const currentResults = retryRound === 0 ? firstAttemptResults : retryResults;
        const failIdx = currentResults
            .filter(r => r.score < 90)
            .map(r => r.problemIdx);

        if (failIdx.length === 0) {
            toast.success('모든 문제가 90점 이상입니다!');
            return;
        }

        setRetryIndices(failIdx);
        setStudentAnswers(new Array(failIdx.length).fill(''));
        setCurrentIdx(0);
        setRetryRound(prev => prev + 1);
        setPhase('retry');
    };

    // Submit retry answers
    const handleSubmitRetry = () => {
        const retryProblems = retryIndices.map(i => problems[i]);
        handleBatchGrade(studentAnswers, retryProblems, true);
    };

    // Save to DB and exit
    const handleSaveAndExit = async () => {
        setIsSaving(true);
        try {
            const firstAvg = firstAttemptResults.length > 0
                ? Math.round(firstAttemptResults.reduce((a, b) => a + b.score, 0) / firstAttemptResults.length)
                : 0;

            const submission: any = {
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                studentId,
                studentName,
                classId,
                attempt: attemptCount + 1,
                answers: firstAttemptResults.map(r => r.studentAnswer),
                score: firstAvg,
                status: firstAvg >= 90 ? 'passed' : 'failed',
                details: firstAttemptResults,
                type: 'writing_session',
            };

            // Add retry data if exists
            if (retryResults.length > 0) {
                const retryAvg = Math.round(retryResults.reduce((a, b) => a + b.score, 0) / retryResults.length);
                submission.retryAnswers = retryResults.map(r => r.studentAnswer);
                submission.retryDetails = retryResults;
                submission.retryScore = retryAvg;
                submission.retryRounds = retryRound;
            }

            await dbService.addSubmission(submission);
            onComplete();
        } catch (error) {
            toast.error('제출 중 오류가 발생했습니다.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    // Early return guards
    if (!config) return <div className="min-h-screen flex items-center justify-center text-slate-500">구조작문 설정을 찾을 수 없습니다.</div>;
    if (!session || !theme || !levelConfig) return <div className="min-h-screen flex items-center justify-center text-slate-500">세션 데이터를 찾을 수 없습니다.</div>;

    // Computed
    const isTestPhase = phase === 'test' || phase === 'retry';
    const activeProblems = phase === 'retry' ? retryIndices.map(i => problems[i]) : problems;
    const currentProblem = activeProblems[currentIdx];
    const displayResults = retryRound > 0 && retryResults.length > 0 ? retryResults : firstAttemptResults;
    const displayAvg = displayResults.length > 0 ? Math.round(displayResults.reduce((a, b) => a + b.score, 0) / displayResults.length) : 0;
    const firstAvg = firstAttemptResults.length > 0 ? Math.round(firstAttemptResults.reduce((a, b) => a + b.score, 0) / firstAttemptResults.length) : 0;
    const hasFailedProblems = displayResults.some(r => r.score < 90);

    // Progress for header
    const progressText = isTestPhase
        ? `${currentIdx + 1} / ${activeProblems.length}`
        : displayResults.length > 0 ? `${displayAvg}점` : '';

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Navy Header */}
            <header className="bg-[#0A0E27] sticky top-0 z-30 relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="max-w-3xl mx-auto px-4 py-4 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-purple-400/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                                    Writing
                                </span>
                                {phase === 'retry' && (
                                    <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                        재도전 {retryRound}회
                                    </span>
                                )}
                            </div>
                            <h1 className="text-lg font-bold text-white truncate">{assignment.title}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 mt-1">
                                <span style={{ color: theme.accentHex }}>
                                    {theme.icon} {session.title}
                                </span>
                                <span className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                                <span>{levelConfig.icon} {levelConfig.name}</span>
                                {progressText && (
                                    <>
                                        <span className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                                        <span>{progressText}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (isTestPhase && studentAnswers.some(a => a.trim())) {
                                    if (!confirm('작성한 답안이 있습니다. 정말 나가시겠습니까?')) return;
                                }
                                onComplete();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10 flex-shrink-0"
                        >
                            나가기
                        </button>
                    </div>
                </div>
                {/* Progress bar */}
                {isTestPhase && (
                    <div className="h-1 bg-white/10">
                        <div
                            className="h-full transition-all duration-400"
                            style={{
                                backgroundColor: phase === 'retry' ? '#f59e0b' : theme.accentHex,
                                width: `${((studentAnswers.filter(a => a.trim()).length) / activeProblems.length) * 100}%`
                            }}
                        />
                    </div>
                )}
            </header>

            <div className="max-w-3xl mx-auto p-4">
                {/* ═══════════ INTRO PHASE ═══════════ */}
                {phase === 'intro' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                                    style={{ backgroundColor: theme.accentHex }}>
                                    {session.id}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{session.title}</h2>
                                    <span className="text-xs text-slate-400">{session.titleEn}</span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📖 설명</h3>
                                <p className="text-sm text-slate-700 leading-relaxed">{session.description}</p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📐 공식</h3>
                                <div className="bg-slate-900 rounded-2xl px-6 py-4">
                                    <code className="text-sm font-mono text-slate-100 font-bold">{session.formula}</code>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">💡 예문</h3>
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-bold text-slate-400 text-xs mr-2">KO</span>
                                        {session.exampleKo}
                                    </p>
                                    <p className="text-sm font-bold" style={{ color: theme.accentHex }}>
                                        <span className="font-bold text-slate-400 text-xs mr-2">EN</span>
                                        {session.exampleEn}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                                <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold">{levelConfig.icon} {levelConfig.name}</span>
                                <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold">{config.problemCount}문제</span>
                                <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold">통과: 90점</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateProblems}
                            disabled={isGenerating}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    AI가 문제를 만들고 있습니다...
                                </>
                            ) : (
                                `시험 시작 · ${config.problemCount}문제`
                            )}
                        </button>
                    </div>
                )}

                {/* ═══════════ TEST / RETRY PHASE ═══════════ */}
                {isTestPhase && currentProblem && (
                    <div className="space-y-5 animate-fadeIn">
                        {/* Problem Number Navigation */}
                        <div className="flex justify-center gap-2">
                            {activeProblems.map((_, idx) => {
                                const isCurrent = idx === currentIdx;
                                const hasAnswer = studentAnswers[idx]?.trim().length > 0;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIdx(idx)}
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-200 ${
                                            isCurrent
                                                ? 'bg-slate-900 text-white shadow-lg scale-110'
                                                : hasAnswer
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                    : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Problem Card */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-lg shadow-slate-100/50">
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Question {currentIdx + 1}
                                    {phase === 'retry' && <span className="ml-1 text-amber-500">(재도전)</span>}
                                </span>
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                                    style={{ backgroundColor: `${theme.accentHex}15`, color: theme.accentHex }}>
                                    {currentProblem.keyGrammar}
                                </span>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                                <p className="text-lg text-slate-900 font-bold leading-relaxed">
                                    {currentProblem.korean}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Answer</label>
                                <textarea
                                    value={studentAnswers[currentIdx] || ''}
                                    onChange={e => {
                                        const newAnswers = [...studentAnswers];
                                        newAnswers[currentIdx] = e.target.value;
                                        setStudentAnswers(newAnswers);
                                    }}
                                    placeholder="영어로 작성하세요..."
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none resize-none transition-all"
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                disabled={currentIdx === 0}
                                className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-30"
                            >
                                ← 이전
                            </button>
                            {currentIdx < activeProblems.length - 1 ? (
                                <button
                                    onClick={() => setCurrentIdx(prev => prev + 1)}
                                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    다음 →
                                </button>
                            ) : (
                                <button
                                    onClick={phase === 'retry' ? handleSubmitRetry : handleSubmitAll}
                                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    전체 제출
                                </button>
                            )}
                        </div>

                        {/* Quick status */}
                        <p className="text-center text-xs text-slate-400">
                            {studentAnswers.filter(a => a.trim()).length} / {activeProblems.length} 작성 완료
                        </p>
                    </div>
                )}

                {/* ═══════════ GRADING PHASE ═══════════ */}
                {phase === 'grading' && (
                    <div className="fixed inset-0 z-[100] bg-[#0A0E27] flex flex-col items-center justify-center" style={{ top: 0, left: 0, width: '100vw', height: '100vh' }}>
                        <div className="w-20 h-20 bg-[#083973] rounded-[1.2rem] flex items-center justify-center p-2 shadow-2xl shadow-blue-900/30 overflow-hidden animate-pulse mb-6">
                            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white mb-2">AI 채점 중...</h2>
                            <p className="text-sm text-slate-400">
                                {activeProblems.length}개 문제를 한꺼번에 채점하고 있습니다...
                            </p>
                        </div>
                        <div className="mt-4 flex justify-center gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════ RESULTS PHASE ═══════════ */}
                {phase === 'results' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Score Summary */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 text-center">
                            <div className="text-6xl mb-4">{displayAvg >= 90 ? '🏆' : '💪'}</div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">
                                {retryRound > 0 ? `재도전 ${retryRound}회차 결과` : '채점 완료!'}
                            </h2>
                            <p className="text-sm text-slate-500 mb-6">{assignment.title}</p>

                            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg font-black ${
                                displayAvg >= 90
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-amber-50 text-amber-600'
                            }`}>
                                {retryRound > 0 ? '재도전 ' : ''}평균 {displayAvg}점
                                {displayAvg >= 90 && <span className="text-sm">✓ PASS</span>}
                            </div>

                            {/* Show first attempt score if in retry */}
                            {retryRound > 0 && (
                                <p className="mt-3 text-xs text-slate-400">
                                    1차 시도 평균: {firstAvg}점
                                </p>
                            )}

                            {/* Score dots */}
                            <div className="mt-6 flex justify-center gap-2 flex-wrap">
                                {displayResults.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                                            r.score >= 90
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {r.score}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">상세 결과</h4>
                            {displayResults.map((r, i) => (
                                <div key={i} className={`bg-white rounded-2xl p-5 border transition-all ${
                                    r.score >= 90 ? 'border-emerald-100' : 'border-amber-100'
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500">Q{r.problemIdx + 1}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                style={{ backgroundColor: `${theme.accentHex}15`, color: theme.accentHex }}>
                                                {r.keyGrammar}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-black ${r.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {r.score}점 {r.score >= 90 ? '✓' : ''}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">문제</span>
                                            <p className="text-slate-700 font-medium mt-0.5">{r.korean}</p>
                                        </div>
                                        <div className={`rounded-xl p-3 ${r.score >= 90 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">내 답</span>
                                            <p className="text-slate-800 font-medium mt-0.5">{r.studentAnswer}</p>
                                        </div>
                                        {r.correctedSentence && (
                                            <div className="bg-blue-50 rounded-xl p-3">
                                                <span className="text-[10px] font-bold text-blue-400 uppercase">정답 문장</span>
                                                <p className="text-blue-800 font-bold mt-0.5">{r.correctedSentence}</p>
                                            </div>
                                        )}
                                        {r.feedback && (
                                            <p className="text-xs text-slate-600 leading-relaxed px-1">{r.feedback}</p>
                                        )}
                                        {r.grammarNotes && (
                                            <div className="flex items-start gap-1.5 px-1">
                                                <span className="text-xs">📝</span>
                                                <p className="text-xs text-slate-500">{r.grammarNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {hasFailedProblems && (
                                <button
                                    onClick={handleStartRetry}
                                    className="flex-1 py-3.5 bg-white border-2 border-amber-300 text-amber-700 rounded-2xl font-bold text-sm hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                    오답 재도전 ({displayResults.filter(r => r.score < 90).length}문제)
                                </button>
                            )}
                            <button
                                onClick={handleSaveAndExit}
                                disabled={isSaving}
                                className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? '저장 중...' : '제출하고 나가기'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
