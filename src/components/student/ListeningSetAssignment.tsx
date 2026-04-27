'use client';

/**
 * 듣기세트 학생 학습 UI
 * 
 * 데스크탑: 2분할 (좌: 듣기 + 메모패드 | 우: 독해 스크롤)
 * 모바일: 탭 전환 (듣기 ↔ 독해)
 * 
 * 핵심 흐름:
 * 1. "듣기 시작" 버튼 → 오프닝 안내방송
 * 2. "문제지를 넘기시기 바랍니다" → 독해 영역 활성화 (3초)
 * 3. 듣기 1~17번 자동 재생
 * 4. "이상으로 듣기 평가를 마칩니다" → 60초 → 독해 풀이
 * 5. 제출 → 채점 → 결과
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Assignment, ListeningProblem, ReadingProblem, ListeningSetAnswers } from '@/types';
import { useListeningTTS, ListeningPhase } from '@/hooks/useListeningTTS';
import { DEFAULT_READING_ORDER } from '@/services/listeningPrompts';
import ChartRenderer from './ChartRenderer';
import PictureRenderer from './PictureRenderer';

interface ListeningSetAssignmentProps {
    assignment: Assignment;
    onSubmit: (answers: ListeningSetAnswers) => void;
}

export default function ListeningSetAssignment({ assignment, onSubmit }: ListeningSetAssignmentProps) {
    const listeningProblems = assignment.listeningProblems || [];
    const readingProblems = assignment.readingProblems || [];
    const readingOrder = assignment.listeningSetConfig?.readingOrder || DEFAULT_READING_ORDER;

    // Sort reading problems by the specified order
    const orderedReadingProblems = useMemo(() => {
        return [...readingProblems].sort((a, b) => {
            const aIdx = readingOrder.indexOf(a.number);
            const bIdx = readingOrder.indexOf(b.number);
            return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
    }, [readingProblems, readingOrder]);

    // Answers state
    const [listeningAnswers, setListeningAnswers] = useState<Record<number, number>>({});
    const [readingAnswers, setReadingAnswers] = useState<Record<number, number>>({});
    const [highlights, setHighlights] = useState<Record<number, number[]>>({});
    const [memos, setMemos] = useState<Record<number, string>>({});
    // (a)~(e) 지칭 추론 색깔 상태: null → 'blue' → 'green' → null
    const [refColors, setRefColors] = useState<Record<string, 'blue' | 'green' | null>>({});
    // (A)~(D) 순서 색깔 상태: 클릭 순서대로 빨강→주황→노랑→연두
    const [orderSequence, setOrderSequence] = useState<string[]>([]);

    // UI state
    const [mobileTab, setMobileTab] = useState<'listening' | 'reading'>('listening');
    const [isMobile, setIsMobile] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Replay state (for wrong-answer review)
    const [replayingProblem, setReplayingProblem] = useState<number | null>(null);
    const replayAudioRef = useRef<AudioContext | null>(null);
    const replaySourceRef = useRef<AudioBufferSourceNode | null>(null);

    // ★ 스크롤 기반 듣기: 문제별 ref + 자동 스크롤
    const problemRefsMap = useRef<Record<number, HTMLDivElement | null>>({});
    const listeningScrollRef = useRef<HTMLDivElement | null>(null);
    const [userScrolledAway, setUserScrolledAway] = useState(false);

    // Check mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // TTS Engine
    const {
        phase,
        currentProblemIndex,
        currentLineIndex,
        elapsedSeconds,
        gapRemaining,
        transitionRemaining,
        isSecondPlay,
        canViewReading,
        preparingProgress,
        prepareAudio,
        beginExam,
        stopListening,
    } = useListeningTTS({
        problems: listeningProblems,
        onPageTurn: () => {
            // 독해 영역 활성화됨
        },
        onProblemStart: (idx) => {
            // 자동으로 해당 문제로 스크롤
        },
        onTransitionStart: () => {
            // 모바일에서 독해 탭으로 전환
            if (isMobile) setMobileTab('reading');
        },
        onAllComplete: () => {
            // 독해 풀이 시간
        },
    });

    const currentListeningProblem = listeningProblems[currentProblemIndex] || null;

    // ★ 현재 재생 문제로 자동 스크롤
    useEffect(() => {
        if (!currentListeningProblem || userScrolledAway) return;
        const el = problemRefsMap.current[currentListeningProblem.number];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentProblemIndex, currentListeningProblem, userScrolledAway]);

    // 스크롤 감지: 사용자가 수동 스크롤하면 자동스크롤 일시 중단
    const handleListeningScroll = useCallback(() => {
        setUserScrolledAway(true);
    }, []);

    const scrollToCurrentProblem = useCallback(() => {
        if (!currentListeningProblem) return;
        const el = problemRefsMap.current[currentListeningProblem.number];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setUserScrolledAway(false);
        }
    }, [currentListeningProblem]);

    // ── Handlers ──
    const selectListeningAnswer = useCallback((problemNumber: number, choice: number) => {
        setListeningAnswers(prev => ({ ...prev, [problemNumber]: choice }));
    }, []);

    const selectReadingAnswer = useCallback((problemNumber: number, choice: number) => {
        setReadingAnswers(prev => ({ ...prev, [problemNumber]: choice }));
    }, []);

    const toggleHighlight = useCallback((problemNumber: number, sentenceIdx: number) => {
        setHighlights(prev => {
            const current = prev[problemNumber] || [];
            const next = current.includes(sentenceIdx)
                ? current.filter(i => i !== sentenceIdx)
                : [...current, sentenceIdx];
            return { ...prev, [problemNumber]: next };
        });
    }, []);

    const updateMemo = useCallback((problemNumber: number, text: string) => {
        setMemos(prev => ({ ...prev, [problemNumber]: text }));
    }, []);

    // (a)~(e) 색깔 토글: null → blue → green → null
    const toggleRefColor = useCallback((label: string) => {
        // 소문자 (a)~(e): 파랑/초록 토글
        setRefColors(prev => {
            const current = prev[label] || null;
            const next = current === null ? 'blue' : current === 'blue' ? 'green' : null;
            return { ...prev, [label]: next };
        });
    }, []);

    // (A)~(D) 순서 토글: 클릭하면 순서에 추가, 다시 클릭하면 제거
    const ORDER_COLORS = [
        { bg: 'bg-red-200', text: 'text-red-800', deco: 'decoration-red-500' },
        { bg: 'bg-orange-200', text: 'text-orange-800', deco: 'decoration-orange-500' },
        { bg: 'bg-yellow-200', text: 'text-yellow-800', deco: 'decoration-yellow-500' },
        { bg: 'bg-lime-200', text: 'text-lime-800', deco: 'decoration-lime-500' },
        { bg: 'bg-purple-200', text: 'text-purple-800', deco: 'decoration-purple-500' },
    ];

    const toggleOrderColor = useCallback((label: string) => {
        setOrderSequence(prev => {
            if (prev.includes(label)) {
                return prev.filter(l => l !== label);
            }
            return [...prev, label];
        });
    }, []);

    // 장문 단락 텍스트를 (a)~(e) 및 (A)~(D) 마커 기준으로 분리
    const renderParagraphWithRefs = useCallback((text: string, paraIndex: number) => {
        const parts = text.split(/(\([a-eA-E]\))/i);
        return parts.map((part, i) => {
            const refMatch = part.match(/^\(([a-eA-E])\)$/i);
            if (refMatch) {
                const label = part;
                const isUppercase = label === label.toUpperCase(); // (A)~(E) 대문자

                if (isUppercase) {
                    // ★ (A)~(D): 순서 색상 (빨강→주황→노랑→연두)
                    const orderIdx = orderSequence.indexOf(label);
                    const colorSet = orderIdx >= 0 ? ORDER_COLORS[orderIdx % ORDER_COLORS.length] : null;
                    const colorClass = colorSet
                        ? `${colorSet.bg} ${colorSet.text} ${colorSet.deco}`
                        : 'bg-slate-200 text-slate-600';
                    const orderLabel = orderIdx >= 0 ? `${orderIdx + 1}` : '';
                    return (
                        <span
                            key={`${paraIndex}-${i}`}
                            onClick={(e) => { e.stopPropagation(); toggleOrderColor(label); }}
                            className={`inline-block underline decoration-2 font-bold cursor-pointer px-0.5 rounded transition-colors relative ${colorClass}`}
                            title="클릭하여 순서 표시 (빨→주→노→연)"
                        >
                            {part}
                            {orderLabel && (
                                <span className="absolute -top-2.5 -right-2 text-[9px] font-black bg-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm border">
                                    {orderLabel}
                                </span>
                            )}
                        </span>
                    );
                } else {
                    // (a)~(e): 파랑/초록 토글
                    const color = refColors[label];
                    const colorClass = color === 'blue'
                        ? 'bg-blue-200 text-blue-800 decoration-blue-500'
                        : color === 'green'
                        ? 'bg-emerald-200 text-emerald-800 decoration-emerald-500'
                        : 'bg-slate-200 text-slate-600';
                    return (
                        <span
                            key={`${paraIndex}-${i}`}
                            onClick={(e) => { e.stopPropagation(); toggleRefColor(label); }}
                            className={`inline-block underline decoration-2 font-bold cursor-pointer px-0.5 rounded transition-colors ${colorClass}`}
                            title="클릭하여 파랑/초록 표시"
                        >
                            {part}
                        </span>
                    );
                }
            }
            return <span key={`${paraIndex}-${i}`}>{part}</span>;
        });
    }, [refColors, toggleRefColor, orderSequence, toggleOrderColor, ORDER_COLORS]);

    // 장문 문장 하이라이트 토글 (장문 전체를 'long' 키로 공유)
    const toggleLongHighlight = useCallback((sentenceIdx: number) => {
        setHighlights(prev => {
            const KEY = 9999; // long passage shared key
            const current = prev[KEY] || [];
            const next = current.includes(sentenceIdx)
                ? current.filter(i => i !== sentenceIdx)
                : [...current, sentenceIdx];
            return { ...prev, [KEY]: next };
        });
    }, []);

    const handleSubmit = () => {
        const answers: ListeningSetAnswers = {
            listeningAnswers,
            readingAnswers,
            highlightedSentences: highlights,
            memos,
            elapsedSeconds,
        };
        onSubmit(answers);
        setShowResults(true);
    };

    // ── Timer Format ──
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // ── Phase Labels ──
    const getPhaseLabel = (): string => {
        switch (phase) {
            case 'idle': return '';
            case 'preparing': return '🎧 오디오 준비 중...';
            case 'opening': return '📢 안내방송';
            case 'page_turn': return '📄 문제지 넘김';
            case 'playing': return `🔊 ${currentListeningProblem?.number || ''}번`;
            case 'gap': return `⏳ ${gapRemaining}초`;
            case 'replay': return `🔁 2회차`;
            case 'transition': return `📝 전환 ${transitionRemaining}초`;
            case 'reading_time': return '📖 독해';
            case 'done': return '✅ 완료';
            default: return '';
        }
    };

    const answeredListening = Object.keys(listeningAnswers).length;
    const answeredReading = Object.keys(readingAnswers).length;
    const totalAnswered = answeredListening + answeredReading;
    const totalProblems = listeningProblems.length + readingProblems.length;

    // ── Replay audio for wrong-answer review ──
    const replayProblemAudio = useCallback(async (problem: typeof listeningProblems[0]) => {
        if (!problem.audioUrl) return;
        try {
            setReplayingProblem(problem.number);

            if (!replayAudioRef.current) {
                replayAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = replayAudioRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            // Stop any currently playing
            try { replaySourceRef.current?.stop(); } catch {}

            const response = await fetch(problem.audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            replaySourceRef.current = source;
            source.onended = () => setReplayingProblem(null);
            source.start(0);
        } catch (err) {
            console.warn('[Replay] Pre-cached audio failed, falling back to Web Speech:', err);
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                let textToSpeak = problem.script?.map(s => s.text).join(' ') || problem.instruction || '';
                if (!textToSpeak) {
                    setReplayingProblem(null);
                    return;
                }
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'en-US';
                utterance.rate = 1.0;
                utterance.onend = () => setReplayingProblem(null);
                utterance.onerror = () => setReplayingProblem(null);
                window.speechSynthesis.speak(utterance);
            } else {
                setReplayingProblem(null);
            }
        }
    }, []);

    // ══════════════════════════════════════
    // Idle Screen — 시작 전 대기
    // ══════════════════════════════════════
    if (phase === 'idle') {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-8 animate-premium-fade-in-up">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">🎧</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{assignment.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">청한영어 · 수능 모의고사 듣기평가</p>
                    </div>

                    {/* Info Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 space-y-4 border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{listeningProblems.length}</div>
                                <div className="text-[10px] text-blue-500/70 dark:text-blue-400/70 mt-0.5">🔊 듣기</div>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3">
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{readingProblems.length}</div>
                                <div className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70 mt-0.5">📖 독해</div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3">
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-300">{totalProblems}</div>
                                <div className="text-[10px] text-slate-500/70 dark:text-slate-400/70 mt-0.5">📋 전체</div>
                            </div>
                        </div>
                        <hr className="border-slate-200 dark:border-slate-700" />
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
                            <p>• 시작 후 듣기는 자동 재생되며 멈출 수 없습니다</p>
                            <p>• &quot;문제지를 넘기시기 바랍니다&quot; 이후 독해 미리보기 가능</p>
                            <p>• 16~17번은 두 번 들려줍니다</p>
                        </div>
                    </div>

                    {/* ★ 음원 다운로드 버튼 */}
                    <button
                        onClick={prepareAudio}
                        className="w-full py-4 bg-[#0A0E27] dark:bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-[#1e2548] dark:hover:bg-blue-500 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">⬇️</span>
                        음원 다운로드
                    </button>
                    <p className="text-center text-slate-400 dark:text-slate-500 text-[10px]">이어폰/헤드셋 착용을 권장합니다</p>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════
    // Results Screen
    // ══════════════════════════════════════
    if (showResults) {
        const listeningCorrect = listeningProblems.filter(p => listeningAnswers[p.number] === p.correctAnswer).length;
        const readingCorrect = readingProblems.filter(p => readingAnswers[p.number] === p.correctAnswer).length;
        const listeningScore = listeningProblems.length > 0 ? Math.round((listeningCorrect / listeningProblems.length) * 100) : 0;
        const readingScore = readingProblems.length > 0 ? Math.round((readingCorrect / readingProblems.length) * 100) : 0;
        const totalCorrect = listeningCorrect + readingCorrect;
        const totalScore = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

        const wrongListening = listeningProblems.filter(p => listeningAnswers[p.number] !== p.correctAnswer);
        const wrongReading = readingProblems.filter(p => readingAnswers[p.number] !== p.correctAnswer);

        const formatAnswer = (ans: number | undefined) => ans !== undefined ? `${ans + 1}번` : '미응답';

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 pb-20">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Score Header */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-6 text-center">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-4">📊 듣기세트 결과</h1>
                        <div className="text-5xl font-black text-teal-600 dark:text-teal-400 mb-2">{totalScore}점</div>
                        <div className="text-slate-500 dark:text-slate-400">({totalCorrect}/{totalProblems} 정답)</div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-teal-50 dark:bg-teal-900/30 rounded-2xl p-4">
                                <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{listeningScore}점</div>
                                <div className="text-sm text-teal-600 dark:text-teal-400">🔊 듣기 ({listeningCorrect}/{listeningProblems.length})</div>
                            </div>
                            <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl p-4">
                                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{readingScore}점</div>
                                <div className="text-sm text-cyan-600 dark:text-cyan-400">📖 독해 ({readingCorrect}/{readingProblems.length})</div>
                            </div>
                        </div>
                        <div className="text-sm text-slate-400 mt-4">⏱ 소요시간: {formatTime(elapsedSeconds)}</div>
                    </div>

                    {/* ── 전체 듣기 해설 ── */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md p-6">
                        <h2 className="text-lg font-bold text-teal-700 dark:text-teal-300 mb-4">🔊 듣기 문제 해설 ({listeningCorrect}/{listeningProblems.length})</h2>
                        <div className="space-y-4">
                            {listeningProblems.map(p => {
                                const myAnswer = listeningAnswers[p.number];
                                const isCorrect = myAnswer === p.correctAnswer;
                                return (
                                    <div key={p.number} className={`rounded-xl p-3 shadow-sm ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>{p.number}</span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.instruction?.slice(0, 60)}</span>
                                            <span className={`ml-auto text-xs font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isCorrect ? '✅' : `❌ ${formatAnswer(myAnswer)} → ${p.correctAnswer + 1}번`}
                                            </span>
                                        </div>
                                        {/* 대본 */}
                                        {p.script && p.script.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-medium">📜 대본 보기</summary>
                                                <div className="mt-2 bg-white/80 dark:bg-slate-700/50 rounded-lg p-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                                                    {p.script.map((line: any, li: number) => (
                                                        <div key={li} className="flex gap-2">
                                                            <span className={`font-bold flex-shrink-0 ${line.speaker === 'W' ? 'text-pink-600' : line.speaker === 'N' ? 'text-purple-600' : 'text-blue-600'}`}>
                                                                {line.speaker === 'W' ? 'W:' : line.speaker === 'N' ? 'N:' : 'M:'}
                                                            </span>
                                                            <span className="text-slate-700 dark:text-slate-300">{line.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                        {/* 해설 */}
                                        {p.explanation && (
                                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-white/60 dark:bg-slate-700/40 rounded p-2">
                                                💡 {typeof p.explanation === 'string' ? p.explanation : JSON.stringify(p.explanation)}
                                            </div>
                                        )}
                                        {/* 다시 듣기 */}
                                        {p.audioUrl && (
                                            <button
                                                onClick={() => replayProblemAudio(p)}
                                                disabled={replayingProblem !== null}
                                                className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    replayingProblem === p.number
                                                        ? 'bg-teal-600 text-white animate-pulse'
                                                        : 'bg-teal-100 text-teal-700 hover:bg-teal-200 disabled:opacity-50'
                                                }`}
                                            >
                                                {replayingProblem === p.number ? '🔊 재생 중...' : '🔊 다시 듣기'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── 전체 독해 해설 ── */}
                    {readingProblems.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md p-6">
                            <h2 className="text-lg font-bold text-cyan-700 dark:text-cyan-300 mb-4">📖 독해 문제 해설 ({readingCorrect}/{readingProblems.length})</h2>
                            <div className="space-y-4">
                                {readingProblems.map(p => {
                                    const myAnswer = readingAnswers[p.number];
                                    const isCorrect = myAnswer === p.correctAnswer;
                                    return (
                                        <div key={p.number} className={`rounded-xl p-3 shadow-sm ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>{p.number}</span>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-1 truncate">{p.question?.slice(0, 60)}</span>
                                                <span className={`ml-auto text-xs font-bold flex-shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {isCorrect ? '✅' : `❌ ${formatAnswer(myAnswer)} → ${p.correctAnswer + 1}번`}
                                                </span>
                                            </div>
                                            {/* 지문 */}
                                            {(p.passage || p.paragraphs) && (
                                                <details className="mt-2">
                                                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-medium">📄 지문 보기</summary>
                                                    <div className="mt-2 bg-white/80 dark:bg-slate-700/50 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                        {typeof p.passage === 'string' ? p.passage : (p.passage ? JSON.stringify(p.passage, null, 2) : '지문 생략')}
                                                    </div>
                                                </details>
                                            )}
                                            {/* 해설 */}
                                            {p.explanation && (
                                                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-white/60 dark:bg-slate-700/40 rounded p-2">
                                                    💡 {typeof p.explanation === 'string' ? p.explanation : JSON.stringify(p.explanation)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════
    // Preparing Phase — 오디오 로딩 중
    // ══════════════════════════════════════
    if (phase === 'preparing') {
        const pct = preparingProgress.total > 0
            ? Math.round((preparingProgress.current / preparingProgress.total) * 100)
            : 0;
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="text-center space-y-6 max-w-sm w-full animate-premium-fade-in-up">
                    <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <span className="text-4xl animate-pulse">🎧</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">음원 다운로드 중</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">고품질 음성을 불러오고 있습니다</p>
                    <div className="space-y-3 px-4">
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#0A0E27] dark:bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                            {preparingProgress.current} / {preparingProgress.total}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════
    // Ready Phase — 다운로드 완료, 학생이 시작점 조절
    // ══════════════════════════════════════
    if (phase === 'ready') {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-8 animate-premium-fade-in-up">
                    <div className="text-center space-y-3">
                        <div className="w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">✅</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">음원 준비 완료!</h1>
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm">모든 음성 파일이 로딩되었습니다</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 space-y-3 border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
                            <p>• 시작 버튼을 누르면 안내방송이 시작됩니다</p>
                            <p>• 듣기는 자동 재생되며 중단할 수 없습니다</p>
                            <p>• 준비가 되면 아래 버튼을 눌러주세요</p>
                        </div>
                    </div>

                    <button
                        onClick={beginExam}
                        className="w-full py-5 bg-[#0A0E27] dark:bg-blue-600 text-white rounded-2xl font-bold text-xl shadow-xl hover:bg-[#1e2548] dark:hover:bg-blue-500 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">▶️</span>
                        테스트 시작
                    </button>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════
    // Opening Phase — 안내방송 중
    // ══════════════════════════════════════
    if (phase === 'opening') {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="text-center space-y-6 max-w-sm">
                    <div className="w-20 h-20 mx-auto bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-4xl animate-pulse">📢</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">안내방송 중</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">청한영어 모의고사 듣기평가</p>
                    <div className="flex justify-center gap-1.5">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-[#0A0E27] dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }



    // ══════════════════════════════════════
    // Main Layout — panels always mounted, toggled with display
    // ══════════════════════════════════════

    // Which panels are visible
    const showListeningPanel = isMobile ? mobileTab === 'listening' : true;
    const showReadingPanel = isMobile ? mobileTab === 'reading' : true;

    return (
        <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden">
            {/* Top Status Bar */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (phase !== 'done') {
                                if (confirm('듣기를 중단하고 나가시겠습니까?\n진행 상황은 저장되지 않습니다.')) {
                                    stopListening();
                                    window.history.back();
                                }
                            } else {
                                window.history.back();
                            }
                        }}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        ← 나가기
                    </button>
                    <span className="font-mono font-bold text-teal-400">⏱ {formatTime(elapsedSeconds)}</span>
                    <span className="text-slate-400">{getPhaseLabel()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-teal-300">🔊 {answeredListening}/{listeningProblems.length}</span>
                    <span className="text-cyan-300">📖 {answeredReading}/{readingProblems.length}</span>
                    <span className="text-slate-300">{totalAnswered}/{totalProblems}</span>
                </div>
            </div>

            {/* Mobile Tab Switcher — ★ sticky로 고정 */}
            {isMobile && (
                <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl flex-shrink-0 sticky top-0 z-30">
                    <button
                        onClick={() => setMobileTab('listening')}
                        className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                            mobileTab === 'listening'
                                ? 'text-teal-700 dark:text-teal-400 border-b-2 border-teal-600 bg-teal-50/50 dark:bg-teal-500/10'
                                : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        🔊 듣기 ({answeredListening}/{listeningProblems.length})
                    </button>
                    <button
                        onClick={() => setMobileTab('reading')}
                        disabled={!canViewReading}
                        className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                            mobileTab === 'reading'
                                ? 'text-cyan-700 dark:text-cyan-400 border-b-2 border-cyan-600 bg-cyan-50/50 dark:bg-cyan-500/10'
                                : canViewReading
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-300 dark:text-slate-600 opacity-50'
                        }`}
                    >
                        📖 독해 ({answeredReading}/{readingProblems.length})
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
                {/* ══ Listening Panel — ★ 스크롤 기반 전체 문제 리스트 ══ */}
                <div
                    className={`${isMobile ? 'w-full' : 'w-1/2'} bg-slate-50 dark:bg-slate-900 flex flex-col h-full relative`}
                    style={{ display: showListeningPanel ? 'flex' : 'none' }}
                >
                    <div
                        ref={listeningScrollRef}
                        onScroll={handleListeningScroll}
                        className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth hide-scrollbar"
                    >
                        {listeningProblems.map((problem) => {
                            const isCurrent = problem.number === currentListeningProblem?.number;
                            const isAnswered = listeningAnswers[problem.number] !== undefined;
                            return (
                                <div
                                    key={problem.number}
                                    ref={(el) => { problemRefsMap.current[problem.number] = el; }}
                                    className={`rounded-2xl p-4 space-y-3 transition-all duration-300 ${
                                        isCurrent
                                            ? 'bg-white dark:bg-slate-800 shadow-lg shadow-teal-200/40 dark:shadow-teal-500/10 ring-2 ring-teal-400/50'
                                            : isAnswered
                                            ? 'bg-white dark:bg-slate-800 shadow-sm'
                                            : 'bg-white/70 dark:bg-slate-800/50 opacity-80'
                                    }`}
                                >
                                    {/* 문제 헤더 */}
                                    <div className="flex items-center gap-2">
                                        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                            isCurrent ? 'bg-teal-600 text-white animate-pulse' : isAnswered ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                        }`}>{problem.number}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{problem.instruction}</div>
                                            {isCurrent && isSecondPlay && (
                                                <span className="text-xs text-amber-600 font-bold">🔁 두 번째 재생 중</span>
                                            )}
                                        </div>
                                        {isAnswered && <span className="text-teal-500 text-lg flex-shrink-0">✓</span>}
                                    </div>

                                    {/* 4번 그림 */}
                                    {problem.pictureUrl && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white relative">
                                            <img src={problem.pictureUrl} alt="그림 문제" className="w-full" />
                                            {problem.pictureMarkers?.map((m, mi) => (
                                                <div key={mi} className="absolute flex items-center justify-center w-6 h-6 bg-white border border-slate-900 rounded-full font-bold text-slate-900 text-xs shadow-md z-10 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                                                    {mi + 1}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!problem.pictureUrl && (problem as any).pictureElements && (
                                        <PictureRenderer elements={(problem as any).pictureElements} description={problem.pictureDescription} />
                                    )}
                                    {!problem.pictureUrl && !(problem as any).pictureElements && problem.pictureDescription && (
                                        <div className="border-2 border-slate-800 rounded-lg p-4 bg-white">
                                            <div className="text-center text-slate-400 text-xs mb-2">🖼️ 그림 문제</div>
                                            <div className="text-sm text-slate-600 text-center italic">{problem.pictureDescription}</div>
                                        </div>
                                    )}

                                    {/* 10번 도표 */}
                                    {problem.chartData && (
                                        <div className="border-2 border-slate-800 rounded-lg p-3 bg-white">
                                            <ChartRenderer chartData={problem.chartData as any} />
                                        </div>
                                    )}

                                    {/* 선택지 */}
                                    <div className="space-y-1.5">
                                        {problem.choices?.map((choice, ci) => (
                                            <button
                                                key={ci}
                                                onClick={() => selectListeningAnswer(problem.number, ci)}
                                                className={`w-full flex gap-2.5 items-center px-3.5 py-2.5 rounded-xl text-left transition-all ${
                                                    listeningAnswers[problem.number] === ci
                                                        ? 'bg-teal-600 text-white shadow-md'
                                                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                                                    listeningAnswers[problem.number] === ci
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                                }`}>{ci + 1}</span>
                                                <span className="text-sm">{choice}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* 6번 메모 */}
                                    {problem.needsMemo && (
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">📝 메모 (계산용)</div>
                                            <textarea
                                                value={memos[problem.number] || ''}
                                                onChange={(e) => updateMemo(problem.number, e.target.value)}
                                                placeholder="계산 메모..."
                                                className="w-full h-20 p-3 bg-amber-50 dark:bg-amber-900/20 border-0 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-amber-300 dark:text-amber-100 dark:placeholder-amber-400/50"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ★ '현재 듣기로' 플로팅 버튼 — Apple 스타일 pill */}
                    {userScrolledAway && currentListeningProblem && phase !== 'done' && phase !== 'reading_time' && (
                        <button
                            onClick={scrollToCurrentProblem}
                            className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-900 dark:text-white rounded-full shadow-lg border border-slate-200/60 dark:border-slate-600/60 text-sm font-semibold flex items-center gap-2 z-20 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{currentListeningProblem.number}</span>
                            현재 듣기로
                        </button>
                    )}
                </div>

                {/* ── Reading Panel (always mounted, scroll preserved) ── */}
                <div
                    className={`${isMobile ? 'w-full' : 'w-1/2'} bg-slate-100 dark:bg-slate-950 h-full overflow-y-auto p-4 space-y-6 hide-scrollbar`}
                    style={{ display: showReadingPanel ? 'block' : 'none' }}
                >
                    {!canViewReading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-slate-400">
                                <div className="text-4xl mb-3">📖</div>
                                <p className="text-sm">&quot;문제지를 넘기시기 바랍니다&quot; 이후 활성화됩니다</p>
                            </div>
                        </div>
                    ) : (
                        (() => {
                            const longGroup = orderedReadingProblems.filter(p => p.number >= 43 && p.number <= 45);
                            const normalProblems = orderedReadingProblems.filter(p => p.number < 43 || p.number > 45);
                            const longPassageRendered = longGroup.length > 0;

                            // ── 모든 문제에서 지문 텍스트를 수집하는 함수 ──
                            const extractPassageText = (): string => {
                                for (const prob of longGroup) {
                                    // 1) passage가 문자열이면 바로 사용
                                    if (typeof prob.passage === 'string' && prob.passage.trim().length > 10) {
                                        return prob.passage;
                                    }
                                    // 2) paragraphs에서 텍스트 추출 시도
                                    if (prob.paragraphs) {
                                        const texts: string[] = [];
                                        if (Array.isArray(prob.paragraphs)) {
                                            for (const p of prob.paragraphs as any[]) {
                                                if (typeof p === 'string') texts.push(p);
                                                else if (p && typeof p === 'object') {
                                                    const t = p.text || p.content || p.paragraph || '';
                                                    if (typeof t === 'string' && t.trim()) texts.push(t);
                                                }
                                            }
                                        } else if (typeof prob.paragraphs === 'object') {
                                            for (const val of Object.values(prob.paragraphs)) {
                                                if (typeof val === 'string' && val.trim()) texts.push(val);
                                                else if (val && typeof val === 'object') {
                                                    const t = (val as any).text || (val as any).content || '';
                                                    if (typeof t === 'string' && t.trim()) texts.push(t);
                                                }
                                            }
                                        }
                                        if (texts.join('').trim().length > 10) {
                                            return texts.join('\n\n');
                                        }
                                    }
                                    // 3) passage가 객체면 stringify
                                    if (prob.passage && typeof prob.passage === 'object') {
                                        return JSON.stringify(prob.passage, null, 2);
                                    }
                                }
                                return '';
                            };

                            // ── paragraphs를 (A)(B)(C)(D) 단락 배열로 정규화 ──
                            const extractParagraphs = (): { label: string; text: string }[] => {
                                const labels = ['(A)', '(B)', '(C)', '(D)', '(E)'];
                                for (const prob of longGroup) {
                                    if (!prob.paragraphs) continue;

                                    if (Array.isArray(prob.paragraphs) && prob.paragraphs.length > 0) {
                                        const result: { label: string; text: string }[] = [];
                                        const items = prob.paragraphs as any[];
                                        for (let i = 0; i < items.length; i++) {
                                            const p = items[i];
                                            if (typeof p === 'string' && p.trim()) {
                                                result.push({ label: labels[i] || `(${i + 1})`, text: p });
                                            } else if (p && typeof p === 'object') {
                                                const text = p.text || p.content || p.paragraph || '';
                                                const label = p.label || labels[i] || `(${i + 1})`;
                                                if (typeof text === 'string' && text.trim()) {
                                                    result.push({ label: String(label), text });
                                                }
                                            }
                                        }
                                        if (result.length > 0 && result.some(r => r.text.length > 10)) return result;
                                    } else if (typeof prob.paragraphs === 'object') {
                                        const result: { label: string; text: string }[] = [];
                                        for (const [key, val] of Object.entries(prob.paragraphs)) {
                                            const text = typeof val === 'string' ? val : ((val as any)?.text || (val as any)?.content || '');
                                            if (typeof text === 'string' && text.trim()) {
                                                result.push({ label: `(${key})`, text });
                                            }
                                        }
                                        if (result.length > 0 && result.some(r => r.text.length > 10)) return result;
                                    }
                                }
                                return [];
                            };

                            const parasArray = extractParagraphs();
                            const passageText = parasArray.length === 0 ? extractPassageText() : '';

                            return (
                                <>
                                    {/* ── 장문 세트 (43-45) — 공유 지문 ── */}
                                    {longPassageRendered && (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden">
                                            <div className="bg-cyan-50/80 dark:bg-cyan-900/20 px-4 py-2.5 flex items-center justify-between">
                                                <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">📖 장문 [43~45] 공유 지문</span>
                                                <span className="text-[10px] text-cyan-500 dark:text-cyan-400">문장 클릭=하이라이트 | (a)~(e) 클릭=파랑/초록표시</span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {parasArray.length > 0 ? (
                                                    // ── (A)~(D) 단락 렌더링 ──
                                                    (() => {
                                                        let globalSentenceIdx = 0;
                                                        return parasArray.map((para, pi) => {
                                                            const sentences: string[] = para.text.match(/[^.!?]+[.!?]+/g) || [para.text];
                                                        return (
                                                            <div key={pi} className="rounded-lg p-3 mx-2 bg-slate-50 dark:bg-slate-700/30">
                                                                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/40 px-1.5 py-0.5 rounded">{String(para.label || '')}</span>
                                                                <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                                                                    {sentences.map((sentence: string) => {
                                                                        const idx = globalSentenceIdx++;
                                                                        const isHighlighted = (highlights[9999] || []).includes(idx);
                                                                        return (
                                                                            <span
                                                                                key={idx}
                                                                                onClick={() => toggleLongHighlight(idx)}
                                                                                className={`cursor-pointer transition-colors ${
                                                                                    isHighlighted ? 'bg-yellow-200/60 rounded px-0.5' : 'hover:bg-yellow-50'
                                                                                }`}
                                                                            >
                                                                                {renderParagraphWithRefs(sentence.trim(), idx)}{' '}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()
                                                ) : (
                                                    // ── paragraphs 구조 분석 실패 → passage 텍스트 직접 표시 ──
                                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap px-2">
                                                        {passageText || '⚠️ 장문 지문 데이터가 없습니다. 관리자 페이지에서 43~45번을 다시 생성해주세요.'}
                                                    </p>
                                                )}
                                            </div>
                                            {/* 43~45번 각 문제 */}
                                            {longGroup.map((problem) => (
                                                <div key={problem.number} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="px-4 py-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-7 h-7 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{problem.number}</span>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{problem.question}</span>
                                                        </div>
                                                        {readingAnswers[problem.number] !== undefined && (
                                                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">✓</span>
                                                        )}
                                                    </div>
                                                    <div className="px-4 pb-4 pt-2">
                                                        {/* 44번: 지문에서 (a)~(e) 클릭으로 선택 */}
                                                        {problem.type === 'r_long_reference' ? (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                                                                ☝ 위 지문에서 (a)~(e)를 클릭하여 파랑/초록으로 표시하세요. 나머지 넷과 다른 하나를 선택지에서 골라주세요.
                                                                <div className="mt-2 flex gap-1.5">
                                                                    {problem.choices?.map((choice, ci) => {
                                                                        const isSelected = readingAnswers[problem.number] === ci;
                                                                        // ★ refColors 연동: 지문의 (a)~(e) 색상을 선택지에 반영
                                                                        const choiceColor = refColors[choice]; // choice = "(a)", "(b)" 등
                                                                        const colorClass = isSelected
                                                                            ? 'bg-cyan-600 text-white'
                                                                            : choiceColor === 'blue'
                                                                            ? 'bg-blue-200 text-blue-800 border border-blue-300'
                                                                            : choiceColor === 'green'
                                                                            ? 'bg-emerald-200 text-emerald-800 border border-emerald-300'
                                                                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600';
                                                                        return (
                                                                            <button
                                                                                key={ci}
                                                                                onClick={() => selectReadingAnswer(problem.number, ci)}
                                                                                className={`flex-1 py-2 rounded-lg text-center text-sm font-bold transition-all ${colorClass}`}
                                                                            >
                                                                                {choice}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {problem.choices?.map((choice, ci) => (
                                                                    <button
                                                                        key={ci}
                                                                        onClick={() => selectReadingAnswer(problem.number, ci)}
                                                                        className={`w-full flex gap-1.5 items-start px-2.5 py-1.5 rounded-lg text-left text-[13px] leading-snug transition-all ${
                                                                            readingAnswers[problem.number] === ci
                                                                                ? 'bg-cyan-600 text-white'
                                                                                : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                        }`}
                                                                    >
                                                                        <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${
                                                                            readingAnswers[problem.number] === ci
                                                                                ? 'bg-white/20 text-white'
                                                                                : 'bg-white dark:bg-slate-600 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-500'
                                                                        }`}>{ci + 1}</span>
                                                                        <span>{choice}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── 일반 독해 문제 ── */}
                                    {normalProblems.map((problem) => {
                                        const isNotice = problem.type === 'r_notice_mismatch' || problem.type === 'r_notice_match';
                                        const isChart = problem.type === 'r_chart';

                                        return (
                                            <div key={problem.number} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden`}>
                                                <div className={`px-4 py-2.5 flex items-center justify-between ${
                                                    isNotice ? 'bg-amber-50 dark:bg-amber-900/20' : isChart ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-slate-50 dark:bg-slate-700/30'
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-7 h-7 text-white rounded-full flex items-center justify-center text-xs font-bold ${
                                                            isNotice ? 'bg-amber-600' : isChart ? 'bg-violet-600' : 'bg-cyan-600'
                                                        }`}>{problem.number}</span>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{problem.question || (problem as any).instruction || `${problem.number}번`}</span>
                                                    </div>
                                                    {readingAnswers[problem.number] !== undefined && (
                                                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">✓</span>
                                                    )}
                                                </div>

                                                <div className="p-4 space-y-4">
                                                    {/* 안내문(27,28) — 문장 클릭 하이라이트 가능 */}
                                                    {isNotice && problem.passage && (
                                                        <div className="rounded-lg p-4 bg-slate-50 dark:bg-slate-700/30">
                                                            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                                {(() => {
                                                                    const sentences = problem.passage.match(/[^\n]+/g) || [problem.passage];
                                                                    return sentences.map((line: string, si: number) => (
                                                                        <span
                                                                            key={si}
                                                                            onClick={() => toggleHighlight(problem.number, si)}
                                                                            className={`cursor-pointer transition-colors block ${
                                                                                (highlights[problem.number] || []).includes(si)
                                                                                    ? 'bg-yellow-200/60 rounded px-1'
                                                                                    : 'hover:bg-yellow-50'
                                                                            }`}
                                                                        >
                                                                            {line}
                                                                        </span>
                                                                    ));
                                                                })()}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-2 text-right">💡 줄을 클릭하면 근거를 표시할 수 있습니다</div>
                                                        </div>
                                                    )}

                                                    {/* 일반 지문 (도표 문제는 차트 뒤에 표시) */}
                                                    {!isNotice && !isChart && problem.passage && (
                                                        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                                            {problem.sentences && problem.sentences.length > 0 ? (
                                                                problem.sentences.map((sentence, si) => (
                                                                    <span
                                                                        key={si}
                                                                        onClick={() => toggleHighlight(problem.number, si)}
                                                                        className={`cursor-pointer transition-colors ${
                                                                            (highlights[problem.number] || []).includes(si)
                                                                                ? 'bg-yellow-200/60 rounded px-0.5'
                                                                                : 'hover:bg-yellow-50'
                                                                        }`}
                                                                    >
                                                                        {sentence}{' '}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <p className="whitespace-pre-wrap">{problem.passage}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 도표(25) — 수능 스타일: SVG 바 차트 + ①~⑤ 인라인 선택 */}
                                                    {problem.chartData && (
                                                        <div className="rounded-lg p-4 bg-slate-50 dark:bg-slate-700/30">
                                                            <ChartRenderer chartData={problem.chartData as any} />
                                                            {/* 도표 아래 지문 — ①~⑤ 클릭 선택 */}
                                                            {problem.passage && (
                                                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                                                    {(() => {
                                                                        const markers = ['①', '②', '③', '④', '⑤'];
                                                                        // Split passage by ①~⑤ markers
                                                                        const parts = problem.passage.split(/(①|②|③|④|⑤)/);
                                                                        return parts.map((part, pi) => {
                                                                            const markerIdx = markers.indexOf(part);
                                                                            if (markerIdx >= 0) {
                                                                                const isSelected = readingAnswers[problem.number] === markerIdx;
                                                                                return (
                                                                                    <span
                                                                                        key={pi}
                                                                                        onClick={() => selectReadingAnswer(problem.number, markerIdx)}
                                                                                        className={`inline-block cursor-pointer font-bold px-0.5 rounded transition-all ${
                                                                                            isSelected
                                                                                                ? 'bg-cyan-600 text-white scale-110'
                                                                                                : 'text-cyan-700 hover:bg-cyan-100'
                                                                                        }`}
                                                                                        title={`${part} 선택`}
                                                                                    >
                                                                                        {part}
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return <span key={pi}>{part}</span>;
                                                                        });
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 선택지 (도표 문제는 인라인 선택이므로 제외) */}
                                                    {!isChart && (
                                                    <div className="space-y-1">
                                                        {problem.choices?.map((choice, ci) => (
                                                            <button
                                                                key={ci}
                                                                onClick={() => selectReadingAnswer(problem.number, ci)}
                                                                className={`w-full flex gap-1.5 items-start px-2.5 py-1.5 rounded-lg text-left text-[13px] leading-snug transition-all ${
                                                                    readingAnswers[problem.number] === ci
                                                                        ? 'bg-cyan-600 text-white'
                                                                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${
                                                                    readingAnswers[problem.number] === ci
                                                                        ? 'bg-white/20 text-white'
                                                                        : 'bg-white dark:bg-slate-600 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-500'
                                                                }`}>{ci + 1}</span>
                                                                <span>{choice}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            );
                        })()
                    )}
                </div>
            </div>

            {/* Bottom Submit Bar */}
            {(phase === 'reading_time' || phase === 'done' || totalAnswered === totalProblems) && (
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-4 py-3 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        📝 제출하기 ({totalAnswered}/{totalProblems} 완료)
                    </button>
                </div>
            )}
        </div>
    );
}
