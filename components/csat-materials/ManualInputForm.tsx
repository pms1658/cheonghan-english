"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsatMaterial, QUESTION_TYPES, EXAM_TYPES } from "@/types/csat-materials";
import { addMaterial } from "@/lib/csat-materials-data";

interface ManualInputFormProps {
    onMaterialAdded?: (material: CsatMaterial) => void;
}

export function ManualInputForm({ onMaterialAdded }: ManualInputFormProps) {
    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        examType: "수능" as const,
        questionNumber: 18,
        questionType: "빈칸추론" as const,
        passage: "",
        question: "",
        choices: ["", "", "", "", ""],
        answer: "",
        explanation: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.passage || !formData.question || !formData.answer) {
            alert("지문, 문제, 정답은 필수 항목입니다.");
            return;
        }

        const newMaterial = addMaterial({
            ...formData,
            choices: formData.choices.filter(c => c.trim() !== ""),
        });

        onMaterialAdded?.(newMaterial);

        // Reset form
        setFormData({
            year: new Date().getFullYear(),
            examType: "수능",
            questionNumber: 18,
            questionType: "빈칸추론",
            passage: "",
            question: "",
            choices: ["", "", "", "", ""],
            answer: "",
            explanation: "",
        });

        alert("자료가 추가되었습니다!");
    };

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Plus className="h-5 w-5" />
                    수동 입력
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                년도
                            </label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                시험 유형
                            </label>
                            <select
                                value={formData.examType}
                                onChange={(e) => setFormData({ ...formData, examType: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            >
                                {EXAM_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                문제 번호
                            </label>
                            <input
                                type="number"
                                value={formData.questionNumber}
                                onChange={(e) => setFormData({ ...formData, questionNumber: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                문제 유형
                            </label>
                            <select
                                value={formData.questionType}
                                onChange={(e) => setFormData({ ...formData, questionType: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            >
                                {QUESTION_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Passage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            지문 <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            value={formData.passage}
                            onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                            rows={6}
                            placeholder="영어 지문을 입력하세요..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                        />
                    </div>

                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            문제 <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            rows={2}
                            placeholder="예: 다음 빈칸에 들어갈 말로 가장 적절한 것은?"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                        />
                    </div>

                    {/* Choices (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            선택지 (선택사항)
                        </label>
                        <div className="space-y-2">
                            {formData.choices.map((choice, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    value={choice}
                                    onChange={(e) => {
                                        const newChoices = [...formData.choices];
                                        newChoices[index] = e.target.value;
                                        setFormData({ ...formData, choices: newChoices });
                                    }}
                                    placeholder={`${index + 1}번 선택지`}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Answer and Explanation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                정답 <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.answer}
                                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                placeholder="예: 2 또는 restoration"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                해설 (선택사항)
                            </label>
                            <input
                                type="text"
                                value={formData.explanation}
                                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                placeholder="간단한 해설..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-950"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-3 bg-navy-950 hover:bg-navy-900 text-white rounded-lg transition-all font-medium"
                    >
                        자료 추가
                    </button>
                </form>
            </CardContent>
        </Card>
    );
}
