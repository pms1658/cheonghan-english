import { useState } from 'react';
import { Word } from '@/types';
import { useTTS } from '@/hooks/useTTS';

interface FlashcardStudyProps {
    words: Word[];
    onFinish: () => void;
    onExit: () => void;
}

export default function FlashcardStudy({ words = [], onFinish, onExit }: FlashcardStudyProps) {
    const safeWords = Array.isArray(words) ? words : [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const { speak } = useTTS();

    const currentWord = safeWords[currentIndex];
    const progress = safeWords.length > 0 ? ((currentIndex + 1) / safeWords.length) * 100 : 0;

    if (!currentWord) return <div className="flex h-full items-center justify-center text-slate-500">No words to study.</div>;
    // ... (rest of the file until the button)

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            if (currentIndex < safeWords.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                onFinish();
            }
        }, 150); // slight delay to allow flip reset visual if needed, though usually reset state first
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
            {/* Top Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-100 z-10">
                <button onClick={onExit} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400">FLASHCARD</span>
                    <span className="text-sm font-bold text-slate-800">{currentIndex + 1} <span className="text-slate-300">/</span> {safeWords.length}</span>
                </div>
                <div className="w-6"></div> {/* Spacer */}
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 w-full">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 perspective-1000">
                <div
                    className="relative w-full max-w-md cursor-pointer group"
                    style={{ minHeight: '380px', height: 'min(500px, 60vh)' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div className={`w-full h-full relative transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                        {/* Front (Term) */}
                        <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden border border-slate-100">
                            <span className="absolute top-8 left-8 text-xs font-bold text-slate-300 tracking-widest">TERM</span>
                            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 text-center break-words leading-tight">{currentWord.term}</h2>
                            <div className="flex items-center gap-2 mt-4 opacity-80">
                                {currentWord.partOfSpeech && (
                                    <span className="text-sm font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 tracking-wider">
                                        {currentWord.partOfSpeech}
                                    </span>
                                )}
                                {currentWord.pronunciation && (
                                    <p className="text-xl text-slate-400 font-serif font-normal tracking-wide">{currentWord.pronunciation}</p>
                                )}
                            </div>
                            <p className="absolute bottom-8 text-sm text-slate-400 font-medium animate-pulse">Tap to flip</p>
                        </div>

                        {/* Back (Meaning) */}
                        <div className="absolute inset-0 bg-[#0A0E27] rounded-3xl shadow-2xl flex flex-col backface-hidden rotate-y-180 text-white overflow-hidden">
                            <span className="pt-6 pl-8 text-xs font-bold text-blue-300 tracking-widest shrink-0">MEANING</span>
                            <div
                                className="flex-1 overflow-y-auto px-8 py-4 flex flex-col items-center justify-center gap-4"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                                onClick={(e) => {
                                    // Allow scrolling without flipping when content is scrollable
                                    const el = e.currentTarget;
                                    if (el.scrollHeight > el.clientHeight) {
                                        e.stopPropagation();
                                    }
                                }}
                            >
                                <h2 className={`font-bold text-center leading-snug break-words ${
                                    currentWord.meaning.length > 100 ? 'text-base lg:text-lg' :
                                    currentWord.meaning.length > 60 ? 'text-lg lg:text-xl' :
                                    currentWord.meaning.length > 30 ? 'text-xl lg:text-2xl' :
                                    'text-2xl lg:text-3xl'
                                }`}>{currentWord.meaning}</h2>

                                {currentWord.contextSentence && (
                                    <div className="w-full bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5 shrink-0">
                                        <p className={`leading-relaxed font-serif text-blue-50 text-center ${
                                            currentWord.contextSentence.length > 80 ? 'text-sm' : 'text-base lg:text-lg'
                                        }`}>&quot;{currentWord.contextSentence}&quot;</p>
                                    </div>
                                )}
                            </div>

                            {/* Audio Button */}
                            <div className="shrink-0 flex justify-end px-6 pb-5 pt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        speak(currentWord.term);
                                    }}
                                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] bg-white border-t border-slate-100 z-[101] flex justify-between items-center max-w-4xl mx-auto w-full">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="px-6 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold disabled:opacity-30 hover:bg-slate-100 transition-colors"
                >
                    이전
                </button>
                <button
                    onClick={handleNext}
                    className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    {currentIndex === safeWords.length - 1 ? (
                        <>테스트 보기 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></>
                    ) : (
                        <>다음 Word <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></>
                    )}
                </button>
            </div>
        </div>
    );
}
