'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/services/db';
import { VariantProblem, VariantSession } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TransformAssignmentProps {
    assignment: any;
    studentId: string;
    studentName: string;
    classId: string; // Added classId
    onComplete?: () => void;
}

export default function TransformAssignment({
    assignment,
    studentId,
    studentName,
    classId,
    onComplete
}: TransformAssignmentProps) {
    const [mode, setMode] = useState<'test' | 'result' | 'retry'>('test');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
    const [sessions, setSessions] = useState<VariantSession[]>([]);
    const [currentSession, setCurrentSession] = useState<VariantSession | null>(null);
    const [showExplanations, setShowExplanations] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const searchParams = useSearchParams();
    const viewAttempt = searchParams.get('viewAttempt');

    const problems: VariantProblem[] = assignment.variantProblems || [];

    const loadSessions = useCallback(async () => {
        try {
            const allSubmissions = await dbService.getSubmissions();
            const mySessions = allSubmissions
                .filter(s => {
                    const submission = s as any; // Type assertion for custom fields
                    return submission.assignmentId === assignment.id &&
                        submission.studentId === studentId &&
                        submission.type === 'variant_session';
                })
                .sort((a, b) => ((a as any).attemptNumber || 0) - ((b as any).attemptNumber || 0));

            setSessions(mySessions as any[]);

            // Initialize answers array
            if (currentAnswers.length === 0) {
                setCurrentAnswers(new Array(problems.length).fill(-1));
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }, [assignment.id, studentId, problems.length, currentAnswers.length]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // [New] Handle viewAttempt for history viewing
    useEffect(() => {
        if (viewAttempt && sessions.length > 0) {
            const target = sessions.find(s => (s as any).attemptNumber === Number(viewAttempt) || s.attemptNumber === Number(viewAttempt));
            if (target) {
                setCurrentSession(target);
                setMode('result');
                setShowExplanations(true);
            }
        }
    }, [viewAttempt, sessions]);

    useEffect(() => {
        let interval: any;
        if (isActive && mode !== 'result') {
            interval = setInterval(() => {
                setTimeLeft(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, mode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startTest = () => {
        setIsActive(true);
        setTimeLeft(0);
        setCurrentIdx(0);
    };

    const handleAnswerChange = (problemIndex: number, choiceIndex: number) => {
        const newAnswers = [...currentAnswers];
        newAnswers[problemIndex] = choiceIndex;
        setCurrentAnswers(newAnswers);
    };

    const calculateScore = (answers: number[]) => {
        let score = 0;
        problems.forEach((problem, idx) => {
            if (answers[idx] === problem.correctAnswer) {
                score += problem.points;
            }
        });
        return score;
    };

    const getIncorrectProblems = (answers: number[]) => {
        const incorrect: number[] = [];
        problems.forEach((problem, idx) => {
            if (answers[idx] !== problem.correctAnswer) {
                incorrect.push(idx);
            }
        });
        return incorrect;
    };

    const handleSubmit = async () => {
        if (currentAnswers.some(a => a === -1)) {
            if (!confirm('일부 문제를 풀지 않았습니다. 제출하시겠습니까?')) {
                return;
            }
        }

        const score = calculateScore(currentAnswers);
        const incorrectProblems = getIncorrectProblems(currentAnswers);

        const newSession: VariantSession = {
            id: `session_${Date.now()}`,
            assignmentId: assignment.id,
            studentId,
            studentName,
            attemptNumber: sessions.length + 1,
            answers: currentAnswers,
            score,
            incorrectProblems,
            completedAt: Date.now(),
            isRetry: mode === 'retry'
        };

        try {
            // Store as regular submission with custom type
            await dbService.addSubmission({
                assignmentId: assignment.id,
                assignmentTitle: assignment.title, // Added title
                studentId,
                studentName,
                classId, // Added classId
                attempt: newSession.attemptNumber,
                answers: currentAnswers,
                score,
                status: 'passed',
                type: 'variant_session' as any,
                details: newSession
            } as any);

            setCurrentSession(newSession);
            setSessions([...sessions, newSession]);
            setMode('result');

        } catch (error) {
            toast.error('제출 중 오류가 발생했습니다.');
            console.error(error);
        }
    };

    const handleRetryWrong = () => {
        if (!currentSession || currentSession.incorrectProblems.length === 0) {
            toast.info('오답이 없습니다!');
            return;
        }
        // Reset navigation and timer for retry
        setCurrentIdx(0);
        setTimeLeft(0);
        setIsActive(true);
        setMode('retry');
        // Reset only wrong answers
        const retryAnswers = [...currentSession.answers];
        currentSession.incorrectProblems.forEach(idx => {
            retryAnswers[idx] = -1;
        });
        setCurrentAnswers(retryAnswers);
    };

    const handleNewAttempt = () => {
        setMode('test');
        setCurrentAnswers(new Array(problems.length).fill(-1));
        setCurrentSession(null);
    };

    // Direction tracking for slide animation (before any early returns per React hooks rule)
    const prevIdxRef = useRef(currentIdx);
    const direction = currentIdx > prevIdxRef.current ? 1 : -1;
    if (prevIdxRef.current !== currentIdx) {
        prevIdxRef.current = currentIdx;
    }

    // Filter problems for retry mode
    const displayProblems = mode === 'retry' && currentSession
        ? problems.filter((_, idx) => currentSession.incorrectProblems.includes(idx))
        : problems;

    const displayIndices = mode === 'retry' && currentSession
        ? currentSession.incorrectProblems
        : problems.map((_, idx) => idx);

    if (problems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-xl font-bold">문제가 생성되지 않았습니다.</div>
                <p className="text-sm">관리자에게 문의해주세요.</p>
            </div>
        );
    }

    const currentProblem = displayProblems[currentIdx];
    const actualProblemIdx = displayIndices[currentIdx];

    // 유형별 한글 질문 매핑
    const getKoreanQuestion = (type: string): string => {
        const questionMap: Record<string, string> = {
            'blank': '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
            'grammar': '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
            'vocabulary': '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
            'order': '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?',
            'insertion': '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?',
            'topic': '다음 글의 주제로 가장 적절한 것은?',
            'title': '다음 글의 제목으로 가장 적절한 것은?',
            'claim': '다음 글에서 필자가 주장하는 바로 가장 적절한 것은?',
            'summary': '다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸에 들어갈 말로 가장 적절한 것은?',
            'meaning': '다음 밑줄 친 부분이 의미하는 바로 가장 적절한 것은?',
            'underline': '다음 밑줄 친 부분이 가리키는 대상이 나머지와 다른 것은?',
            'flow': '다음 글에서 전체 흐름과 관계 없는 문장은?',
            'special': '다음 글을 읽고 물음에 답하시오.',
        };
        return questionMap[type] || '다음 글을 읽고 물음에 답하시오.';
    };

    // AI가 question에 이미 넣은 한글 질문 패턴 제거 (우리가 위에서 별도로 표시하므로)
    const stripKoreanQuestion = (text: string): string => {
        if (!text) return '';
        // "다음 ~ 것은?" 또는 "다음 ~ 답하시오." 패턴 제거 (첫 줄만)
        return text
            .replace(/^[\s\n]*다음[^\n]*(?:것은\?|답하시오\.|것을 고르시오\.|고르시오\.)[\s\n]*/i, '')
            .replace(/^[\s\n]*(?:위|아래|주어진)[^\n]*(?:것은\?|답하시오\.|것을 고르시오\.)[\s\n]*/i, '')
            .trim();
    };

    const formatQuestionText = (text: string) => {
        if (!text) return '';
        return stripKoreanQuestion(text)
            .replace(/\r/g, '')
            .replace(/\[\[BOX\]\]\s*\n?/gi, "<div class='box-sentence'>")
            .replace(/\n?\s*\[\[\/BOX\]\]\n?/gi, "</div>")
            .replace(/\[\[TARGET\]\]\s*\n?/gi, "<div class='target-sentence'>")
            .replace(/\n?\s*\[\[\/TARGET\]\]\n?/gi, "</div>")
            .replace(/\[\[U\]\]/gi, "<u>")
            .replace(/\[\[\/U\]\]/gi, "</u>")
            .replace(/\[\[BR\]\]/gi, "<br/>")
            // Add subtle spacing before (A), (B), (C) paragraph markers in order-type questions
            .replace(/\n(\([A-C]\))/g, "<div style='margin-top:0.6em'></div>$1");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-200 selection:bg-blue-600/20 selection:text-slate-900">
            {/* Navy Header — Unified Design */}
            <header className="bg-[#0A0E27] sticky top-0 z-50 px-4 py-4 shadow-xl relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    {/* Row 1: Badge + Title + Meta + Exit */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                    Transform
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-white truncate">{assignment.title}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 mt-1">
                                <span className="flex items-center gap-1"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" /></svg> {formatTime(timeLeft)}</span>
                                <span className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                                <span>{displayProblems.length} PROBLEMS</span>
                            </div>
                        </div>
                        <button
                            onClick={onComplete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10 flex-shrink-0"
                        >
                            나가기
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </button>
                    </div>
                    {/* Row 2: Problem Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        {displayProblems.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIdx(idx)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full text-[11px] font-bold transition-all flex items-center justify-center ${currentIdx === idx
                                    ? 'bg-white text-[#0A0E27] shadow-sm'
                                    : currentAnswers[displayIndices[idx]] !== -1
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/20'
                                        : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                {mode !== 'result' ? (
                    <div className="flex flex-col gap-6 items-start">
                        {/* 3. Main Problem Area */}
                        <main className="flex-1 w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Problem Card with slide animation */}
                            <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={`transform-${currentIdx}`}
                                initial={{ opacity: 0, x: direction * 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction * -30 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                            >
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/30 dark:border-white/10 overflow-hidden relative transition-all">
                                <div className="absolute top-4 right-5 md:top-6 md:right-8 pointer-events-none">
                                    <span className="text-[10px] font-bold text-slate-400/60 tracking-widest uppercase">#{currentIdx + 1}</span>
                                </div>

                                <div className="p-5 md:p-8 lg:p-10">
                                    <div className="flex flex-col gap-2 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-[10px] font-semibold tracking-wide uppercase">
                                                {currentProblem.type}
                                            </span>
                                        </div>
                                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">
                                            {getKoreanQuestion(currentProblem.type)}
                                        </p>
                                    </div>

                                    {/* Passage Area - Optimized Reading Experience */}
                                    <div
                                        className="text-[16px] md:text-[17px] leading-[1.6] md:leading-[1.7] font-sans text-slate-900 dark:text-slate-200 mb-8 whitespace-pre-wrap select-text tracking-[-0.015em]"
                                        dangerouslySetInnerHTML={{ __html: formatQuestionText(currentProblem.question) }}
                                    />

                                    {/* Choice Grid - Compact & Interactive */}
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {currentProblem.choices.map((choice, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswerChange(actualProblemIdx, idx)}
                                                className={`group relative p-3.5 md:p-4 rounded-xl text-left transition-all duration-200 flex items-start gap-3 md:gap-4 border ${currentAnswers[actualProblemIdx] === idx
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span className={`w-6 h-6 md:w-6 md:h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors ${currentAnswers[actualProblemIdx] === idx
                                                    ? 'bg-white text-blue-600'
                                                    : 'bg-slate-300 text-white group-hover:bg-slate-500'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`text-[14px] md:text-[15px] font-medium leading-snug pt-0.5 ${currentAnswers[actualProblemIdx] === idx ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                                                    {choice}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Navigation Footer - Simplified */}
                                <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200/30 dark:border-white/10 px-5 py-4 flex items-center justify-between">
                                    <button
                                        onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                        disabled={currentIdx === 0}
                                        className="text-[13px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1.5 px-2 py-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        Back
                                    </button>

                                    {currentIdx === displayProblems.length - 1 ? (
                                        <button
                                            onClick={handleSubmit}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13px] font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
                                        >
                                            Submit
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setCurrentIdx(prev => prev + 1)}
                                            className="px-5 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-full text-[13px] font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
                                        >
                                            Next
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            </motion.div>
                            </AnimatePresence>

                            {/* Mobile Indicator */}
                            <div className="md:hidden flex justify-center gap-1.5 py-2 overflow-x-auto px-4 hide-scrollbar">
                                {displayProblems.map((_, idx) => (
                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${currentIdx === idx ? 'bg-blue-600' : currentAnswers[displayIndices[idx]] !== -1 ? 'bg-blue-600/40' : 'bg-slate-300'}`} />
                                ))}
                            </div>
                        </main>
                    </div>
                ) : (
                    /* 4. Result Mode - Compact & Clean */
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        {/* Score Board */}
                        <div className="bg-white dark:bg-slate-900 px-8 py-10 md:py-12 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center relative overflow-hidden border border-slate-200/30 dark:border-white/10">
                            <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">Assessment Complete</h2>
                            <div className="flex flex-col items-center justify-center relative z-10">
                                <div className={`text-[64px] md:text-[80px] font-semibold leading-none tracking-tighter ${currentSession?.score === 100 ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                                    {currentSession?.score}
                                </div>
                                <div className="text-[13px] font-medium text-slate-500 mt-2">Total Score</div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
                                <button
                                    onClick={onComplete}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-full text-[13px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    과제방으로 돌아가기
                                </button>
                                {currentSession && currentSession.incorrectProblems.length > 0 && (
                                    <button
                                        onClick={handleRetryWrong}
                                        className="px-6 py-3 bg-amber-500 text-white rounded-full text-[13px] font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm shadow-amber-200"
                                    >
                                        Retry Wrong ({currentSession.incorrectProblems.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowExplanations(!showExplanations)}
                                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[13px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-sm"
                                >
                                    {showExplanations ? '해설 닫기' : '정답 및 해설 분석'}
                                </button>
                            </div>
                        </div>

                        {/* Explanation List */}
                        {showExplanations && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500 pb-12">
                                {problems.map((prob, idx) => {
                                    const isCorrect = currentSession?.answers[idx] === prob.correctAnswer;
                                    return (
                                        <div key={prob.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-200/30 dark:border-white/10">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isCorrect ? 'Correct' : 'Incorrect'}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide opacity-80">{prob.type}</div>
                                            </div>
                                            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-3">{getKoreanQuestion(prob.type)}</p>

                                            <div
                                                className="text-[15px] leading-relaxed text-slate-900 dark:text-slate-200 mb-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200/30 dark:border-white/10 whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{ __html: formatQuestionText(prob.question) }}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                                {prob.choices.map((choice, cIdx) => (
                                                    <div key={cIdx} className={`px-4 py-3 rounded-xl text-[13px] font-medium flex gap-3 ${cIdx === prob.correctAnswer
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                                        : cIdx === currentSession?.answers[idx]
                                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-500/20'
                                                            : 'bg-transparent text-slate-500'
                                                        }`}>
                                                        <span className="opacity-70">{cIdx + 1}.</span>
                                                        <span className="flex-1">{choice}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {prob.explanation && (
                                                <div className="pt-4 border-t border-slate-200/30 dark:border-white/10">
                                                    <div className="text-[11px] font-bold text-blue-600 uppercase mb-2">Analysis</div>
                                                    <div className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 bg-blue-600/5 dark:bg-blue-600/10 p-4 rounded-xl">{prob.explanation}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style jsx global>{`
                .target-sentence { border: 1.5px solid #e2e8f0; padding: 12px; margin-bottom: 12px; font-family: inherit; border-radius: 8px; background: #f8fafc; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                .box-sentence { border: 1.5px solid #e2e8f0; padding: 12px; margin-bottom: 12px; font-family: inherit; border-radius: 8px; background: #f8fafc; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                :is(.dark) .target-sentence { border-color: rgba(255,255,255,0.1); background: rgb(30 41 59); color: #e2e8f0; }
                :is(.dark) .box-sentence { border-color: rgba(255,255,255,0.1); background: rgb(30 41 59); color: #e2e8f0; }
                u { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; text-decoration-color: #1d1d1f; }
                :is(.dark) u { text-decoration-color: #94a3b8; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
