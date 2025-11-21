"use client";

import { MarkingType } from "@/types/chunk-reading";
import { Underline, Slash, Highlighter, Triangle, Type, Undo } from "lucide-react";

interface MarkingToolbarProps {
    onMarkAs: (type: MarkingType) => void;
    onClearSelection: () => void;
    onShowBackbone: () => void;
    onUndo: () => void;
    showingBackbone: boolean;
    disabled?: boolean;
}

export function MarkingToolbar({
    onMarkAs,
    onClearSelection,
    onShowBackbone,
    onUndo,
    showingBackbone,
    disabled = false,
}: MarkingToolbarProps) {
    const buttons: Array<{
        type: MarkingType;
        label: string;
        icon: any;
        color: string;
    }> = [
            { type: "verb", label: "동사", icon: Underline, color: "text-blue-400" },
            { type: "gerund", label: "준동사", icon: Slash, color: "text-purple-400" },
            { type: "clause", label: "종속절", icon: Highlighter, color: "text-yellow-400" },
            { type: "conjunction", label: "등위접속사", icon: Triangle, color: "text-green-400" },
            { type: "modifier", label: "수식어", icon: Type, color: "text-red-400" },
        ];

    const handleUndo = () => {
        onUndo();
    };

    return (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600 font-medium mr-2">표시:</span>

            {buttons.map(({ type, label, icon: Icon, color }) => (
                <button
                    key={type}
                    onClick={() => onMarkAs(type)}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-navy-950"
                        }`}
                    title={label}
                >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                </button>
            ))}

            <div className="h-6 w-px bg-gray-300 mx-2" />

            <button
                onClick={onShowBackbone}
                className="px-3 py-1.5 bg-navy-950 hover:bg-navy-900 text-white rounded transition-all text-sm font-medium"
            >
                {showingBackbone ? "전체 보기" : "뼈대 보기"}
            </button>

            <button
                onClick={handleUndo}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded transition-all text-sm"
                title="마지막 표시 취소"
            >
                <Undo className="h-4 w-4" />
                실행 취소
            </button>
        </div>
    );
}
