"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Search, Users } from "lucide-react";
import {
    getAllStudents,
    getStudentsByClassId,
    addStudentToClass,
    removeStudentFromClass
} from "@/lib/vocabulary-data";
import { Student } from "@/types/vocabulary";

interface StudentManagerProps {
    classId: string;
}

export function StudentManager({ classId }: StudentManagerProps) {
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        refreshStudents();
        setAllStudents(getAllStudents());
    }, [classId]);

    const refreshStudents = () => {
        setEnrolledStudents(getStudentsByClassId(classId));
    };

    const handleAddStudent = (studentId: string) => {
        if (addStudentToClass(classId, studentId)) {
            refreshStudents();
        }
    };

    const handleRemoveStudent = (studentId: string) => {
        if (confirm("이 학생을 클래스에서 제외하시겠습니까?")) {
            if (removeStudentFromClass(classId, studentId)) {
                refreshStudents();
            }
        }
    };

    const unenrolledStudents = allStudents.filter(
        s => !enrolledStudents.some(es => es.id === s.id)
    );

    const filteredUnenrolledStudents = unenrolledStudents.filter(s =>
        s.name.includes(searchQuery) || s.email?.includes(searchQuery)
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-navy-950" />
                    <h2 className="text-lg font-bold text-gray-900">학생 관리</h2>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {enrolledStudents.length}명
                    </span>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 text-white text-sm rounded-lg hover:bg-navy-900 transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    학생 추가
                </button>
            </div>

            <div className="p-6">
                {enrolledStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p>등록된 학생이 없습니다.</p>
                        <p className="text-sm mt-1">우측 상단의 버튼을 눌러 학생을 추가하세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enrolledStudents.map(student => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-300 transition-colors"
                            >
                                <div>
                                    <div className="font-medium text-gray-900">{student.name}</div>
                                    <div className="text-xs text-gray-500">{student.email}</div>
                                </div>
                                <button
                                    onClick={() => handleRemoveStudent(student.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    title="제외"
                                >
                                    <UserMinus className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">학생 추가</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="이름 또는 이메일 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-950 text-sm"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {filteredUnenrolledStudents.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-4">
                                        {searchQuery ? "검색 결과가 없습니다." : "추가할 수 있는 학생이 없습니다."}
                                    </p>
                                ) : (
                                    filteredUnenrolledStudents.map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => handleAddStudent(student.id)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all text-left group"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.email}</div>
                                            </div>
                                            <div className="px-2 py-1 bg-navy-50 text-navy-950 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                                추가
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
