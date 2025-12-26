"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Upload, FileText, Table, Book } from "lucide-react";
import { getSetById, addWordToSet, removeWordFromSet } from "@/lib/vocabulary-data";
import { VocabularySet, VocabularyWord } from "@/types/vocabulary";
import { useRole } from "@/contexts/RoleContext";
import Link from "next/link";

export default function VocabularySetPage() {
    const { role } = useRole();
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const setId = params.setId as string;

    const [set, setSet] = useState<VocabularySet | null>(null);
    const [showAddWord, setShowAddWord] = useState(false);
    const [newWord, setNewWord] = useState({ word: "", meaning: "", example: "" });
    const [extractionMethod, setExtractionMethod] = useState<"manual" | "passage" | "file" | null>(null);

    useEffect(() => {
        const data = getSetById(setId);
        setSet(data as VocabularySet);
    }, [setId]);

    if (!set) {
        return (
            <div className="p-8">
                <p className="text-gray-500">세트를 찾을 수 없습니다.</p>
            </div>
        );
    }

    const handleAddWord = () => {
        if (!newWord.word.trim() || !newWord.meaning.trim()) {
            alert("단어와 뜻을 입력하세요.");
            return;
        }

        const word: VocabularyWord = {
            id: `word-${Date.now()}`,
            word: newWord.word,
            meaning: newWord.meaning,
            example: newWord.example || undefined,
        };

        addWordToSet(setId, word);
        setSet(getSetById(setId) as VocabularySet);
        setNewWord({ word: "", meaning: "", example: "" });
        setShowAddWord(false);
    };

    const handleRemoveWord = (wordId: string) => {
        if (confirm("이 단어를 삭제하시겠습니까?")) {
            removeWordFromSet(setId, wordId);
            setSet(getSetById(setId) as VocabularySet);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`/class/${classId}`}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-navy-950 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    클래스로 돌아가기
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{set.name}</h1>
                        {set.description && (
                            <p className="text-gray-600 mt-1">{set.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                            총 {set.words.length}개의 단어
                        </p>
                    </div>
                </div>
            </div>

            {/* Word Extraction Methods */}
            {role === "admin" && !extractionMethod && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">단어 추가 방법 선택</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => setExtractionMethod("manual")}
                            className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <Plus className="h-8 w-8 text-blue-600 mb-2" />
                            <span className="font-medium">직접 입력</span>
                            <span className="text-xs text-gray-500 mt-1">수동으로 단어 추가</span>
                        </button>

                        <button
                            onClick={() => setExtractionMethod("passage")}
                            className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                        >
                            <FileText className="h-8 w-8 text-green-600 mb-2" />
                            <span className="font-medium">지문에서 추출</span>
                            <span className="text-xs text-gray-500 mt-1">AI 난이도별 추출</span>
                        </button>

                        <button
                            onClick={() => setExtractionMethod("file")}
                            className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                        >
                            <Table className="h-8 w-8 text-purple-600 mb-2" />
                            <span className="font-medium">파일 업로드</span>
                            <span className="text-xs text-gray-500 mt-1">Excel/HWP 가져오기</span>
                        </button>

                        <button
                            onClick={() => alert("PDF 파싱 기능은 준비 중입니다")}
                            className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all opacity-70"
                        >
                            <Book className="h-8 w-8 text-orange-600 mb-2" />
                            <span className="font-medium">PDF 단어장</span>
                            <span className="text-xs text-gray-500 mt-1">곧 지원 예정</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Word Entry Form */}
            {extractionMethod === "manual" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">단어 추가</h3>
                        <button
                            onClick={() => setExtractionMethod(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            취소
                        </button>
                    </div>
                    {/* Horizontal input form */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                단어 *
                            </label>
                            <input
                                type="text"
                                value={newWord.word}
                                onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddWord();
                                    }
                                }}
                                placeholder="sophisticated"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                뜻 *
                            </label>
                            <input
                                type="text"
                                value={newWord.meaning}
                                onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddWord();
                                    }
                                }}
                                placeholder="세련된, 정교한"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                예문 (선택)
                            </label>
                            <input
                                type="text"
                                value={newWord.example}
                                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddWord();
                                    }
                                }}
                                placeholder="She has sophisticated taste in art."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleAddWord}
                            className="px-6 py-2 bg-navy-950 text-white rounded-lg hover:bg-navy-900 transition-colors h-[42px]"
                        >
                            추가
                        </button>
                    </div>
                </div>
            )}

            {/* Passage Extraction Placeholder */}
            {extractionMethod === "passage" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">지문에서 단어 추출</h3>
                        <button
                            onClick={() => setExtractionMethod(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            취소
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4">
                        지문을 입력하고 난이도를 선택하면 AI가 자동으로 적절한 단어를 추출하고 문맥상 뜻을 제공합니다.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                난이도 선택
                            </label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="고1">고1 (기초)</option>
                                <option value="고2">고2 (중급)</option>
                                <option value="고3">고3 (고급)</option>
                                <option value="최상위">최상위반 (심화)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                지문 입력
                            </label>
                            <textarea
                                rows={8}
                                placeholder="영어 지문을 입력하세요..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-950 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={() => alert("AI 단어 추출 기능은 곧 구현됩니다")}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            단어 추출하기
                        </button>
                    </div>
                </div>
            )}

            {/* File Upload Placeholder */}
            {extractionMethod === "file" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">파일에서 가져오기</h3>
                        <button
                            onClick={() => setExtractionMethod(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            취소
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Excel (.xlsx) 또는 HWP 파일을 업로드하세요</p>
                        <p className="text-sm text-gray-500 mb-4">파일은 "단어", "뜻" 열을 포함해야 합니다</p>
                        <button
                            onClick={() => alert("파일 업로드 기능은 곧 구현됩니다")}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            파일 선택
                        </button>
                    </div>
                </div>
            )}

            {/* Word List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">단어 목록</h2>
                </div>

                {set.words.length === 0 ? (
                    <div className="p-12 text-center">
                        <Book className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">아직 단어가 없습니다</p>
                        <p className="text-sm text-gray-400 mt-1">위에서 단어 추가 방법을 선택하세요</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-1/4">
                                        단어
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-1/4">
                                        뜻
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-2/5">
                                        예문
                                    </th>
                                    {role === "admin" && (
                                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 w-20">
                                            삭제
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {set.words.map((word) => (
                                    <tr key={word.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {word.word}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {word.meaning}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm italic">
                                            {word.example || "-"}
                                        </td>
                                        {role === "admin" && (
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleRemoveWord(word.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors inline-flex items-center justify-center"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Study Button */}
            {set.words.length > 0 && role === "student" && (
                <div className="mt-6">
                    <button
                        onClick={() => router.push(`/class/${classId}/vocab/${setId}/study`)}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        학습 시작
                    </button>
                </div>
            )}
        </div>
    );
}
