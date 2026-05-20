'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { dbService } from '@/services/db';
import { SubjectiveProblem, SubjectiveAnswer, SubjectiveGradeResult } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/common/Logo';

interface SubjectiveAssignmentProps {
    assignment: any;
    studentId: string;
    studentName: string;
    classId: string;
    onComplete?: () => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
    eng_composition: { label: '영작', emoji: '✍️' },
    sentence_interpretation: { label: '해석 서술', emoji: '📖' },
    grammar_correction: { label: '어법 교정', emoji: '🔍' },
    blank_fill: { label: '빈칸 서술', emoji: '📝' },
    pronoun_reference: { label: '지칭 추론', emoji: '👆' },
    summary_completion: { label: '요약문 완성', emoji: '📋' },
    sentence_transform: { label: '문장 전환', emoji: '🔄' },
    korean_summary: { label: '한국어 요약', emoji: '🇰🇷' },
    english_answer: { label: '영어로 답하기', emoji: '🇬🇧' },
};

const GRAMMAR_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];

export default function SubjectiveAssignment({
    assignment,
    studentId,
    studentName,
    classId,
    onComplete
}: SubjectiveAssignmentProps) {
    const [mode, setMode] = useState<'test' | 'grading' | 'result'>('test');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<SubjectiveAnswer[]>([]);
    const [gradeResults, setGradeResults] = useState<SubjectiveGradeResult[]>([]);
    const [totalScore, setTotalScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(true);

    const problems: SubjectiveProblem[] = assignment.subjectiveProblems || [];

    // Initialize answers
    useEffect(() => {
        if (problems.length > 0 && answers.length === 0) {
            setAnswers(problems.map(p => {
                const base: SubjectiveAnswer = { problemId: p.id, type: p.type };
                if (p.type === 'grammar_correction') {
                    base.selectedWrong = ['', '', ''];
                    base.reasons = {};
                } else if (p.type === 'summary_completion') {
                    base.blankAnswers = {};
                } else {
                    base.textAnswer = '';
                }
                return base;
            }));
        }
    }, [problems, answers.length]);

    // Timer
    useEffect(() => {
        let interval: any;
        if (isActive && mode === 'test') {
            interval = setInterval(() => setTimeLeft(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, mode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Direction tracking for slide animation
    const prevIdxRef = useRef(currentIdx);
    const direction = currentIdx > prevIdxRef.current ? 1 : -1;
    if (prevIdxRef.current !== currentIdx) prevIdxRef.current = currentIdx;

    // Answer update helpers
    const updateTextAnswer = (idx: number, value: string) => {
        setAnswers(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], textAnswer: value };
            return next;
        });
    };

    const updateGrammarSelection = (answerIdx: number, slotIdx: number, value: string) => {
        setAnswers(prev => {
            const next = [...prev];
            const selected = [...(next[answerIdx].selectedWrong || ['', '', ''])];
            selected[slotIdx] = value;
            next[answerIdx] = { ...next[answerIdx], selectedWrong: selected };
            return next;
        });
    };

    const updateGrammarReason = (answerIdx: number, label: string, value: string) => {
        setAnswers(prev => {
            const next = [...prev];
            next[answerIdx] = {
                ...next[answerIdx],
                reasons: { ...(next[answerIdx].reasons || {}), [label]: value }
            };
            return next;
        });
    };

    const updateBlankAnswer = (answerIdx: number, label: string, value: string) => {
        setAnswers(prev => {
            const next = [...prev];
            next[answerIdx] = {
                ...next[answerIdx],
                blankAnswers: { ...(next[answerIdx].blankAnswers || {}), [label]: value }
            };
            return next;
        });
    };

    // Check if an answer slot is filled
    const isAnswered = (idx: number) => {
        const a = answers[idx];
        if (!a) return false;
        if (a.type === 'grammar_correction') {
            return (a.selectedWrong || []).some(s => s !== '') || Object.values(a.reasons || {}).some(r => r.trim() !== '');
        }
        if (a.type === 'summary_completion') {
            return Object.values(a.blankAnswers || {}).some(v => v.trim() !== '');
        }
        return (a.textAnswer || '').trim() !== '';
    };

    // Submit & Grade
    const handleSubmit = async () => {
        const unanswered = answers.filter((_, i) => !isAnswered(i)).length;
        if (unanswered > 0) {
            if (!confirm(`${unanswered}개의 문제를 풀지 않았습니다. 제출하시겠습니까?`)) return;
        }

        setMode('grading');
        setIsActive(false);

        try {
            const res = await fetch('/api/grade-subjective', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    problems,
                    answers,
                    passage: assignment.content || ''
                })
            });

            if (!res.ok) throw new Error('채점 API 오류');
            const data = await res.json();

            setGradeResults(data.results || []);
            setTotalScore(data.totalScore || 0);

            // Save submission
            await dbService.addSubmission({
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                studentId,
                studentName,
                classId,
                attempt: 1,
                answers: answers as any,
                score: data.totalScore || 0,
                status: 'passed',
                type: 'subjective_session' as any,
                details: {
                    results: data.results,
                    totalScore: data.totalScore,
                    timeSpent: timeLeft,
                    problems: problems.map(p => ({ id: p.id, type: p.type, points: p.points }))
                }
            } as any);

            setMode('result');
        } catch (err: any) {
            toast.error(`채점 실패: ${err.message}`);
            setMode('test');
            setIsActive(true);
        }
    };

    // [NEW] Retry wrong answers (score < 80)
    const handleRetryWrong = () => {
        const wrongIndices = gradeResults
            .map((r, i) => (r.score < 80 ? i : -1))
            .filter(i => i !== -1);

        if (wrongIndices.length === 0) {
            toast.info('오답이 없습니다! 모든 문제를 잘 풀었습니다.');
            return;
        }

        // Reset only wrong answers
        setAnswers(prev => prev.map((a, i) => {
            if (!wrongIndices.includes(i)) return a;
            const base: SubjectiveAnswer = { problemId: a.problemId, type: a.type };
            if (a.type === 'grammar_correction') {
                base.selectedWrong = ['', '', ''];
                base.reasons = {};
            } else if (a.type === 'summary_completion') {
                base.blankAnswers = {};
            } else {
                base.textAnswer = '';
            }
            return base;
        }));

        setGradeResults([]);
        setCurrentIdx(wrongIndices[0]);
        setTimeLeft(0);
        setIsActive(true);
        setMode('test');
        toast.success(`${wrongIndices.length}개 오답 문제를 다시 풀 수 있습니다.`);
    };

    // Grammar underline rendering
    const renderGrammarPassage = (html: string) => {
        if (!html) return '';
        return html
            .replace(/\[\[UL:\(([a-f])\)\]\]/gi, '<u class="subj-ul" data-label="$1"><span class="subj-label">($1)</span> ')
            .replace(/\[\[\/UL\]\]/gi, '</u>');
    };

    if (problems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="text-5xl mb-4">📝</div>
                <div className="text-xl font-bold">문제가 생성되지 않았습니다.</div>
                <p className="text-sm">관리자에게 문의해주세요.</p>
            </div>
        );
    }

    // ========================
    // GRADING SCREEN
    // ========================
    if (mode === 'grading') {
        return (
            <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#083973] rounded-[1.2rem] flex items-center justify-center p-2 shadow-2xl shadow-blue-900/30 overflow-hidden animate-pulse">
                        <Logo className="w-full h-full" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">AI 채점 중...</h2>
                    <p className="text-sm text-slate-400">서술형 답안을 분석하고 있습니다</p>
                    <div className="mt-4 flex justify-center gap-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    // RESULT SCREEN
    // ========================
    if (mode === 'result') {
        const wrongCount = gradeResults.filter(r => r.score < 80).length;

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28">
                {/* Result Header */}
                <header className="bg-gradient-to-br from-[#0A0E27] via-[#111827] to-[#0A0E27] p-8 text-white rounded-b-[2rem] shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute top-[-50%] left-[20%] w-[200px] h-[200px] bg-[#1e3a5f]/30 rounded-full blur-[60px]" />
                        <div className="absolute bottom-[-50%] right-[20%] w-[200px] h-[200px] bg-purple-500/20 rounded-full blur-[60px]" />
                    </div>
                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                        <div className="text-xs font-bold bg-white/10 backdrop-blur-md text-blue-100 inline-block px-3 py-1 rounded-full mb-3 border border-white/10 shadow-lg tracking-wider">서술형 채점 결과</div>
                        <h1 className="text-xl font-bold mb-4">{assignment.title}</h1>
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full transform scale-150" />
                            <div className="text-5xl font-black text-yellow-400 flex items-end justify-center gap-1 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                                {totalScore}<span className="text-sm font-bold text-slate-400 pb-2">/100</span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">{formatTime(timeLeft)} 소요</div>
                    </div>
                </header>

                {/* Results */}
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                    {problems.map((problem, idx) => {
                        const result = gradeResults[idx];
                        const answer = answers[idx];
                        const typeInfo = TYPE_LABELS[problem.type] || { label: problem.type, emoji: '📌' };

                        return (
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
                                {/* Problem header */}
                                <div className="bg-[#f5f5f7] dark:bg-slate-700/50 border-b border-black/[0.04] px-5 py-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-[#1e3a5f] text-white rounded-md flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                        <span className="text-[13px] font-semibold">{typeInfo.emoji} {typeInfo.label}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${(result?.score || 0) >= 80 ? 'text-green-600' : (result?.score || 0) >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {result?.score || 0}점
                                    </span>
                                </div>

                                <div className="p-5 space-y-3">
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{problem.instruction}</p>

                                    {/* Student answer */}
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">내 답안</div>
                                        {problem.type === 'grammar_correction' ? (
                                            <div className="space-y-2">
                                                {(answer?.selectedWrong || []).map((sel, si) => (
                                                    <div key={si} className="text-xs">
                                                        <span className="font-bold text-slate-700">{sel || '미선택'}</span>
                                                        <span className="text-slate-400 mx-1">→</span>
                                                        <span className="text-slate-600">{answer?.reasons?.[sel] || '이유 미입력'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : problem.type === 'summary_completion' ? (
                                            <div className="text-xs text-slate-700">
                                                {Object.entries(answer?.blankAnswers || {}).map(([k, v]) => (
                                                    <span key={k} className="mr-3">({k}): <strong>{v || '미입력'}</strong></span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{answer?.textAnswer || '(미입력)'}</p>
                                        )}
                                    </div>

                                    {/* Model answer */}
                                    {result?.modelAnswer && (
                                        <div className="bg-green-50/50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                                            <div className="text-[10px] font-bold text-green-600 uppercase mb-1">모범답안</div>
                                            <p className="text-xs text-green-900 dark:text-green-200 whitespace-pre-wrap">{result.modelAnswer}</p>
                                        </div>
                                    )}

                                    {/* AI Feedback */}
                                    {result?.feedback && (
                                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">AI 총평</div>
                                            <p className="text-xs text-blue-900 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">{result.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Action Bar — FIX: max-w to avoid sidebar overlap */}
                <div className="fixed bottom-0 left-0 lg:left-[220px] xl:left-[280px] right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-40">
                    <div className="max-w-3xl mx-auto flex gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {wrongCount > 0 && (
                            <button
                                onClick={handleRetryWrong}
                                className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                오답학습
                                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{wrongCount}</span>
                            </button>
                        )}
                        <button
                            onClick={onComplete}
                            className="flex-1 py-3 bg-gradient-to-br from-[#0A0E27] to-[#1e2548] text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-900/20"
                        >
                            나가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    // TEST MODE
    // ========================
    const currentProblem = problems[currentIdx];
    const currentAnswer = answers[currentIdx];
    const typeInfo = TYPE_LABELS[currentProblem?.type] || { label: '', emoji: '📌' };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-200">
            {/* Header — Dark Navy */}
            <header className="bg-[#0A0E27] sticky top-0 z-40 px-4 py-4 shadow-xl" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${assignment.type === 'external_subjective' ? 'bg-purple-500/20 text-purple-200 border-purple-400/40' : 'bg-[#1e3a5f]/60 text-blue-200 border-[#1e3a5f]'}`}>{assignment.type === 'external_subjective' ? '외부지문' : '변형주관'}</span>
                            </div>
                            <h1 className="text-lg font-bold text-white truncate">{assignment.title}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 mt-1">
                                <span className="flex items-center gap-1">
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" /></svg>
                                    {formatTime(timeLeft)}
                                </span>
                                <span className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                                <span>{problems.length} 문제 (서술형)</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={onComplete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                            >
                                나가기
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </button>
                        </div>
                    </div>
                    {/* Problem Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        {problems.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIdx(idx)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full text-[11px] font-bold transition-all flex items-center justify-center ${
                                    currentIdx === idx
                                        ? 'bg-white text-[#0A0E27] shadow-sm'
                                        : isAnswered(idx)
                                            ? 'bg-[#1e3a5f]/40 text-blue-300 border border-[#1e3a5f]/60'
                                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                                }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 pb-80">

                {/* Passage — Always visible like a real exam paper */}
                {(assignment.modifiedPassage || assignment.content) && (
                    <div className="mb-6 bg-white dark:bg-slate-800 rounded-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/[0.04] overflow-hidden">
                        <div className="bg-[#f5f5f7] dark:bg-slate-700/50 border-b border-black/[0.04] px-5 py-3 flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">📖 지문</span>
                            {assignment.modifiedPassage && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">출제 반영</span>
                            )}
                        </div>
                        <div className="p-5 md:p-6">
                            {assignment.modifiedPassage ? (
                                <div
                                    className="text-sm leading-[2] text-slate-700 dark:text-slate-300 exam-passage"
                                    dangerouslySetInnerHTML={{
                                        __html: renderGrammarPassage(assignment.modifiedPassage)
                                    }}
                                />
                            ) : (
                                <p className="text-sm leading-[1.9] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{assignment.content}</p>
                            )}
                        </div>
                    </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={`subj-${currentIdx}`}
                        initial={{ opacity: 0, x: direction * 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction * -40 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/[0.04] overflow-hidden">
                            {/* Type Badge */}
                            <div className="bg-[#f5f5f7] dark:bg-slate-700/50 border-b border-black/[0.04] px-5 py-3 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 bg-[#1e3a5f] text-white rounded-lg flex items-center justify-center text-xs font-bold">{currentIdx + 1}</span>
                                    <span className="text-[13px] font-semibold">{typeInfo.emoji} {typeInfo.label}</span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-400">{currentProblem.points}점</span>
                            </div>

                            <div className="p-5 md:p-6 space-y-4">
                                {/* Instruction */}
                                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{currentProblem.instruction}</p>

                                {/* ─── Type-specific content ─── */}

                                {/* TYPE 1: 영작 */}
                                {currentProblem.type === 'eng_composition' && (
                                    <div className="space-y-3">
                                        {/* English start (given) */}
                                        {currentProblem.englishStart && (
                                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">주어진 영문</div>
                                                <p className="text-[15px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed italic">{currentProblem.englishStart}<span className="text-amber-500 font-bold not-italic"> ______</span></p>
                                            </div>
                                        )}
                                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">한글 뜻 {currentProblem.englishStart ? '(영작할 부분)' : ''}</div>
                                            <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{currentProblem.koreanMeaning}</p>
                                        </div>
                                        {currentProblem.grammarCondition && (
                                            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-700">
                                                <span className="text-amber-500 text-xs mt-0.5">📌</span>
                                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">조건: {currentProblem.grammarCondition}</span>
                                            </div>
                                        )}
                                        {currentProblem.hintWords && currentProblem.hintWords.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 self-center mr-1">힌트:</span>
                                                {currentProblem.hintWords.map((w, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600">{w}</span>
                                                ))}
                                            </div>
                                        )}
                                        <textarea
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="영작을 입력하세요..."
                                            className="w-full h-28 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 2: 해석 서술 */}
                                {currentProblem.type === 'sentence_interpretation' && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                                            <p className="text-[15px] leading-relaxed italic text-slate-800 dark:text-slate-200">{currentProblem.targetSentence}</p>
                                        </div>
                                        <textarea
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="위 문장의 해석과 의미를 한국어로 서술하세요..."
                                            className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 3: 어법 교정 */}
                                {currentProblem.type === 'grammar_correction' && (
                                    <div className="space-y-4">
                                        {/* Passage with underlines */}
                                        <div
                                            className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 text-sm leading-[1.8] text-slate-800 dark:text-slate-200"
                                            dangerouslySetInnerHTML={{ __html: renderGrammarPassage(currentProblem.passageWithUnderlines || '') }}
                                        />

                                        {/* 3 Answer Slots */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-slate-500">틀린 것 3개를 골라 기호를 쓰고 이유를 서술하세요:</div>
                                            {[0, 1, 2].map(slotIdx => {
                                                const sel = currentAnswer?.selectedWrong?.[slotIdx] || '';
                                                return (
                                                    <div key={slotIdx} className="flex flex-col sm:flex-row gap-2">
                                                        <select
                                                            value={sel}
                                                            onChange={e => updateGrammarSelection(currentIdx, slotIdx, e.target.value)}
                                                            className="w-full sm:w-24 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#1e3a5f] outline-none flex-shrink-0"
                                                        >
                                                            <option value="">선택</option>
                                                            {GRAMMAR_LABELS.map(l => (
                                                                <option key={l} value={l}>{l}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={currentAnswer?.reasons?.[sel] || ''}
                                                            onChange={e => {
                                                                if (sel) updateGrammarReason(currentIdx, sel, e.target.value);
                                                            }}
                                                            placeholder={sel ? `${sel}이(가) 틀린 이유를 쓰세요...` : '기호를 먼저 선택하세요'}
                                                            disabled={!sel}
                                                            className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* TYPE 4: 빈칸 서술 */}
                                {currentProblem.type === 'blank_fill' && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 text-sm leading-[1.8] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                            {currentProblem.passageWithBlank}
                                        </div>
                                        <input
                                            type="text"
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="빈칸에 들어갈 단어/구문을 쓰세요..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 5: 지칭 추론 */}
                                {currentProblem.type === 'pronoun_reference' && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                                            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                                {currentProblem.pronounSentence?.split(currentProblem.underlinedPronoun || '').map((part, i, arr) => (
                                                    <span key={i}>
                                                        {part}
                                                        {i < arr.length - 1 && (
                                                            <u className="font-bold text-[#1e3a5f] dark:text-blue-400 underline-offset-2">{currentProblem.underlinedPronoun}</u>
                                                        )}
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                        <div className="text-xs text-slate-500">밑줄 친 <strong className="text-[#1e3a5f]">{currentProblem.underlinedPronoun}</strong>이(가) 가리키는 대상을 한국어로 쓰세요.</div>
                                        <input
                                            type="text"
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="가리키는 대상을 쓰세요..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 6: 요약문 완성 */}
                                {currentProblem.type === 'summary_completion' && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 text-sm leading-[1.8] text-slate-800 dark:text-slate-200">
                                            {currentProblem.summaryText}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {(currentProblem.blankAnswers || []).map((blank) => (
                                                <div key={blank.label} className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-[#1e3a5f] w-8 text-center">({blank.label})</span>
                                                    <input
                                                        type="text"
                                                        value={currentAnswer?.blankAnswers?.[blank.label] || ''}
                                                        onChange={e => updateBlankAnswer(currentIdx, blank.label, e.target.value)}
                                                        placeholder={`(${blank.label})에 들어갈 단어`}
                                                        className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TYPE 7: 문장 전환 */}
                                {currentProblem.type === 'sentence_transform' && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                                            <p className="text-[15px] leading-relaxed italic text-slate-800 dark:text-slate-200">{currentProblem.originalForTransform || (currentProblem as any).originalSentence}</p>
                                        </div>
                                        {currentProblem.transformCondition && (
                                            <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700">
                                                <span className="text-purple-500 text-xs mt-0.5">📌</span>
                                                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">조건: {currentProblem.transformCondition}</span>
                                            </div>
                                        )}
                                        <textarea
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="변환된 문장을 쓰세요..."
                                            className="w-full h-28 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 8: 한국어 요약 */}
                                {currentProblem.type === 'korean_summary' && (
                                    <div className="space-y-3">
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
                                            <div className="text-[10px] font-bold text-purple-500 uppercase mb-1">안내</div>
                                            <p className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed">위 지문 전체의 내용을 한국어로 2~3문장으로 요약하여 서술하시오.</p>
                                        </div>
                                        <textarea
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="한국어로 요약을 작성하세요..."
                                            className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                        />
                                    </div>
                                )}

                                {/* TYPE 9: 영어로 답하기 */}
                                {currentProblem.type === 'english_answer' && (
                                    <div className="space-y-3">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700">
                                            <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Question</div>
                                            <p className="text-[15px] leading-relaxed font-medium text-indigo-900 dark:text-indigo-200">{currentProblem.comprehensionQuestion}</p>
                                        </div>
                                        <textarea
                                            value={currentAnswer?.textAnswer || ''}
                                            onChange={e => updateTextAnswer(currentIdx, e.target.value)}
                                            placeholder="Answer in English..."
                                            className="w-full h-28 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation — FIX: max-w to avoid sidebar overlap */}
            <div className="fixed bottom-0 left-0 lg:left-[220px] xl:left-[280px] right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-lg z-40">
                <div className="max-w-4xl mx-auto flex gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                        onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                        disabled={currentIdx === 0}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold disabled:opacity-50 text-sm"
                    >
                        이전
                    </button>
                    {currentIdx === problems.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            className="flex-[2] py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a5080] text-white rounded-xl font-bold shadow-md shadow-[#1e3a5f]/20 text-sm"
                        >
                            제출 & 채점하기
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentIdx(Math.min(problems.length - 1, currentIdx + 1))}
                            className="flex-[2] py-3 bg-[#1e3a5f] text-white rounded-xl font-bold shadow-md shadow-[#1e3a5f]/20 text-sm"
                        >
                            다음
                        </button>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .subj-ul { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; text-decoration-color: #1e3a5f; }
                .subj-label { font-weight: 700; color: #1e3a5f; font-size: 12px; margin-right: 2px; }
                .sp-korean { font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-style: normal; border: 1px solid #fde68a; }
                .sp-blank { font-weight: 700; color: #1e3a5f; letter-spacing: 2px; border-bottom: 2px solid #1e3a5f; padding: 0 4px; }
                .sp-pronoun { font-weight: 700; text-decoration: underline; text-decoration-color: #dc2626; text-underline-offset: 3px; text-decoration-thickness: 2px; color: #dc2626; }
            `}</style>
        </div>
    );
}
