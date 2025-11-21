"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus } from "lucide-react";
import { mockPassages } from "@/lib/chunk-reading-data";
import { Passage } from "@/types/chunk-reading";
import { PassageInputForm } from "@/components/chunk-reading/PassageInputForm";

export default function AdminChunkReadingPage() {
    const [passages, setPassages] = useState<Passage[]>(mockPassages);
    const [showAddForm, setShowAddForm] = useState(false);

    const handleSavePassage = (newPassageData: {
        title: string;
        rawText: string;
        sentences: string[];
        difficulty: "easy" | "medium" | "hard";
        source?: string;
    }) => {
        const newPassage: Passage = {
            id: `p${passages.length + 1}`,
            ...newPassageData,
            createdBy: "admin-1",
            createdAt: new Date(),
        };

        setPassages([...passages, newPassage]);
        setShowAddForm(false);
        alert("지문이 저장되었습니다!");
    };

    const handleDelete = (id: string) => {
        if (confirm("정말 이 지문을 삭제하시겠습니까?")) {
            setPassages(passages.filter((p) => p.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white">끊어읽기 지문 관리</h2>
                    <p className="text-navy-300 mt-2">지문을 추가하고 학생들에게 배정하세요</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                >
                    <Plus className="h-5 w-5" />
                    {showAddForm ? "취소" : "새 지문 추가"}
                </button>
            </div>

            {showAddForm && <PassageInputForm onSave={handleSavePassage} />}

            <div className="grid gap-4">
                {passages.map((passage) => (
                    <Card
                        key={passage.id}
                        className="bg-navy-800 border-navy-700 text-white"
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-galaxy-400" />
                                    <div>
                                        <CardTitle>{passage.title}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            {passage.source && (
                                                <span className="text-xs text-navy-400">
                                                    {passage.source}
                                                </span>
                                            )}
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs ${passage.difficulty === "easy"
                                                        ? "bg-green-900/30 text-green-400"
                                                        : passage.difficulty === "medium"
                                                            ? "bg-yellow-900/30 text-yellow-400"
                                                            : "bg-red-900/30 text-red-400"
                                                    }`}
                                            >
                                                {passage.difficulty === "easy"
                                                    ? "쉬움"
                                                    : passage.difficulty === "medium"
                                                        ? "보통"
                                                        : "어려움"}
                                            </span>
                                            <span className="text-xs text-navy-500">
                                                {passage.sentences.length}개 문장
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(passage.id)}
                                    className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-all"
                                >
                                    삭제
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300 text-sm line-clamp-2">
                                {passage.rawText}
                            </p>
                            {passage.assignedTo && passage.assignedTo.length > 0 && (
                                <p className="text-xs text-galaxy-400 mt-2">
                                    배정됨: {passage.assignedTo.length}명
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
