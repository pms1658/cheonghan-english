"use client";

interface SentenceSelectorProps {
    sentences: string[];
    currentIndex: number;
    completedIndices: Set<number>;
    onSelectSentence: (index: number) => void;
}

export function SentenceSelector({
    sentences,
    currentIndex,
    completedIndices,
    onSelectSentence,
}: SentenceSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                    진행률: {Math.round((completedIndices.size / sentences.length) * 100)}%
                </span>
                <span className="text-xs text-gray-400">
                    {completedIndices.size} / {sentences.length} 문장
                </span>
            </div>

            <div className="grid gap-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
                {sentences.map((sentence, idx) => {
                    const isActive = idx === currentIndex;
                    const isCompleted = completedIndices.has(idx);

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelectSentence(idx)}
                            className={`text-left p-3 rounded-lg transition-all border w-full group ${isActive
                                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm"
                                : isCompleted
                                    ? "bg-green-50/50 border-green-200"
                                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={`text-xs font-bold px-1.5 py-0.5 rounded min-w-[24px] text-center mt-0.5 transition-colors ${isActive
                                        ? "bg-blue-600 text-white"
                                        : isCompleted
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                                        }`}
                                >
                                    {idx + 1}
                                </span>
                                <p className={`text-sm flex-1 line-clamp-2 text-left ${isActive ? "text-blue-900 font-medium" : "text-gray-600"
                                    }`}>
                                    {sentence}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
