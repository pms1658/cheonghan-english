import { useState } from 'react';
import { Word } from '@/types';

interface VocabSelectorProps {
    words: Word[];
    onSubmit: (selectedIndices: number[]) => void;
    onExit: () => void;
}

export default function VocabSelector({ words, onSubmit, onExit }: VocabSelectorProps) {
    const safeWords = Array.isArray(words) ? words : [];
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleSelection = (index: number) => {
        if (isSubmitting) return;
        setSelectedIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleSelectAll = () => {
        if (isSubmitting) return;
        if (selectedIndices.length === safeWords.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(safeWords.map((_, i) => i));
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-900 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex-shrink-0 flex justify-between items-center shadow-sm">
                <button
                    onClick={onExit}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">모르는 단어 선택</h1>
                <div className="w-6"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
            <div className="max-w-3xl mx-auto w-full">
                <div className="bg-[#1e3a5f]/5 dark:bg-[#1e3a5f]/15 border border-[#1e3a5f]/15 dark:border-[#1e3a5f]/30 rounded-xl p-4 mb-6 text-sm text-[#1e3a5f] dark:text-blue-200 font-medium flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p>
                        리스트에서 본인이 <b>모르는 단어</b>를 솔직하게 체크해주세요.<br />
                        선택한 단어만으로 선생님이 맞춤 과제를 내어줍니다.
                    </p>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Total <span className="text-[#1e3a5f]">{safeWords.length}</span>
                    </span>
                    <button
                        onClick={handleSelectAll}
                        disabled={isSubmitting}
                        className="text-sm font-bold text-[#1e3a5f] dark:text-blue-300 hover:text-[#0f2a47] dark:hover:text-blue-200 transition-colors disabled:opacity-50"
                    >
                        {selectedIndices.length === safeWords.length ? '전체 해제' : '전체 선택'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {safeWords.map((word, idx) => {
                        const isSelected = selectedIndices.includes(idx);
                        return (
                            <div
                                key={idx}
                                onClick={() => toggleSelection(idx)}
                                className={`group relative p-4 rounded-xl border-2 transition-all duration-200 select-none flex flex-col justify-between h-full
                                    ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    ${isSelected
                                        ? 'border-[#1e3a5f]/50 dark:border-blue-400/40 bg-[#1e3a5f]/5 dark:bg-blue-900/20 shadow-md transform scale-[1.01]'
                                        : 'border-white dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col gap-1">
                                        <h3 className={`font-bold text-lg ${isSelected ? 'text-[#1e3a5f] dark:text-blue-200' : 'text-slate-800 dark:text-white'}`}>
                                            {word.term}
                                        </h3>
                                        <p className={`text-sm ${isSelected ? 'text-[#1e3a5f]/70 dark:text-blue-300/70' : 'text-slate-400 dark:text-slate-400'}`}>
                                            {word.meaning}
                                        </p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                                        ${isSelected
                                            ? 'bg-[#1e3a5f]/50 border-[#1e3a5f]/50 text-white'
                                            : 'border-slate-200 text-transparent group-hover:border-slate-300'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                </div>
                                {word.contextSentence && (
                                    <div className={`text-xs mt-2 pt-2 border-t ${isSelected ? 'border-[#1e3a5f]/20 dark:border-blue-400/20 text-[#1e3a5f] dark:text-blue-300' : 'border-slate-100 dark:border-slate-700 text-slate-400'} italic`}>
                                        &quot;{word.contextSentence}&quot;
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            </div>

            {/* Footer Action */}
            <div className="flex-shrink-0 px-4 md:px-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] pt-4 flex gap-2 md:gap-3 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700">
                <div className="w-full flex gap-3 items-center">
                    <button
                        onClick={onExit}
                        disabled={isSubmitting}
                        className="flex-1 py-4 px-6 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-base hover:bg-slate-50 disabled:opacity-50 transition-all active:scale-95"
                    >
                        나가기
                    </button>
                    <button
                        onClick={async () => {
                            if (selectedIndices.length === 0) {
                                if (!confirm('선택한 단어가 없습니다. 정말로 다 아시는 건가요?')) return;
                            }
                            setIsSubmitting(true);
                            try {
                                await onSubmit(selectedIndices);
                            } catch (e) {
                                setIsSubmitting(false);
                            }
                        }}
                        disabled={isSubmitting}
                        className="flex-1 py-4 rounded-2xl bg-[#1e3a5f] text-white font-bold text-lg shadow-lg shadow-[#1e3a5f]/15 hover:bg-[#1e3a5f] disabled:bg-[#1e3a5f]/70 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>제출 중...</span>
                            </>
                        ) : (
                            <>
                                <span>단어제출</span>
                                
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
