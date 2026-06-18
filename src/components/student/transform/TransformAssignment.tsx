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

    // v2: 재진입 관련 상태
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumeType, setResumeType] = useState<'progress' | 'retry' | null>(null);
    const [savedRetryData, setSavedRetryData] = useState<{ answers: number[]; incorrectProblems: number[] } | null>(null);
    const progressSavedRef = useRef(false); // in_progress submission 이미 저장했는지
    const resumeHandledRef = useRef(false); // 재진입 프롬프트 처리 완료 여부 (중복 방지)

    const problems: VariantProblem[] = assignment.variantProblems || [];

    // localStorage key
    const PROGRESS_KEY = `transform_progress_${assignment.id}_${studentId}`;

    // v2: localStorage에 진행 상태 저장
    const saveProgress = useCallback((answers: number[], idx: number, currentMode: 'test' | 'retry', elapsed: number, retryIncorrect?: number[]) => {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify({
                answers,
                currentIdx: idx,
                timeElapsed: elapsed,
                mode: currentMode,
                retryIncorrect,
                savedAt: Date.now(),
            }));
        } catch { /* ignore quota errors */ }
    }, [PROGRESS_KEY]);

    // v2: localStorage에서 진행 상태 로드
    const loadProgress = useCallback((): { answers: number[]; currentIdx: number; timeElapsed: number; mode: 'test' | 'retry'; retryIncorrect?: number[] } | null => {
        try {
            const raw = localStorage.getItem(PROGRESS_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // 24시간 이상 지난 progress는 무시
            if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(PROGRESS_KEY);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }, [PROGRESS_KEY]);

    const clearProgress = useCallback(() => {
        try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
    }, [PROGRESS_KEY]);

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

            // v2: 재진입 감지 - 이미 처리된 경우 스킵
            if (!resumeHandledRef.current) {
                // localStorage progress 확인
                const savedProgress = loadProgress();
                if (savedProgress && savedProgress.answers.length === problems.length) {
                    setShowResumePrompt(true);
                    setResumeType('progress');
                    return;
                }

                // 마지막 submission이 in_progress이고 오답이 있으면 retry 재진입 제안
                const lastSession = mySessions.at(-1) as any;
                if (lastSession && lastSession.status === 'in_progress' && lastSession.details?.incorrectProblems?.length > 0) {
                    setSavedRetryData({
                        answers: lastSession.details.answers || lastSession.answers || [],
                        incorrectProblems: lastSession.details.incorrectProblems,
                    });
                    setShowResumePrompt(true);
                    setResumeType('retry');
                    return;
                }
            }

            // Initialize answers array
            if (currentAnswers.length === 0) {
                setCurrentAnswers(new Array(problems.length).fill(-1));
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }, [assignment.id, studentId, problems.length, currentAnswers.length, loadProgress]);

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

        // v2: localStorage에 자동 저장
        const retryIncorrect = mode === 'retry' && currentSession ? currentSession.incorrectProblems : undefined;
        saveProgress(newAnswers, currentIdx, mode === 'retry' ? 'retry' : 'test', timeLeft, retryIncorrect);

        // v2: 첫 답안 선택 시 Firestore에 in_progress 기록 (배지 "학습중" 표시용)
        if (!progressSavedRef.current) {
            progressSavedRef.current = true;
            dbService.addSubmission({
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                studentId,
                studentName,
                classId,
                attempt: sessions.length + 1,
                answers: newAnswers,
                score: -1,
                status: 'in_progress',
                type: 'variant_session' as any,
                details: { type: 'in_progress_save' }
            } as any).catch(() => { /* ignore */ });
        }
    };

    const calculateScore = (answers: number[]) => {
        let score = 0;
        problems.forEach((problem, idx) => {
            // order 유형은 정규화된 correctAnswer로 채점
            const normalizedCorrect = problem.type === 'order'
                ? normalizeOrderProblem(problem.choices, problem.correctAnswer, 'order').correctAnswer
                : problem.correctAnswer;
            if (answers[idx] === normalizedCorrect) {
                score += problem.points;
            }
        });
        return score;
    };

    const getIncorrectProblems = (answers: number[]) => {
        const incorrect: number[] = [];
        problems.forEach((problem, idx) => {
            // order 유형은 정규화된 correctAnswer로 비교
            const normalizedCorrect = problem.type === 'order'
                ? normalizeOrderProblem(problem.choices, problem.correctAnswer, 'order').correctAnswer
                : problem.correctAnswer;
            if (answers[idx] !== normalizedCorrect) {
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
        const isPerfect = incorrectProblems.length === 0;

        // v2: round_complete 횟수 카운트 (기존 sessions에서)
        const previousRoundCompletes = sessions.filter((s: any) => s.status === 'round_complete' || (s as any).score >= 100).length;

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
                assignmentTitle: assignment.title,
                studentId,
                studentName,
                classId,
                attempt: newSession.attemptNumber,
                answers: currentAnswers,
                score,
                // v2: 오답이 없으면 round_complete, 있으면 in_progress
                status: isPerfect ? 'round_complete' : 'in_progress',
                type: 'variant_session' as any,
                details: newSession
            } as any);

            setCurrentSession(newSession);
            setSessions([...sessions, newSession]);
            setMode('result');

            // v2: localStorage 정리 (제출 완료)
            clearProgress();
            progressSavedRef.current = false;

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

        // v2: retry 상태도 localStorage에 저장
        saveProgress(retryAnswers, 0, 'retry', 0, currentSession.incorrectProblems);
    };

    const handleNewAttempt = () => {
        setMode('test');
        setCurrentAnswers(new Array(problems.length).fill(-1));
        setCurrentSession(null);
        // v2: progress 초기화
        clearProgress();
        progressSavedRef.current = false;
    };

    // v2: 재진입 핸들러 - 이어서 풀기
    const handleResumeProgress = () => {
        const saved = loadProgress();
        if (saved) {
            setCurrentAnswers(saved.answers);
            setCurrentIdx(saved.currentIdx);
            setTimeLeft(saved.timeElapsed);
            setIsActive(true);
            if (saved.mode === 'retry' && saved.retryIncorrect) {
                setMode('retry');
                // 가상 session 생성 (retry 표시를 위해)
                setCurrentSession({
                    id: 'resumed',
                    assignmentId: assignment.id,
                    studentId,
                    attemptNumber: sessions.length,
                    answers: saved.answers,
                    score: 0,
                    incorrectProblems: saved.retryIncorrect,
                    completedAt: 0,
                    isRetry: true,
                });
            } else {
                setMode('test');
            }
            progressSavedRef.current = true; // 이미 in_progress 저장됨
        }
        resumeHandledRef.current = true;
        setShowResumePrompt(false);
    };

    // v2: 재진입 핸들러 - 오답 이어하기
    const handleResumeRetry = () => {
        if (savedRetryData) {
            const retryAnswers = [...savedRetryData.answers];
            savedRetryData.incorrectProblems.forEach(idx => {
                retryAnswers[idx] = -1;
            });
            setCurrentAnswers(retryAnswers);
            setCurrentIdx(0);
            setTimeLeft(0);
            setIsActive(true);
            setMode('retry');
            setCurrentSession({
                id: 'resumed_retry',
                assignmentId: assignment.id,
                studentId,
                attemptNumber: sessions.length,
                answers: savedRetryData.answers,
                score: 0,
                incorrectProblems: savedRetryData.incorrectProblems,
                completedAt: 0,
                isRetry: true,
            });
            progressSavedRef.current = true;
            saveProgress(retryAnswers, 0, 'retry', 0, savedRetryData.incorrectProblems);
        }
        resumeHandledRef.current = true;
        setShowResumePrompt(false);
    };

    // v2: 재진입 핸들러 - 처음부터 다시
    const handleStartFresh = () => {
        clearProgress();
        setCurrentAnswers(new Array(problems.length).fill(-1));
        setCurrentIdx(0);
        setTimeLeft(0);
        setIsActive(false);
        setMode('test');
        setCurrentSession(null);
        setSavedRetryData(null);
        progressSavedRef.current = false;
        resumeHandledRef.current = true;
        setShowResumePrompt(false);
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

    // v2: 재진입 프롬프트 UI
    if (showResumePrompt) {
        const answeredCount = resumeType === 'progress'
            ? (loadProgress()?.answers.filter(a => a !== -1).length || 0)
            : (savedRetryData?.incorrectProblems.length || 0);

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {resumeType === 'progress' ? '이전에 풀던 문제가 있습니다' : '오답 학습이 남아있습니다'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        {resumeType === 'progress'
                            ? `${answeredCount}/${problems.length}문제를 풀었습니다. 이어서 풀까요?`
                            : `${answeredCount}개의 오답을 다시 풀어야 합니다.`
                        }
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={resumeType === 'progress' ? handleResumeProgress : handleResumeRetry}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
                        >
                            {resumeType === 'progress' ? '📝 이어서 풀기' : '🔄 오답 학습 이어하기'}
                        </button>
                        <button
                            onClick={handleStartFresh}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all"
                        >
                            처음부터 다시 풀기
                        </button>
                        <button
                            onClick={onComplete}
                            className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors"
                        >
                            나가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
            'mismatch': '다음 글의 내용과 일치하지 않는 것은?',
        };
        return questionMap[type] || '다음 글을 읽고 물음에 답하시오.';
    };

    // 수능 표준 순서 유형 선지 (고정)
    // 수능 표준 순서 유형 선지 5개 (수능 실제 출제 형식)
    const ORDER_CHOICES_STANDARD = [
        '(A) - (C) - (B)',
        '(B) - (A) - (C)',
        '(B) - (C) - (A)',
        '(C) - (A) - (B)',
        '(C) - (B) - (A)',
    ];

    // order 유형 선지 + correctAnswer 동시 정규화
    // ★ 핵심 수정: 선지를 표준으로 교체할 때 correctAnswer 인덱스도 함께 재계산
    // - AI가 준 정답 텍스트를 먼저 기억 → 표준 선지에서 그 위치를 찾아 correctAnswer 재설정
    const normalizeOrderProblem = (choices: string[], correctAnswer: number, type: string): { choices: string[]; correctAnswer: number } => {
        if (type !== 'order') return { choices, correctAnswer };

        const normalize = (c: string) =>
            c.trim()
                .replace(/\s*–\s*/g, ' - ')
                .replace(/\s*-\s*/g, ' - ')
                .replace(/\s+/g, ' ')
                .trim();

        const normalized = choices.map(normalize);
        const hasDuplicates = new Set(normalized).size < normalized.length;
        const matchesStandard = ORDER_CHOICES_STANDARD.every(s => normalized.some(n => n === s));

        // 이미 표준 5개와 정확히 일치하면 정규화된 형태로만 반환 (correctAnswer 유지)
        if (!hasDuplicates && matchesStandard && normalized.length === 5) {
            // 표준과 순서가 같으면 그대로, 다르면 correctAnswer 재계산
            const isInStandardOrder = normalized.every((n, i) => n === ORDER_CHOICES_STANDARD[i]);
            if (isInStandardOrder) {
                return { choices: normalized, correctAnswer };
            }
            // 순서가 다른 경우: 기존 정답 텍스트를 기억하고 표준 선지에서 위치 찾기
            const correctText = normalized[correctAnswer];
            const newCorrectAnswer = ORDER_CHOICES_STANDARD.indexOf(correctText);
            return {
                choices: ORDER_CHOICES_STANDARD,
                correctAnswer: newCorrectAnswer >= 0 ? newCorrectAnswer : correctAnswer,
            };
        }

        // 중복/오류 있음 → 표준 선지로 교체
        // AI가 준 correctAnswer 인덱스의 텍스트를 정답 텍스트로 간주
        const originalCorrectText = normalized[correctAnswer] ?? '';
        const newCorrectAnswer = ORDER_CHOICES_STANDARD.indexOf(originalCorrectText);
        return {
            choices: ORDER_CHOICES_STANDARD,
            // 표준 선지에서 찾지 못하면 AI가 준 인덱스 그대로 유지
            correctAnswer: newCorrectAnswer >= 0 ? newCorrectAnswer : correctAnswer,
        };
    };

    // summary 유형 선지 정규화
    // AI가 "(A) word - (B) word" 대신 "(A) word" / "(B) word" 처럼 분리하거나
    // 레이블을 생략("word1 / word2")한 경우를 교정
    const normalizeSummaryChoices = (choices: string[], type: string): string[] => {
        if (type !== 'summary') return choices;

        // 이미 "(A) ... - (B) ..." 패턴을 가진 선지 개수 세기
        const correctPattern = /^\(A\)\s+\S+.*-\s*\(B\)\s+\S+/;
        const alreadyCorrect = choices.filter(c => correctPattern.test(c.trim())).length;

        // 5개 모두 올바른 형태면 그대로 반환
        if (alreadyCorrect === choices.length && choices.length === 5) {
            return choices;
        }

        // 선지 5개가 "(A) xxx" / "(A) yyy" ... 또는 "(B) xxx" 패턴으로 분리된 경우:
        // "(A) word" 형태와 "(B) word" 형태를 교차 묶어 "(A) word - (B) word"로 복원
        const aChoices = choices.filter(c => /^\(A\)/.test(c.trim()));
        const bChoices = choices.filter(c => /^\(B\)/.test(c.trim()));

        if (aChoices.length > 0 && bChoices.length > 0) {
            // (A)와 (B)가 번갈아가며 분리된 케이스: 쌍으로 묶기
            // 예: ["(A) w1", "(B) w1", "(A) w2", "(B) w2", "(A) w3", "(B) w3"]
            // → ["(A) w1 - (B) w1", "(A) w2 - (B) w2", "(A) w3 - (B) w3", ...]
            const paired: string[] = [];
            for (let i = 0; i < Math.min(aChoices.length, bChoices.length, 5); i++) {
                const aWord = aChoices[i].trim().replace(/^\(A\)\s*/, '').trim();
                const bWord = bChoices[i].trim().replace(/^\(B\)\s*/, '').trim();
                paired.push(`(A) ${aWord} - (B) ${bWord}`);
            }
            // 5개에 못 미치면 그대로 반환 (불완전한 쌍)
            if (paired.length >= 5) return paired.slice(0, 5);
        }

        // "word1 / word2" 또는 "word1 - word2" 형태인 경우 레이블 추가
        const reformatted = choices.map(c => {
            const t = c.trim();
            if (correctPattern.test(t)) return t;
            // "word / word2" 또는 "word - word2" 패턴
            const sepMatch = t.match(/^(.+?)\s*[\/\-]\s*(.+)$/);
            if (sepMatch && !/^\(A\)/.test(t) && !/^\(B\)/.test(t)) {
                return `(A) ${sepMatch[1].trim()} - (B) ${sepMatch[2].trim()}`;
            }
            return t;
        });

        return reformatted;
    };

    // 유형별 선지 정규화 통합 함수
    // order 타입은 correctAnswer도 함께 반환하는 normalizeOrderProblem을 사용
    const normalizeChoices = (choices: string[], type: string): string[] => {
        if (type === 'order') return normalizeOrderProblem(choices, 0, type).choices;
        if (type === 'summary') return normalizeSummaryChoices(choices, type);
        // 일반 선지: HTML 태그 및 embedded circled numbers 제거 (이미 저장된 오염 데이터 방어)
        return choices.map(c =>
            c.replace(/<[^>]+>/g, '')             // <b>③ reported</b> → ③ reported
             .replace(/[①②③④⑤❶❷❸❹❺]\s*/g, '')  // ③ reported → reported
             .replace(/\*\*([^*]+)\*\*/g, '$1')   // **text** → text
             .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1') // *text* → text
             .trim()
        );
    };

    // order 유형: 선지 + 정답 인덱스 동시 정규화
    const getNormalizedProblem = (prob: VariantProblem): { choices: string[]; correctAnswer: number } => {
        if (prob.type === 'order') {
            return normalizeOrderProblem(prob.choices, prob.correctAnswer, prob.type);
        }
        return {
            choices: normalizeSummaryChoices(prob.choices, prob.type),
            correctAnswer: prob.correctAnswer,
        };
    };

    // AI가 question에 이미 넣은 한글 질문 패턴 제거 (우리가 위에서 별도로 표시하므로)
    const stripKoreanQuestion = (text: string): string => {
        if (!text) return '';
        // 공통 한글 발문 패턴: "다음 ~ ?", "글의 ~ ?", "주어진 ~ ?", "밑줄 ~ ?" 등
        // 끝 패턴: 것은?, 곳은?, 문장은?, 답하시오., 고르시오. 등 모든 한국어 질문 종결
        const koreanQuestionPattern = /(?:다음|글의|주어진|위|아래|밑줄)[^\n]*?(?:것은\??|곳은\??|문장은\??|답하시오\.?|것을 고르시오\.?|고르시오\.?|적절한 것은\??)\s*\n?/gi;
        return text
            .replace(koreanQuestionPattern, '')
            .replace(/^\s*\n/, '') // 제거 후 남은 빈 줄 정리
            .trim();
    };

    const formatQuestionText = (text: string) => {
        if (!text) return '';
        return stripKoreanQuestion(text)
            // Normalize line endings
            .replace(/\r/g, '')
            // Strip stray markdown code fences
            .replace(/```(?:json)?\s*/gi, '')
            // Convert markdown bold **text** → plain text (avoid confusion with passage)
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            // Convert markdown italic *text* → <i>text</i>
            .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>')
            // Normalize inconsistent blank markers
            .replace(/_{3,}/g, '__________')
            // Remove stray "Question:" / "Passage:" headers
            .replace(/^\s*(?:Question|Passage|Text)\s*:\s*\n?/i, '')
            // Process structural markers
            .replace(/\[\[BOX\]\]\s*\n?/gi, "<div class='box-sentence'>")
            .replace(/\n?\s*\[\[\/BOX\]\]\n?/gi, "</div>")
            .replace(/\[\[TARGET\]\]\s*\n?/gi, "<div class='target-sentence'>")
            .replace(/\n?\s*\[\[\/TARGET\]\]\n?/gi, "</div>")
            .replace(/\[\[U\]\]/gi, "<u>")
            .replace(/\[\[\/U\]\]/gi, "</u>")
            .replace(/\[\[BR\]\]/gi, "<br/>")
            // Add subtle spacing before (A), (B), (C) paragraph markers in order-type questions
            .replace(/\n(\([A-C]\))/g, "<div style='margin-top:0.6em'></div>$1")
            // Collapse excessive blank lines (3+ newlines → 2)
            .replace(/\n{3,}/g, '\n\n');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-200 selection:bg-blue-600/20 selection:text-slate-900">
            {/* Navy Header — Unified Design */}
            <header className="bg-[#0A0E27] sticky top-0 z-50 px-4 py-4 shadow-xl" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
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
                                        {normalizeChoices(currentProblem.choices, currentProblem.type).map((choice, idx) => (
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
                            {/* v2: round_complete 축하 메시지 */}
                            {currentSession?.incorrectProblems.length === 0 ? (
                                <>
                                    <div className="text-[13px] font-bold text-blue-500 uppercase tracking-widest mb-4">
                                        🎉 {(() => {
                                            const roundCount = sessions.filter((s: any) => s.status === 'round_complete' || (s as any).score >= 100).length;
                                            return roundCount >= 2 ? `${roundCount}회 완료!` : '학습 완료!';
                                        })()}
                                    </div>
                                    <div className="flex flex-col items-center justify-center relative z-10">
                                        <div className="text-[64px] md:text-[80px] font-semibold leading-none tracking-tighter text-blue-600">
                                            {currentSession?.score}
                                        </div>
                                        <div className="text-[13px] font-medium text-blue-400 mt-2">Perfect Score</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-[13px] font-bold text-amber-500 uppercase tracking-widest mb-4">
                                        오답이 {currentSession?.incorrectProblems.length}개 있습니다
                                    </h2>
                                    <div className="flex flex-col items-center justify-center relative z-10">
                                        <div className="text-[64px] md:text-[80px] font-semibold leading-none tracking-tighter text-slate-900 dark:text-white">
                                            {currentSession?.score}
                                        </div>
                                        <div className="text-[13px] font-medium text-slate-500 mt-2">오답 학습을 완료해야 학습완료가 됩니다</div>
                                    </div>
                                </>
                            )}

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
                                        🔄 오답 학습하기 ({currentSession.incorrectProblems.length})
                                    </button>
                                )}
                                {/* v2: 100점 달성 시 다시 학습 버튼 */}
                                {currentSession && currentSession.incorrectProblems.length === 0 && (
                                    <button
                                        onClick={handleNewAttempt}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-full text-[13px] font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200"
                                    >
                                        🔁 다시 학습하기
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
                                    // ★ order 유형은 선지와 correctAnswer를 동시에 정규화
                                    const normalized = getNormalizedProblem(prob);
                                    const normalizedCorrectAnswer = normalized.correctAnswer;
                                    const isCorrect = currentSession?.answers[idx] === normalizedCorrectAnswer;
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
                                                {normalized.choices.map((choice, cIdx) => {
                                                    const isAnswer = cIdx === normalizedCorrectAnswer;
                                                    const isStudentPick = cIdx === currentSession?.answers[idx];
                                                    const choiceExp = (prob as any).choiceExplanations?.[cIdx];
                                                    return (
                                                        <div key={cIdx} className={`px-4 py-3 rounded-xl text-[13px] font-medium border ${isAnswer
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                            : isStudentPick
                                                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-500/20'
                                                                : 'bg-transparent text-slate-500 border-transparent'
                                                            }`}>
                                                            <div className="flex gap-3">
                                                                <span className="opacity-70 flex-shrink-0">{cIdx + 1}.</span>
                                                                <div className="flex-1">
                                                                    <span>{choice}</span>
                                                                    {choiceExp && (
                                                                        <p className={`text-[12px] mt-1.5 leading-relaxed ${isAnswer
                                                                            ? 'text-emerald-600/80 dark:text-emerald-400/70'
                                                                            : isStudentPick
                                                                                ? 'text-red-500/80 dark:text-red-400/70'
                                                                                : 'text-slate-400'
                                                                            }`}>
                                                                            → {choiceExp}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
