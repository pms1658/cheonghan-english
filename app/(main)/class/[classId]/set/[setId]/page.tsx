"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Plus, Trash2, FileText } from "lucide-react";
import { getSetById, addPassageToSet, removePassageFromSet } from "@/lib/vocabulary-data";
import { useRole } from "@/contexts/RoleContext";
import { PassageInputForm } from "@/components/chunk-reading/PassageInputForm";
import { ChunkReadingPassage } from "@/types/vocabulary";
import Link from "next/link";

export default function SetDetailPage() {
    const { role } = useRole();
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const setId = params.setId as string;

    const [set, setSet] = useState(getSetById(setId));
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        setSet(getSetById(setId));
    }, [setId]);

    if (!set) {
        return <div className="p-8 text-center">세트를 찾을 수 없습니다.</div>;
    }

    const handleAddPassage = (passageData: any) => {
        const updatedSet = addPassageToSet(setId, {
            title: passageData.title,
            rawText: passageData.rawText,
            sentences: passageData.sentences,
            difficulty: passageData.difficulty,
            source: passageData.source
        });

        if (updatedSet) {
            setSet({ ...updatedSet });
            setShowAddForm(false);
        }
    };

    const handleDeletePassage = (passageId: string) => {
        if (confirm("이 지문을 삭제하시겠습니까?")) {
            const updatedSet = removePassageFromSet(setId, passageId);
            if (updatedSet) {
                setSet({ ...updatedSet });
            }
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    돌아가기
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                끊어읽기
                            </span>
                            <h1 className="text-2xl font-bold text-gray-900">{set.name}</h1>
                        </div>
                        {set.description && (
                            <p className="text-gray-600">{set.description}</p>
                        )}
                    </div>

                    {role === "admin" && !showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-navy-950 text-white rounded-lg hover:bg-navy-900 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            지문 추가
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {showAddForm && role === "admin" ? (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">새 지문 추가</h2>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            취소
                        </button>
                    </div>
                    <PassageInputForm onSave={handleAddPassage} />
                </div>
            ) : (
                <div className="space-y-4">
                    {(!set.passages || set.passages.length === 0) ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">등록된 지문이 없습니다.</p>
                            {role === "admin" && (
                                <p className="text-sm text-gray-400 mt-1">
                                    '지문 추가' 버튼을 눌러 지문을 등록하세요.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {set.passages.map((passage) => (
                                <div
                                    key={passage.id}
                                    className="bg-white p-5 rounded-xl border border-gray-200 hover:border-navy-950 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-bold text-lg text-gray-900">{passage.title}</h3>
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${passage.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                        passage.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {passage.difficulty === 'easy' ? '쉬움' :
                                                        passage.difficulty === 'medium' ? '보통' : '어려움'}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 line-clamp-2 text-sm mb-3">
                                                {passage.rawText}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>문장 {passage.sentences.length}개</span>
                                                {passage.source && <span>출처: {passage.source}</span>}
                                                <span>{new Date(passage.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/class/${classId}/set/${setId}/passage/${passage.id}`}
                                                className="px-3 py-1.5 bg-navy-50 text-navy-950 rounded hover:bg-navy-100 text-sm font-medium transition-colors"
                                            >
                                                학습하기
                                            </Link>
                                            {role === "admin" && (
                                                <button
                                                    onClick={() => handleDeletePassage(passage.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
