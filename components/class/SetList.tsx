"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen, BookText, ListOrdered, Plus } from "lucide-react";
import { VocabularySet, StudentProgress } from "@/types/vocabulary";
import { SetCreator } from "@/components/vocabulary/SetCreator";
import { useRole } from "@/contexts/RoleContext";

interface SetListProps {
    classId: string;
    sets: VocabularySet[];
    onSetCreated: () => void;
}

export function SetList({ classId, sets, onSetCreated }: SetListProps) {
    const { role } = useRole();
    const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

    const toggleExpand = (setId: string) => {
        const newExpanded = new Set(expandedSets);
        if (newExpanded.has(setId)) {
            newExpanded.delete(setId);
        } else {
            newExpanded.add(setId);
        }
        setExpandedSets(newExpanded);
    };

    const getSetIcon = (type: string) => {
        switch (type) {
            case "vocabulary": return <BookOpen className="h-5 w-5 text-blue-600" />;
            case "chunk-reading": return <BookText className="h-5 w-5 text-green-600" />;
            case "sequence": return <ListOrdered className="h-5 w-5 text-purple-600" />;
            default: return <BookOpen className="h-5 w-5 text-gray-600" />;
        }
    };

    const getSetTypeLabel = (type: string) => {
        switch (type) {
            case "vocabulary": return "어휘학습";
            case "chunk-reading": return "끊어읽기";
            case "sequence": return "순서 세트";
            default: return "세트";
        }
    };

    const getSetTypeBadge = (type: string) => {
        switch (type) {
            case "vocabulary": return "bg-blue-100 text-blue-700";
            case "chunk-reading": return "bg-green-100 text-green-700";
            case "sequence": return "bg-purple-100 text-purple-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    // Mock function to get student progress for a set
    const getStudentProgress = (setId: string): StudentProgress[] => {
        // TODO: Replace with actual data from API/storage
        return [
            {
                studentId: "s1",
                studentName: "김철수",
                completionRate: 80,
                lastStudied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                score: 85
            },
            {
                studentId: "s2",
                studentName: "이영희",
                completionRate: 60,
                lastStudied: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                score: 72
            },
            {
                studentId: "s3",
                studentName: "박민수",
                completionRate: 100,
                lastStudied: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                score: 95
            }
        ];
    };

    const formatLastStudied = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return "오늘";
        if (diff === 1) return "어제";
        return `${diff}일 전`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">학습 세트</h2>
                {role === "admin" && (
                    <SetCreator classId={classId} onSetCreated={onSetCreated} />
                )}
            </div>

            {/* Set List */}
            {sets.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">아직 생성된 세트가 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-1">새 세트를 만들어 학습을 시작하세요.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sets.map((set) => {
                        const isExpanded = expandedSets.has(set.id);
                        const studentProgress = getStudentProgress(set.id);

                        return (
                            <div
                                key={set.id}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-all"
                            >
                                {/* Set Header */}
                                <div className="flex items-center gap-3 p-4">
                                    {/* Expand Button */}
                                    <button
                                        onClick={() => toggleExpand(set.id)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-gray-600" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-gray-600" />
                                        )}
                                    </button>

                                    {/* Icon */}
                                    <div className="flex-shrink-0">
                                        {getSetIcon(set.type)}
                                    </div>

                                    {/* Set Info */}
                                    <Link
                                        href={`/class/${classId}/set/${set.id}`}
                                        className="flex-1 min-w-0 hover:text-navy-950 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {set.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSetTypeBadge(set.type)}`}>
                                                {getSetTypeLabel(set.type)}
                                            </span>
                                        </div>
                                        {set.description && (
                                            <p className="text-sm text-gray-600 truncate">{set.description}</p>
                                        )}
                                    </Link>

                                    {/* Item Count */}
                                    <div className="text-sm text-gray-500 flex-shrink-0">
                                        {set.type === "chunk-reading" && set.passages
                                            ? `${set.passages.length}개 지문`
                                            : `${set.words.length}개 항목`}
                                    </div>
                                </div>

                                {/* Student Progress (Expanded) */}
                                {isExpanded && studentProgress.length > 0 && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-3">학생별 진도</h4>
                                        <div className="space-y-2">
                                            {studentProgress.map((progress) => (
                                                <div
                                                    key={progress.studentId}
                                                    className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100"
                                                >
                                                    {/* Student Name */}
                                                    <div className="w-20 text-sm font-medium text-gray-900">
                                                        {progress.studentName}
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${progress.completionRate === 100
                                                                            ? "bg-green-500"
                                                                            : progress.completionRate >= 50
                                                                                ? "bg-blue-500"
                                                                                : "bg-orange-500"
                                                                        }`}
                                                                    style={{ width: `${progress.completionRate}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-600 w-10">
                                                                {progress.completionRate}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Score */}
                                                    {progress.score !== undefined && (
                                                        <div className="text-sm font-semibold text-gray-700 w-16 text-right">
                                                            {progress.score}점
                                                        </div>
                                                    )}

                                                    {/* Last Studied */}
                                                    {progress.lastStudied && (
                                                        <div className="text-xs text-gray-500 w-16 text-right">
                                                            {formatLastStudied(progress.lastStudied)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* No Progress Message */}
                                {isExpanded && studentProgress.length === 0 && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-500">
                                        아직 학습한 학생이 없습니다.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
