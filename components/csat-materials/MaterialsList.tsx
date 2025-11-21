"use client";

import { useState, useEffect } from "react";
import { Table, Filter, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsatMaterial, QUESTION_TYPES, EXAM_TYPES } from "@/types/csat-materials";
import { getAllMaterials, filterMaterials, deleteMaterial } from "@/lib/csat-materials-data";

interface MaterialsListProps {
    refreshTrigger?: number;
    onSelectionChange?: (selectedIds: string[]) => void;
}

export function MaterialsList({ refreshTrigger, onSelectionChange }: MaterialsListProps) {
    const [materials, setMaterials] = useState<CsatMaterial[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // Changed to array to maintain order
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        year: "",
        examType: "",
        questionType: "",
    });

    useEffect(() => {
        loadMaterials();
    }, [refreshTrigger]);

    const loadMaterials = () => {
        const filtered = filters.year || filters.examType || filters.questionType
            ? filterMaterials({
                year: filters.year ? parseInt(filters.year) : undefined,
                examType: filters.examType || undefined,
                questionType: filters.questionType || undefined,
            })
            : getAllMaterials();

        setMaterials(filtered);
    };

    useEffect(() => {
        loadMaterials();
    }, [filters]);

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = checked
            ? [...selectedIds, id]
            : selectedIds.filter(i => i !== id);
        setSelectedIds(newSelected);
        onSelectionChange?.(newSelected);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));

        if (dragIndex === dropIndex) return;

        const newSelected = [...selectedIds];
        const [draggedItem] = newSelected.splice(dragIndex, 1);
        newSelected.splice(dropIndex, 0, draggedItem);

        setSelectedIds(newSelected);
        onSelectionChange?.(newSelected);
    };

    useEffect(() => {
        onSelectionChange?.(selectedIds);
    }, [selectedIds]);

    const getSelectedOrder = (id: string) => {
        const index = selectedIds.indexOf(id);
        return index === -1 ? null : index + 1;
    };

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Table className="h-5 w-5" />
                    자료 목록 ({materials.length}개)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Filter className="h-4 w-4 text-gray-600" />
                    <select
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-950"
                    >
                        <option value="">전체 년도</option>
                        {[2024, 2023, 2022, 2021, 2020].map(year => (
                            <option key={year} value={year}>{year}학년도</option>
                        ))}
                    </select>
                    <select
                        value={filters.examType}
                        onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-950"
                    >
                        <option value="">전체 시험</option>
                        {EXAM_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <select
                        value={filters.questionType}
                        onChange={(e) => setFilters({ ...filters, questionType: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-950"
                    >
                        <option value="">전체 유형</option>
                        {QUESTION_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    {(filters.year || filters.examType || filters.questionType) && (
                        <button
                            onClick={() => setFilters({ year: "", examType: "", questionType: "" })}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>

                {/* Selection Info */}
                {selectedIds.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-gray-900">
                            <strong>{selectedIds.length}개</strong> 자료가 선택되었습니다.
                            <span className="text-gray-600 ml-2">💡 드래그하여 순서를 변경하세요</span>
                        </p>
                    </div>
                )}

                {/* Selected Materials (Draggable) */}
                {selectedIds.length > 0 && (
                    <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">교재에 포함될 순서:</h4>
                        {selectedIds.map((id, index) => {
                            const material = materials.find(m => m.id === id);
                            if (!material) return null;

                            return (
                                <div
                                    key={id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded cursor-move hover:border-navy-950 transition-all"
                                >
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-900">
                                        {material.year}학년도 {material.examType} {material.questionNumber}번 - {material.questionType}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Compact List */}
                <div className="space-y-1 border border-gray-200 rounded-lg overflow-hidden">
                    {materials.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            자료가 없습니다. 위에서 추가해주세요.
                        </div>
                    ) : (
                        materials.map((material) => {
                            const order = getSelectedOrder(material.id);
                            const isExpanded = expandedId === material.id;

                            return (
                                <div key={material.id} className="border-b border-gray-200 last:border-b-0">
                                    {/* Compact Row */}
                                    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(material.id)}
                                            onChange={(e) => handleSelectOne(material.id, e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        {order && (
                                            <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                                                {order}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : material.id)}
                                            className="flex items-center gap-1 flex-1 text-left"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-gray-600" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-600" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900">
                                                {material.year}학년도 {material.examType} {material.questionNumber}번
                                            </span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs ml-2">
                                                {material.questionType}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3 text-sm">
                                            <div>
                                                <h5 className="font-semibold text-gray-700 mb-1">지문</h5>
                                                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                    {material.passage}
                                                </p>
                                            </div>
                                            <div>
                                                <h5 className="font-semibold text-gray-700 mb-1">문제</h5>
                                                <p className="text-gray-900">{material.question}</p>
                                            </div>
                                            {material.choices && material.choices.length > 0 && (
                                                <div>
                                                    <h5 className="font-semibold text-gray-700 mb-1">선택지</h5>
                                                    <ol className="list-decimal list-inside space-y-1">
                                                        {material.choices.map((choice, index) => (
                                                            <li key={index} className="text-gray-900">{choice}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                                                <div>
                                                    <span className="font-semibold text-gray-700">정답: </span>
                                                    <span className="text-green-600 font-bold">{material.answer}</span>
                                                </div>
                                                {material.explanation && (
                                                    <div className="flex-1">
                                                        <span className="font-semibold text-gray-700">해설: </span>
                                                        <span className="text-gray-600">{material.explanation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
