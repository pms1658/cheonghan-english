"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { WordGroup, MarkingType } from "@/types/chunk-reading";

export interface InteractiveSentenceRef {
    markAs: (type: MarkingType) => void;
    clearSelection: () => void;
    undoLastMarking: () => void;
}

interface InteractiveSentenceProps {
    sentence: string;
    groups: WordGroup[];
    onGroupsChange: (groups: WordGroup[]) => void;
    showBackbone?: boolean;
}

export const InteractiveSentence = forwardRef<InteractiveSentenceRef, InteractiveSentenceProps>(({
    sentence,
    groups,
    onGroupsChange,
    showBackbone = false,
}, ref) => {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [activeMarkingType, setActiveMarkingType] = useState<MarkingType | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const words = sentence.split(/\s+/);

    const handleWordClick = useCallback(
        (index: number) => {
            if (!activeMarkingType) return;

            setSelectedIndices((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(index)) {
                    newSet.delete(index);
                } else {
                    newSet.add(index);
                }
                return newSet;
            });
        },
        [activeMarkingType]
    );

    const applyMarking = useCallback(() => {
        if (selectedIndices.size === 0 || !activeMarkingType) return;

        const newGroup: WordGroup = {
            id: `group-${Date.now()}`,
            wordIndices: Array.from(selectedIndices).sort((a, b) => a - b),
            type: activeMarkingType,
            color: activeMarkingType === "clause" ? `hsl(${Math.random() * 360}, 70%, 50%)` : undefined,
        };

        onGroupsChange([...groups, newGroup]);
        setSelectedIndices(new Set());
        setActiveMarkingType(null);
    }, [selectedIndices, activeMarkingType, groups, onGroupsChange]);

    const clearSelection = useCallback(() => {
        setSelectedIndices(new Set());
        setActiveMarkingType(null);
    }, []);

    const undoLastMarking = useCallback(() => {
        if (groups.length > 0) {
            onGroupsChange(groups.slice(0, -1));
        }
    }, [groups, onGroupsChange]);

    useImperativeHandle(ref, () => ({
        markAs: (type: MarkingType) => {
            if (selectedIndices.size > 0 && activeMarkingType) {
                applyMarking();
            }
            setActiveMarkingType(type);
        },
        clearSelection,
        undoLastMarking
    }));

    // Effect for auto-applying marking when selection changes if needed
    // (Currently we wait for explicit "Apply" click or another markAs call)

    const getGroupConnection = (index: number) => {
        let connectLeft = false;
        let connectRight = false;

        for (const group of groups) {
            const posInGroup = group.wordIndices.indexOf(index);
            if (posInGroup !== -1) {
                connectLeft = posInGroup > 0;
                connectRight = posInGroup < group.wordIndices.length - 1;
                break;
            }
        }

        return { connectLeft, connectRight };
    };

    const getWordStyle = (index: number) => {
        const isSelected = selectedIndices.has(index);
        const wordGroups = groups.filter((g) => g.wordIndices.includes(index));
        const { connectLeft, connectRight } = getGroupConnection(index);

        if (isSelected) {
            return "bg-blue-200 text-gray-900 ring-2 ring-blue-400";
        }

        let styles = "text-gray-900";

        if (showBackbone && wordGroups.some(g => g.type === "modifier")) {
            return "opacity-30 text-gray-400";
        }

        if (wordGroups.some((g) => g.type === "verb")) {
            styles += " underline decoration-2 decoration-blue-600";
        }
        if (wordGroups.some((g) => g.type === "gerund")) {
            styles += " italic text-purple-700";
        }
        if (wordGroups.some((g) => g.type === "conjunction")) {
            styles += " text-green-700 font-bold";
        }

        const clauseGroup = wordGroups.find((g) => g.type === "clause");
        if (clauseGroup) {
            let bgStyle = "bg-yellow-200/60";
            if (connectLeft && connectRight) {
                bgStyle += " -mx-0.5 px-1";
            } else if (connectLeft) {
                bgStyle += " -ml-0.5 pl-1 pr-0.5";
            } else if (connectRight) {
                bgStyle += " -mr-0.5 pr-1 pl-0.5";
            } else {
                bgStyle += " px-1";
            }
            return `${styles} ${bgStyle} rounded-sm`;
        }

        const modifierGroups = wordGroups.filter((g) => g.type === "modifier");
        if (modifierGroups.length > 0) {
            styles += " text-red-700";
        }

        return styles;
    };

    const getWordPrefix = (index: number) => {
        const wordGroups = groups.filter((g) => g.wordIndices.includes(index));
        const isFirst = wordGroups.some(
            (g) => g.type === "modifier" && g.wordIndices[0] === index
        );

        if (isFirst) {
            return "(";
        }
        return "";
    };

    const getWordSuffix = (index: number) => {
        const wordGroups = groups.filter((g) => g.wordIndices.includes(index));
        const isLast = wordGroups.some(
            (g) => g.type === "modifier" && g.wordIndices[g.wordIndices.length - 1] === index
        );

        if (isLast) {
            return ")";
        }

        if (wordGroups.some((g) => g.type === "gerund")) {
            const gerundGroup = wordGroups.find((g) => g.type === "gerund");
            if (gerundGroup && gerundGroup.wordIndices[gerundGroup.wordIndices.length - 1] === index) {
                return "/";
            }
            if (gerundGroup && gerundGroup.wordIndices[0] === index) {
                return "/";
            }
        }

        if (wordGroups.some((g) => g.type === "conjunction")) {
            return "▲";
        }

        return "";
    };

    return (
        <div className="space-y-4">
            <div
                ref={containerRef}
                className="p-6 bg-gray-50 border border-gray-200 rounded-lg select-none"
            >
                <div className="flex flex-wrap gap-1 text-xl leading-relaxed">
                    {words.map((word, index) => (
                        <span
                            key={index}
                            onClick={() => handleWordClick(index)}
                            className={`cursor-pointer transition-all rounded px-0.5 ${getWordStyle(index)} ${showBackbone && groups.some(g => g.type === "modifier" && g.wordIndices.includes(index))
                                ? ""
                                : "font-medium"
                                } ${activeMarkingType ? "hover:bg-blue-100" : ""}`}
                        >
                            {getWordPrefix(index)}
                            {word}
                            {getWordSuffix(index)}
                        </span>
                    ))}
                </div>
            </div>

            {activeMarkingType && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-900 flex-1">
                        <strong>{activeMarkingType === "verb" ? "동사" :
                            activeMarkingType === "gerund" ? "준동사" :
                                activeMarkingType === "clause" ? "종속절" :
                                    activeMarkingType === "conjunction" ? "등위접속사" : "수식어"}</strong> 표시 모드:
                        단어를 클릭하세요 ({selectedIndices.size}개 선택됨)
                    </p>
                    <button
                        onClick={applyMarking}
                        disabled={selectedIndices.size === 0}
                        className="px-4 py-2 bg-navy-950 hover:bg-navy-900 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded transition-all font-medium"
                    >
                        적용
                    </button>
                    <button
                        onClick={clearSelection}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-all"
                    >
                        취소
                    </button>
                </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>사용법:</strong> 위 버튼에서 표시 종류를 선택한 후, 단어를 클릭하여 선택하고 "적용" 버튼을 누르세요</p>
                <div className="flex flex-wrap gap-4 mt-2">
                    <span>밑줄 = 동사</span>
                    <span>이탤릭 = 준동사</span>
                    <span className="text-green-600">녹색▲ = 접속사</span>
                    <span className="text-red-600">(괄호) = 수식어</span>
                    <span className="bg-yellow-200/50 px-1 rounded">음영 = 절</span>
                </div>
            </div>
        </div>
    );
});

InteractiveSentence.displayName = "InteractiveSentence";
