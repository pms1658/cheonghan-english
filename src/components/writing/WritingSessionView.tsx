'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WritingSession, WritingTheme, WritingLevel, TargetGrade, LEVELS, GRADES } from '@/data/writingModules';
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

interface Props {
    session: WritingSession;
    theme: WritingTheme;
    level: WritingLevel;
    targetGrade: TargetGrade;
    onBack: () => void;
}

export default function WritingSessionView({ session, theme, level, targetGrade, onBack }: Props) {
    const levelConfig = LEVELS.find(l => l.id === level)!;

    // States
    const [phase, setPhase] = useState<'intro' | 'practice' | 'complete'>('intro');
    const [problems, setProblems] = useState<WritingProblem[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [studentAnswer, setStudentAnswer] = useState('');
    const [isGrading, setIsGrading] = useState(false);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
    const [scores, setScores] = useState<number[]>([]);
    const [showAnswer, setShowAnswer] = useState(false);

    // Generate problems
    const handleGenerateProblems = useCallback(async () => {
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
                    level,
                    targetGrade,
                    problemCount: session.problemCount,
                    bidirectional: session.bidirectional,
                })
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            setProblems(data.problems || []);
            setPhase('practice');
            setCurrentIdx(0);
            setScores([]);
        } catch (err: any) {
            toast.error('문제 생성에 실패했습니다: ' + (err.message || ''));
        } finally {
            setIsGenerating(false);
        }
    }, [session, level]);

    // Grade answer
    const handleSubmit = useCallback(async () => {
        if (!studentAnswer.trim() || !problems[currentIdx]) return;
        setIsGrading(true);
        setGradeResult(null);
        try {
            const problem = problems[currentIdx];
            const res = await fetch('/api/grade-writing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetGrammar: `${session.title} (${session.formula})`,
                    koreanSentence: problem.korean,
                    studentAnswer: studentAnswer.trim(),
                    correctAnswer: problem.answer,
                })
            });
            if (!res.ok) throw new Error('Grading failed');
            const data = await res.json();
            setGradeResult(data);
            setScores(prev => [...prev, data.score]);
        } catch (err: any) {
            toast.error('채점에 실패했습니다: ' + (err.message || ''));
        } finally {
            setIsGrading(false);
        }
    }, [studentAnswer, problems, currentIdx, session]);

    // Next problem
    const handleNext = () => {
        if (currentIdx + 1 >= problems.length) {
            setPhase('complete');
        } else {
            setCurrentIdx(prev => prev + 1);
            setStudentAnswer('');
            setGradeResult(null);
            setShowAnswer(false);
        }
    };

    // Retry same problem
    const handleRetry = () => {
        setStudentAnswer('');
        setGradeResult(null);
        setShowAnswer(false);
        // Remove last score
        setScores(prev => prev.slice(0, -1));
    };

    const currentProblem = problems[currentIdx];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const isPassed = gradeResult ? gradeResult.score >= levelConfig.passScore : false;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900">{session.title}</h1>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accentHex }}>
                                {theme.icon} Theme {theme.id} · {levelConfig.icon} {levelConfig.name}
                            </span>
                        </div>
                    </div>
                    {phase === 'practice' && (
                        <div className="text-xs font-bold text-slate-400">
                            {currentIdx + 1} / {problems.length}
                        </div>
                    )}
                </div>
                {/* Progress bar */}
                {phase === 'practice' && (
                    <div className="h-1 bg-slate-100">
                        <motion.div
                            className="h-full"
                            style={{ backgroundColor: theme.accentHex }}
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIdx + (gradeResult ? 1 : 0)) / problems.length) * 100}%` }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>
                )}
            </header>

            <div className="max-w-3xl mx-auto p-4">
                <AnimatePresence mode="wait">
                    {/* --- INTRO PHASE --- */}
                    {phase === 'intro' && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Session Info Card */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50">
                                <div className="flex items-center gap-3 mb-6">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                                        style={{ backgroundColor: theme.accentHex }}
                                    >
                                        {session.id}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">{session.title}</h2>
                                        <span className="text-xs text-slate-400">{session.titleEn}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📖 설명</h3>
                                    <p className="text-sm text-slate-700 leading-relaxed">{session.description}</p>
                                </div>

                                {/* Formula */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📐 공식</h3>
                                    <div className="bg-slate-900 rounded-2xl px-6 py-4">
                                        <code className="text-sm font-mono text-slate-100 font-bold">{session.formula}</code>
                                    </div>
                                </div>

                                {/* Example */}
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
                            </div>

                            {/* Start Button */}
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
                                    `연습 시작 · ${session.problemCount}문제`
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* --- PRACTICE PHASE --- */}
                    {phase === 'practice' && currentProblem && (
                        <motion.div
                            key={`problem-${currentIdx}`}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-5"
                        >
                            {/* Problem Card */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-lg shadow-slate-100/50">
                                <div className="flex items-center justify-between mb-5">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Question {currentIdx + 1}
                                    </span>
                                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: `${theme.accentHex}15`, color: theme.accentHex }}>
                                        {currentProblem.keyGrammar}
                                    </span>
                                </div>

                                {/* Korean sentence */}
                                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                                    <p className="text-lg text-slate-900 font-bold leading-relaxed">
                                        {currentProblem.korean}
                                    </p>
                                </div>

                                {/* Answer Input */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Answer</label>
                                    <textarea
                                        value={studentAnswer}
                                        onChange={e => setStudentAnswer(e.target.value)}
                                        disabled={!!gradeResult}
                                        placeholder="영어로 작성하세요..."
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none resize-none disabled:opacity-60 transition-all"
                                        rows={3}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey && !gradeResult && studentAnswer.trim()) {
                                                e.preventDefault();
                                                handleSubmit();
                                            }
                                        }}
                                    />
                                </div>

                                {/* Submit Button */}
                                {!gradeResult && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isGrading || !studentAnswer.trim()}
                                        className="w-full mt-4 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isGrading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                채점 중...
                                            </>
                                        ) : '제출하기'}
                                    </button>
                                )}
                            </div>

                            {/* Grade Result */}
                            <AnimatePresence>
                                {gradeResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        {/* Score */}
                                        <div className={`rounded-3xl p-6 border ${isPassed
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-amber-50 border-amber-200'
                                            }`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{isPassed ? '🎉' : '💪'}</span>
                                                    <div>
                                                        <span className={`text-2xl font-black ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {gradeResult.score}점
                                                        </span>
                                                        <span className={`ml-2 text-xs font-bold ${isPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                            {isPassed ? 'PASS ✓' : `${levelConfig.passScore}점 이상 필요`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Feedback */}
                                            <p className="text-sm text-slate-700 leading-relaxed">{gradeResult.feedback}</p>

                                            {/* Grammar Note */}
                                            {gradeResult.grammarNotes && (
                                                <div className="mt-3 px-3 py-2 bg-white/60 rounded-xl">
                                                    <span className="text-xs font-bold text-slate-500">📝 </span>
                                                    <span className="text-xs text-slate-600">{gradeResult.grammarNotes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Corrected Sentence */}
                                        {gradeResult.correctedSentence && (
                                            <div className="bg-white rounded-2xl p-5 border border-slate-100">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">정답 문장</h4>
                                                <p className="text-sm font-bold text-slate-900">{gradeResult.correctedSentence}</p>
                                            </div>
                                        )}

                                        {/* Show/Hide Answer */}
                                        <button
                                            onClick={() => setShowAnswer(!showAnswer)}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showAnswer ? '모범 답안 숨기기 ▲' : '모범 답안 보기 ▼'}
                                        </button>
                                        {showAnswer && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="bg-slate-900 rounded-2xl px-5 py-4"
                                            >
                                                <p className="text-sm font-mono text-slate-100">{currentProblem.answer}</p>
                                            </motion.div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            {!isPassed && (
                                                <button
                                                    onClick={handleRetry}
                                                    className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
                                                >
                                                    다시 풀기
                                                </button>
                                            )}
                                            <button
                                                onClick={handleNext}
                                                className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                            >
                                                {currentIdx + 1 >= problems.length ? '결과 보기' : '다음 문제 →'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* --- COMPLETE PHASE --- */}
                    {phase === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 text-center">
                                <div className="text-6xl mb-4">{avgScore >= levelConfig.passScore ? '🏆' : '💪'}</div>
                                <h2 className="text-2xl font-black text-slate-900 mb-2">세션 완료!</h2>
                                <p className="text-sm text-slate-500 mb-6">{session.title} — {levelConfig.icon} {levelConfig.name}</p>

                                {/* Average Score */}
                                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg font-black ${avgScore >= levelConfig.passScore
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-amber-50 text-amber-600'
                                    }`}>
                                    평균 {avgScore}점
                                    {avgScore >= levelConfig.passScore && <span className="text-sm">✓ PASS</span>}
                                </div>

                                {/* Score breakdown */}
                                <div className="mt-6 flex justify-center gap-2 flex-wrap">
                                    {scores.map((s, i) => (
                                        <div
                                            key={i}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${s >= levelConfig.passScore
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}
                                        >
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setPhase('intro');
                                        setProblems([]);
                                        setScores([]);
                                        setGradeResult(null);
                                        setStudentAnswer('');
                                    }}
                                    className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    다시 연습하기
                                </button>
                                <button
                                    onClick={onBack}
                                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    목록으로 돌아가기
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
