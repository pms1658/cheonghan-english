"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Folder, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VocabularyClass } from "@/types/vocabulary";
import { getAllClasses, createClass, updateClass, deleteClass } from "@/lib/vocabulary-data";

interface ClassManagerProps {
    onClassSelect?: (classId: string) => void;
    refreshTrigger?: number;
}

export function ClassManager({ onClassSelect, refreshTrigger }: ClassManagerProps) {
    const [classes, setClasses] = useState<VocabularyClass[]>(getAllClasses());
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#3B82F6"
    });

    const loadClasses = () => {
        setClasses(getAllClasses());
    };

    const handleCreate = () => {
        if (!formData.name.trim()) {
            alert("클래스 이름을 입력하세요.");
            return;
        }

        createClass(formData);
        setFormData({ name: "", description: "", color: "#3B82F6" });
        setIsCreating(false);
        loadClasses();
    };

    const handleUpdate = (id: string) => {
        if (!formData.name.trim()) {
            alert("클래스 이름을 입력하세요.");
            return;
        }

        updateClass(id, formData);
        setFormData({ name: "", description: "", color: "#3B82F6" });
        setEditingId(null);
        loadClasses();
    };

    const handleDelete = (id: string) => {
        if (confirm("클래스와 모든 세트가 삭제됩니다. 계속하시겠습니까?")) {
            deleteClass(id);
            loadClasses();
        }
    };

    const startEdit = (cls: VocabularyClass) => {
        setFormData({
            name: cls.name,
            description: cls.description || "",
            color: cls.color || "#3B82F6"
        });
        setEditingId(cls.id);
        setIsCreating(false);
    };

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <Folder className="h-5 w-5" />
                        클래스 관리
                    </CardTitle>
                    <button
                        onClick={() => {
                            setIsCreating(!isCreating);
                            setEditingId(null);
                            setFormData({ name: "", description: "", color: "#3B82F6" });
                        }}
                        className="px-3 py-1.5 bg-navy-950 hover:bg-navy-900 text-white rounded text-sm flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        새 클래스
                    </button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Create/Edit Form */}
                {(isCreating || editingId) && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="클래스 이름 (예: 고3 A반, 김철수 개별)"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy-950"
                        />
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="설명 (선택사항)"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy-950"
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700">색상:</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="h-8 w-16 rounded border border-gray-300"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
                                className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded"
                            >
                                {editingId ? "수정" : "생성"}
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setEditingId(null);
                                    setFormData({ name: "", description: "", color: "#3B82F6" });
                                }}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )}

                {/* Class List */}
                <div className="space-y-2">
                    {classes.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            클래스가 없습니다. 새 클래스를 만들어주세요.
                        </p>
                    ) : (
                        classes.map((cls) => (
                            <div
                                key={cls.id}
                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-navy-950 transition-all cursor-pointer"
                                onClick={() => onClassSelect?.(cls.id)}
                            >
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: cls.color }}
                                />
                                <Folder className="h-5 w-5 text-gray-600" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{cls.name}</h4>
                                    {cls.description && (
                                        <p className="text-sm text-gray-600">{cls.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEdit(cls);
                                        }}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                                        title="수정"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(cls.id);
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="삭제"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
