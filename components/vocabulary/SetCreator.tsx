"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, BookOpen, BookText, ListOrdered, ArrowRight } from "lucide-react";
import { createSet } from "@/lib/vocabulary-data";
import { SetType } from "@/types/vocabulary";

import { useRole } from "@/contexts/RoleContext";

interface SetCreatorProps {
    classId: string;
    onSetCreated?: () => void;
}

export function SetCreator({ classId, onSetCreated }: SetCreatorProps) {
    const { role } = useRole();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    if (role !== "admin") return null;
    const [step, setStep] = useState<"type-selection" | "details">("type-selection");
    const [formData, setFormData] = useState({
        type: "vocabulary" as SetType,
        name: "",
        description: ""
    });

    const handleCreate = () => {
        if (!formData.name.trim()) {
            alert("세트 이름을 입력하세요.");
            return;
        }

        const newSet = createSet({
            classId,
            type: formData.type,
            name: formData.name,
            description: formData.description,
            words: []
        });

        setFormData({ type: "vocabulary", name: "", description: "" });
        setIsOpen(false);
        setStep("type-selection");

        if (onSetCreated) {
            onSetCreated();
        }

        // Redirect to the new set's detail page for immediate editing
        router.push(`/class/${classId}/set/${newSet.id}`);
    };

    const selectType = (type: SetType) => {
        setFormData({ ...formData, type });
        setStep("details");
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-lg transition-colors shadow-sm"
            >
                <Plus className="h-4 w-4" />
                새 세트
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {step === "type-selection" ? "세트 종류 선택" : "세트 정보 입력"}
                    </h2>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setStep("type-selection");
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === "type-selection" ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => selectType("vocabulary")}
                                className="flex flex-col items-center p-6 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-center"
                            >
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <BookOpen className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">단어 세트</h3>
                                <p className="text-sm text-gray-500">
                                    영단어와 뜻을 학습하고<br />테스트합니다.
                                </p>
                            </button>

                            <button
                                onClick={() => selectType("chunk-reading")}
                                className="flex flex-col items-center p-6 border-2 border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group text-center"
                            >
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <BookText className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">끊어읽기</h3>
                                <p className="text-sm text-gray-500">
                                    긴 지문을 문장 단위로<br />분석하고 해석합니다.
                                </p>
                            </button>

                            <button
                                onClick={() => selectType("sequence")}
                                className="flex flex-col items-center p-6 border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-center"
                            >
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ListOrdered className="h-8 w-8 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">순서 배열</h3>
                                <p className="text-sm text-gray-500">
                                    문장 순서를 배열하며<br />논리력을 키웁니다.
                                </p>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {formData.type === "vocabulary" && <BookOpen className="h-6 w-6 text-blue-600" />}
                                {formData.type === "chunk-reading" && <BookText className="h-6 w-6 text-green-600" />}
                                {formData.type === "sequence" && <ListOrdered className="h-6 w-6 text-purple-600" />}
                                <div>
                                    <p className="text-sm text-gray-500">선택된 종류</p>
                                    <p className="font-bold text-gray-900">
                                        {formData.type === "vocabulary" && "단어 세트"}
                                        {formData.type === "chunk-reading" && "끊어읽기 세트"}
                                        {formData.type === "sequence" && "순서 배열 세트"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStep("type-selection")}
                                    className="ml-auto text-sm text-gray-500 hover:text-navy-950 underline"
                                >
                                    변경
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    세트 이름 <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 2024 수능특강 1강, 3월 모의고사"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-950 text-lg"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    설명 (선택사항)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="학생들에게 보여질 간단한 설명을 입력하세요."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-950"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setStep("type-selection");
                        }}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        취소
                    </button>
                    {step === "details" && (
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-5 py-2.5 bg-navy-950 text-white rounded-lg hover:bg-navy-900 font-medium transition-colors shadow-lg shadow-navy-950/20"
                        >
                            생성하고 편집하기
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
