"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { ClassManager } from "@/components/vocabulary/ClassManager";

export default function VocabularyPage() {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">어휘학습</h2>
                <p className="text-gray-600 mt-2">클래스별 어휘 세트를 관리하고 학습하세요</p>
            </div>

            {/* Class Manager */}
            <ClassManager
                onClassSelect={setSelectedClassId}
            />

            {/* Set Manager (TODO) */}
            {selectedClassId && (
                <div className="p-8 bg-white border border-gray-200 rounded-lg text-center text-gray-500">
                    <p>세트 관리 기능은 곧 추가됩니다...</p>
                    <p className="text-sm mt-2">선택된 클래스 ID: {selectedClassId}</p>
                </div>
            )}

            {!selectedClassId && (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>클래스를 선택하거나 새로 만들어주세요</p>
                </div>
            )}
        </div>
    );
}
