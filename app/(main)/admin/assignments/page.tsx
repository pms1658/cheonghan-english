"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Trash2, Eye } from "lucide-react";

interface SubmittedAssignment {
    id: string;
    studentName: string;
    class: string;
    title: string;
    submittedAt: Date;
    imageUrls: string[];
    checked: boolean;
}

const mockAssignments: SubmittedAssignment[] = [
    {
        id: "a1",
        studentName: "김민준",
        class: "고3-1반",
        title: "영어 독해 과제 #3",
        submittedAt: new Date("2025-11-20T14:30:00"),
        imageUrls: ["https://via.placeholder.com/300x400"],
        checked: false,
    },
    {
        id: "a2",
        studentName: "이서연",
        class: "고3-1반",
        title: "문법 워크북 p.45-50",
        submittedAt: new Date("2025-11-20T16:20:00"),
        imageUrls: ["https://via.placeholder.com/300x400"],
        checked: true,
    },
];

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<SubmittedAssignment[]>(mockAssignments);
    const [selectedImages, setSelectedImages] = useState<string[] | null>(null);

    const handleCheck = (id: string) => {
        setAssignments(assignments.map(a =>
            a.id === id ? { ...a, checked: !a.checked } : a
        ));
    };

    const handleDelete = (id: string) => {
        if (confirm("정말 이 과제를 삭제하시겠습니까?")) {
            setAssignments(assignments.filter(a => a.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">과제 관리</h2>
                <p className="text-navy-300 mt-2">제출된 과제 확인 및 관리</p>
            </div>

            {/* Assignment List */}
            <Card className="bg-navy-800 border-navy-700 text-white">
                <CardHeader>
                    <CardTitle>과제 목록</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-navy-400 border-b border-navy-700">
                            <div className="col-span-3">학생</div>
                            <div className="col-span-4">과제 제목</div>
                            <div className="col-span-2">제출 시간</div>
                            <div className="col-span-1">사진</div>
                            <div className="col-span-2 text-center">관리</div>
                        </div>
                        {assignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-navy-700/30 transition-all ${assignment.checked ? "bg-navy-900/30" : "bg-navy-900/50"
                                    }`}
                            >
                                <div className="col-span-3 flex items-center gap-2">
                                    <span className="font-medium text-white">{assignment.studentName}</span>
                                    <span className="text-xs text-navy-500">{assignment.class}</span>
                                </div>
                                <div className="col-span-4 flex items-center text-navy-200">
                                    {assignment.title}
                                </div>
                                <div className="col-span-2 flex items-center text-sm text-navy-400">
                                    {assignment.submittedAt.toLocaleString('ko-KR', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                                <div className="col-span-1 flex items-center">
                                    <button
                                        onClick={() => setSelectedImages(assignment.imageUrls)}
                                        className="flex items-center gap-1 text-sm text-galaxy-400 hover:text-galaxy-300"
                                    >
                                        <Eye className="h-4 w-4" />
                                        {assignment.imageUrls.length}
                                    </button>
                                </div>
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleCheck(assignment.id)}
                                        className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${assignment.checked
                                                ? "bg-green-600/20 text-green-400"
                                                : "bg-navy-700 text-navy-300 hover:bg-green-600/20 hover:text-green-400"
                                            }`}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {assignment.checked ? "확인완료" : "확인"}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assignment.id)}
                                        className="p-1 hover:bg-red-600/20 rounded transition-all"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Image Preview Modal */}
            {selectedImages && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                    onClick={() => setSelectedImages(null)}
                >
                    <div className="max-w-4xl max-h-[90vh] overflow-auto p-4">
                        <div className="grid gap-4">
                            {selectedImages.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt={`과제 이미지 ${idx + 1}`}
                                    className="rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
