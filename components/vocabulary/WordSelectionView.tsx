"use client";

import { VocabularyWord } from "@/types/vocabulary";
import { Check } from "lucide-react";

interface WordSelectionViewProps {
    words: VocabularyWord[];
    selectedWordIds: string[];
    onToggleWord: (wordId: string) => void;
    onStartQuiz: () => void;
}

export function WordSelectionView({
    words,
    selectedWordIds,
    onToggleWord,
    onStartQuiz,
}: WordSelectionViewProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-navy-300">
                    모르는 단어를 선택하세요 ({selectedWordIds.length}/{words.length})
                </p>
                <button
                    onClick={onStartQuiz}
                    disabled={selectedWordIds.length === 0}
                    className="px-6 py-2 bg-galaxy-600 hover:bg-galaxy-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all"
                >
                    학습 시작
                </button>
            </div>

            <div className="grid gap-2">
                {words.map((word) => {
                    const isSelected = selectedWordIds.includes(word.id);
                    return (
                        <div
                            key={word.id}
                            onClick={() => onToggleWord(word.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? "bg-galaxy-900/50 border-2 border-galaxy-500"
                                    : "bg-navy-800 border-2 border-transparent hover:border-navy-600"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-semibold text-white">
                                            {word.english}
                                        </span>
                                        <span className="text-navy-400">→</span>
                                        <span className="text-navy-200">{word.korean}</span>
                                    </div>
                                    {word.example && (
                                        <p className="text-sm text-navy-400 mt-1 italic">
                                            {word.example}
                                        </p>
                                    )}
                                </div>
                                <div
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                            ? "bg-galaxy-600 border-galaxy-600"
                                            : "border-navy-600"
                                        }`}
                                >
                                    {isSelected && <Check className="h-4 w-4 text-white" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
