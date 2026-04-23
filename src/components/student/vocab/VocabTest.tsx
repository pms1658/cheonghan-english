import { useState, useEffect, useMemo } from 'react';
import { Word } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface VocabTestProps {
    words: Word[];
    allWords: Word[];
    testMode?: 'default' | 'reverse' | 'typing' | 'typing-ko';
    onComplete: (answers: Record<number, string>) => void;
    onExit: () => void;
    initialAnswers?: Record<number, string>;
    initialIndex?: number;
    onAnswerUpdate?: (answers: Record<number, string>, currentIndex: number) => void;
    initialShuffleOrder?: number[];
    onShuffleReady?: (order: number[]) => void;
}

export default function VocabTest({ words = [], allWords = [], testMode = 'default', onComplete, onExit, initialAnswers, initialIndex, onAnswerUpdate, initialShuffleOrder, onShuffleReady }: VocabTestProps) {
    // ★ Shuffle words on mount (Fisher-Yates), or restore from saved order
    const safeWords = useMemo(() => {
        const arr = Array.isArray(words) ? words : [];
        if (initialShuffleOrder && initialShuffleOrder.length === arr.length) {
            // Restore saved shuffle order
            const restored = initialShuffleOrder.map(i => arr[i]).filter(Boolean);
            if (restored.length === arr.length) return restored;
        }
        // Fresh shuffle
        const indices = arr.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        // Notify parent of shuffle order for draft saving
        onShuffleReady?.(indices);
        return indices.map(i => arr[i]);
    }, [words]);
    const safeAllWords = Array.isArray(allWords) ? allWords : [];



    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers || {});
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [typedAnswer, setTypedAnswer] = useState(''); // For typing mode
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

    const currentWord = safeWords[currentIndex];

    // Generate Options
    useEffect(() => {
        const generateOptions = () => {
            if (!currentWord) return [];
            if (testMode === 'typing' || testMode === 'typing-ko') return [];

            // Use allWords for distractors to ensure we have enough options even in retry mode
            // Filter out the correct meaning to avoid duplicates
            const distractorsSource = (safeAllWords.length > 0 ? safeAllWords : safeWords);
            const others = distractorsSource.filter(w => w && w.meaning !== currentWord.meaning);

            // 6-choice question (1 correct + 5 wrong)
            const wrongOptions = others.sort(() => 0.5 - Math.random()).slice(0, 5);

            // For Reverse mode, show English terms. For Default, show Korean meanings.
            const getOptionContent = (w: Word) => testMode === 'reverse' ? w.term : w.meaning;

            return [...wrongOptions.map(getOptionContent), getOptionContent(currentWord)].sort(() => 0.5 - Math.random());
        };
        setOptions(generateOptions());
    }, [currentIndex, currentWord, words, allWords, testMode]);

    const handleSelect = (option: string) => {
        if (selectedOption) return; // Block double click

        setSelectedOption(option);

        const correctAnswer = testMode === 'reverse' ? currentWord.term : currentWord.meaning;
        const correct = option === correctAnswer;

        setIsCorrect(correct);
        setAnswers(prev => {
            const updated = { ...prev, [currentIndex]: option };
            onAnswerUpdate?.(updated, currentIndex + 1);
            return updated;
        });

        // Show Full Screen Feedback
        setShowFeedback(correct ? 'correct' : 'wrong');

        // Auto Advance
        setTimeout(() => {
            setShowFeedback(null);
            if (currentIndex < safeWords.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setSelectedOption(null);
                setIsCorrect(null);
            } else {
                finishTest({ ...answers, [currentIndex]: option });
            }
        }, correct ? 800 : 1500); // 1.5s for wrong to see the X
    };

    const handleTypingSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (isCorrect !== null) return; // Already submitted

        const correctTerm = currentWord.term.trim().toLowerCase();
        const inputTerm = typedAnswer.trim().toLowerCase();

        const correct = inputTerm === correctTerm;
        setIsCorrect(correct);
        setAnswers(prev => {
            const updated = { ...prev, [currentIndex]: typedAnswer };
            onAnswerUpdate?.(updated, currentIndex + 1);
            return updated;
        });

        setShowFeedback(correct ? 'correct' : 'wrong');

        setTimeout(() => {
            setShowFeedback(null);
            if (currentIndex < safeWords.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setTypedAnswer('');
                setIsCorrect(null);
            } else {
                finishTest({ ...answers, [currentIndex]: typedAnswer });
            }
        }, correct ? 800 : 1500);
    };

    // ★ typing-ko: No feedback, instant advance. Student types Korean meaning.
    const handleTypingKoSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const input = typedAnswer.trim();
        // Store whatever was typed (even empty = unanswered)
        const updatedAnswers = { ...answers, [currentIndex]: input };
        setAnswers(updatedAnswers);
        onAnswerUpdate?.(updatedAnswers, currentIndex + 1);

        if (currentIndex < safeWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setTypedAnswer('');
        } else {
            finishTest({ ...updatedAnswers });
        }
    };

    const finishTest = (finalAnswers: Record<number, string>) => {
        // ★ CRITICAL FIX: Remap shuffled indices → original word indices
        const originalWords = Array.isArray(words) ? words : [];
        const remappedAnswers: Record<number, string> = {};
        
        Object.entries(finalAnswers).forEach(([shuffledIdxStr, answer]) => {
            const shuffledIdx = Number(shuffledIdxStr);
            const shuffledWord = safeWords[shuffledIdx];
            if (!shuffledWord) return;
            
            const originalIdx = originalWords.findIndex(w => 
                w.term === shuffledWord.term && w.meaning === shuffledWord.meaning
            );
            
            if (originalIdx !== -1) {
                remappedAnswers[originalIdx] = answer;
            } else {
                remappedAnswers[shuffledIdx] = answer;
            }
        });
        
        onComplete(remappedAnswers);
    };



    const progress = (safeWords.length > 0) ? ((currentIndex) / safeWords.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
            {/* Full Screen Feedback Overlay */}
            {showFeedback && (
                <div className="absolute inset-0 z-50 flex items-center justify-center animate-fadeIn pointer-events-none">
                    <div className="absolute inset-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-[2px]"></div>
                    {showFeedback === 'correct' ? (
                        <div className="relative">
                            <div className="w-64 h-64 rounded-full border-[16px] border-blue-500 animate-scaleIn flex items-center justify-center">
                                {/* O Shape (Circle is enough, but let's make it look like a clear O) */}
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* X Shape */}
                            <svg className="w-80 h-80 text-red-500 drop-shadow-2xl animate-scaleIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                    )}
                </div>
            )}

            {/* Top Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/10">
                <button onClick={() => { if (confirm('시험을 중단하시겠습니까?')) onExit(); }} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                    그만두기
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-red-500 tracking-wider">TEST MODE</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{currentIndex + 1} <span className="text-slate-300">/ </span> {safeWords.length}</span>
                </div>
                <div className="w-12"></div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 w-full">
                <div
                    className="h-full bg-red-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
                <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`vocab-${currentIndex}`}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="w-full flex flex-col items-center"
                >
                {/* Question Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-10 w-full mb-8 flex flex-col items-center justify-center min-h-[200px] border border-slate-100 dark:border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Question</span>
                    {(testMode === 'default' || testMode === 'typing-ko') ? (
                        <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white text-center relative z-10">{currentWord?.term}</h1>
                    ) : (
                        <h1 className={`font-bold text-slate-800 dark:text-white text-center relative z-10 leading-snug break-words ${
                            (currentWord?.meaning?.length || 0) > 80 ? 'text-lg lg:text-xl' :
                            (currentWord?.meaning?.length || 0) > 50 ? 'text-xl lg:text-2xl' :
                            'text-3xl lg:text-4xl'
                        }`}>{currentWord?.meaning}</h1>
                    )}
                </div>

                {/* Options / Typing Input */}
                {testMode === 'typing-ko' ? (
                    /* ★ Korean meaning typing — no feedback, instant advance */
                    <form onSubmit={handleTypingKoSubmit} className="w-full relative z-20">
                        <input
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="한글 뜻을 입력하세요..."
                            className="w-full p-4 text-center text-2xl font-bold rounded-2xl border-2 border-amber-100 dark:border-amber-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 outline-none transition-all shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                            autoFocus
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => handleTypingKoSubmit()}
                                className="flex-1 py-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold transition-all text-sm"
                            >
                                건너뛰기
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-4 rounded-xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-200 dark:shadow-amber-900/30 hover:bg-amber-600 transition-all"
                            >
                                다음 →
                            </button>
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-3">Enter를 눌러도 다음으로 넘어갑니다</p>
                    </form>
                ) : testMode === 'typing' ? (
                    <form onSubmit={handleTypingSubmit} className="w-full relative z-20">
                        <input
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="Type the English word..."
                            className="w-full p-4 text-center text-2xl font-bold rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                            autoFocus
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            disabled={isCorrect !== null}
                        />
                        <button
                            type="submit"
                            disabled={!typedAnswer || isCorrect !== null}
                            className="w-full mt-4 py-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            제출하기
                        </button>
                        {isCorrect === false && (
                            <div className="mt-4 text-center animate-shake">
                                <p className="text-red-500 font-bold">Correct Answer:</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentWord.term}</p>
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        {options.map((option, idx) => {
                            let stateClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20";
                            if (selectedOption) {
                                if (testMode === 'reverse' ? option === currentWord.term : option === currentWord.meaning) {
                                    stateClass = "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-200"; // Correct
                                } else if (option === selectedOption) {
                                    stateClass = "bg-red-100 border-red-500 text-red-700 ring-2 ring-red-200 animate-shake"; // Wrong
                                } else {
                                    stateClass = "bg-slate-50 border-slate-100 text-slate-300 opacity-50"; // Dim others
                                }
                            }

                            // Dynamic font size based on option text length
                            const fontSize = option.length > 80 ? 'text-xs lg:text-sm' :
                                             option.length > 50 ? 'text-sm lg:text-base' :
                                             'text-base lg:text-lg';

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(option)}
                                    disabled={selectedOption !== null}
                                    className={`p-4 rounded-2xl border-2 font-bold ${fontSize} text-left transition-all duration-200 ${stateClass}`}
                                >
                                    <div className="flex justify-between items-start w-full gap-2">
                                        <span className="leading-snug break-words min-w-0 flex-1">{option}</span>
                                        {selectedOption && (testMode === 'reverse' ? option === currentWord.term : option === currentWord.meaning) && (
                                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        )}
                                        {selectedOption && option === selectedOption && !(testMode === 'reverse' ? option === currentWord.term : option === currentWord.meaning) && (
                                            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                </motion.div>
                </AnimatePresence>
            </div>
            <style jsx>{`
                @keyframes scaleIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0 } 
                }
                .animate-scaleIn {
                    animation: scaleIn 0.8s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
}
