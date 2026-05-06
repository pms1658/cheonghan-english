import { Word } from '@/types';

interface VocabResultProps {
    score: number;
    words: Word[];
    finalAnswers: Record<number, string>;
    testMode?: 'default' | 'reverse' | 'typing' | 'typing-ko';
    aiResults?: Record<number, boolean> | null;
    onRetry: (onlyWrong?: boolean) => void;
    onNewAttempt?: () => void;
    onOverview: () => void;
    onExit: () => void;
}

export default function VocabResult({ score, words, finalAnswers, testMode = 'default', aiResults, onRetry, onNewAttempt, onOverview, onExit }: VocabResultProps) {
    // [Request] Vocab requires 100% to pass
    const isPass = score === 100;

    const checkCorrect = (word: Word, idx: number): boolean => {
        // ★ typing-ko: use AI results
        if (testMode === 'typing-ko' && aiResults) {
            return !!aiResults[idx];
        }
        const isReverse = testMode === 'reverse' || testMode === 'typing';
        const correctAnswer = isReverse ? word.term : word.meaning;
        const userAnswer = finalAnswers ? finalAnswers[idx] : undefined;
        if (!userAnswer) return false;
        if (testMode === 'typing') return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        return userAnswer === correctAnswer;
    };

    const wrongCount = words.filter((word, idx) => {
        if (!word) return false;
        return !checkCorrect(word, idx);
    }).length;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
            {/* Island Card */}
            <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden">
                {/* Navy Score Header */}
                <div className="relative bg-[#0A0E27] p-6 text-center">
                    <div className="relative z-10">
                        <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] mb-3 border border-white/10 text-white/70">VOCABULARY TEST</div>
                        <div className="flex justify-center items-baseline gap-2">
                            <span className={`text-5xl font-black tracking-tighter ${isPass ? 'text-emerald-400' : 'text-yellow-400'}`}>{score}</span>
                            <span className="text-lg text-slate-400 font-medium">/ 100</span>
                        </div>
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-3 ${isPass ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-400/20 text-red-300 border border-red-400/30'}`}>
                            {isPass ? '✅ PASS' : `❌ ${wrongCount}개 오답`}
                        </div>
                    </div>
                </div>

                {/* Answer List */}
                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                    {Array.isArray(words) && words.map((word, idx) => {
                        const userAnswer = finalAnswers ? finalAnswers[idx] : undefined;
                        if (!word) return null;

                        const isReverse = testMode === 'reverse' || testMode === 'typing';
                        const correctAnswer = testMode === 'typing-ko' ? word.meaning : (isReverse ? word.term : word.meaning);
                        const questionText = testMode === 'typing-ko' ? word.term : (isReverse ? word.meaning : word.term);
                        const isCorrect = checkCorrect(word, idx);

                        return (
                            <div key={idx} className={`p-3 rounded-xl border-l-4 flex items-start justify-between bg-slate-50
                                ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">Q{idx + 1}</div>
                                    <div className="font-bold text-slate-800 text-base mb-0.5">{questionText}</div>
                                    <div className="text-[13px] text-slate-500">
                                        <span className="font-semibold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2">정답</span>
                                        {correctAnswer}
                                    </div>
                                    {/* typing-ko: Show student input for both correct (synonym accepted) and wrong */}
                                    {testMode === 'typing-ko' && userAnswer && (
                                        <div className={`text-[13px] mt-0.5 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                            <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded mr-2 ${isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>나의 답</span>
                                            {userAnswer}{isCorrect && userAnswer !== correctAnswer ? ' ✓ (유의어 인정)' : ''}
                                        </div>
                                    )}
                                    {/* Non typing-ko: only show wrong answers */}
                                    {testMode !== 'typing-ko' && !isCorrect && (
                                        <div className="text-[13px] text-red-500 mt-0.5">
                                            <span className="font-semibold text-[10px] bg-red-50 px-1.5 py-0.5 rounded text-red-500 mr-2">나의 답</span>
                                            {userAnswer || '(미입력)'}
                                        </div>
                                    )}
                                </div>
                                <div className="ml-3 flex items-center">
                                    {isCorrect ? (
                                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Buttons - inside island */}
                <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex gap-2">
                        {score < 100 ? (
                            <button
                                onClick={() => onRetry(true)}
                                className="flex-1 py-3 rounded-xl bg-[#0A0E27] text-white font-bold hover:bg-[#1a1f3d] transition-all text-sm"
                            >
                                오답 학습하기 ({wrongCount})
                            </button>
                        ) : (
                            <button
                                onClick={onOverview}
                                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm"
                            >
                                단어 리스트
                            </button>
                        )}
                        {onNewAttempt && (
                            <button
                                onClick={onNewAttempt}
                                className="flex-1 py-3 rounded-xl bg-[#0A0E27] text-white font-bold hover:bg-[#1a1f3d] transition-all text-sm"
                            >
                                🔄 학습하기
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onExit}
                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-all text-sm"
                    >
                        나가기
                    </button>
                </div>
            </div>
        </div>
    );
}
