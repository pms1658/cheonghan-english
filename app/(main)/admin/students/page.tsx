"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Edit, Trash2, FolderPlus } from "lucide-react";
import { User, UserRole } from "@/types/user";

// Mock student data
const mockStudents: User[] = [
    { id: "s1", username: "student01", name: "김민준", role: UserRole.STUDENT, class: "고3-1반" },
    { id: "s2", username: "student02", name: "이서연", role: UserRole.STUDENT, class: "고3-1반" },
    { id: "s3", username: "student03", name: "박지호", role: UserRole.STUDENT, class: "고3-2반" },
    { id: "s4", username: "student04", name: "최유진", role: UserRole.STUDENT, class: "고2-1반" },
];

const initialClasses = ["고3-1반", "고3-2반", "고2-1반", "고2-2반"];

export default function StudentsPage() {
    const [students, setStudents] = useState<User[]>(mockStudents);
    const [classes, setClasses] = useState<string[]>(initialClasses);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isAddingClass, setIsAddingClass] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [newStudent, setNewStudent] = useState({
        username: "",
        password: "",
        name: "",
        class: "",
    });

    const filteredStudents = students.filter((student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateStudent = () => {
        if (!newStudent.username || !newStudent.password || !newStudent.name || !newStudent.class) {
            alert("모든 필드를 입력해주세요");
            return;
        }

        const student: User = {
            id: `s${students.length + 1}`,
            username: newStudent.username,
            name: newStudent.name,
            role: UserRole.STUDENT,
            class: newStudent.class,
        };

        setStudents([...students, student]);
        setNewStudent({ username: "", password: "", name: "", class: "" });
        setIsCreating(false);
        alert(`학생 계정 생성 완료!\nID: ${newStudent.username}\nPW: ${newStudent.password}`);
    };

    const handleAddClass = () => {
        if (!newClassName.trim()) {
            alert("클래스 이름을 입력해주세요");
            return;
        }
        if (classes.includes(newClassName)) {
            alert("이미 존재하는 클래스입니다");
            return;
        }
        setClasses([...classes, newClassName]);
        setNewClassName("");
        setIsAddingClass(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white">학생 관리</h2>
                    <p className="text-navy-300 mt-2">학생 계정 생성 및 클래스 관리</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingClass(!isAddingClass)}
                        className="flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-all"
                    >
                        <FolderPlus className="h-5 w-5" />
                        클래스 추가
                    </button>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="flex items-center gap-2 px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        학생 추가
                    </button>
                </div>
            </div>

            {/* Add Class Form */}
            {isAddingClass && (
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardHeader>
                        <CardTitle>새 클래스 추가</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                placeholder="예: 고3-3반"
                                className="flex-1 px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                            />
                            <button
                                onClick={() => setIsAddingClass(false)}
                                className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAddClass}
                                className="px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                            >
                                추가
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <p className="text-sm text-navy-400 w-full">현재 클래스:</p>
                            {classes.map((cls) => (
                                <span key={cls} className="px-3 py-1 bg-galaxy-900/50 text-galaxy-300 rounded text-sm">
                                    {cls}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
                <input
                    type="text"
                    placeholder="학생 이름 또는 ID 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                />
            </div>

            {/* Create Student Form */}
            {isCreating && (
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardHeader>
                        <CardTitle>새 학생 계정 생성</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-navy-300 block mb-2">아이디 (ID)</label>
                                <input
                                    type="text"
                                    value={newStudent.username}
                                    onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                                    placeholder="student01"
                                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-navy-300 block mb-2">비밀번호</label>
                                <input
                                    type="password"
                                    value={newStudent.password}
                                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-navy-300 block mb-2">학생 이름</label>
                                <input
                                    type="text"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    placeholder="홍길동"
                                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-navy-300 block mb-2">클래스</label>
                                <select
                                    value={newStudent.class}
                                    onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                                >
                                    <option value="">클래스 선택</option>
                                    {classes.map((cls) => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2 justify-end">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateStudent}
                                className="px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                            >
                                생성
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Student List */}
            <Card className="bg-navy-800 border-navy-700 text-white">
                <CardHeader>
                    <CardTitle>학생 목록 ({filteredStudents.length}명)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-navy-700">
                                <tr>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">이름</th>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">아이디</th>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">클래스</th>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                                        <td className="py-3 px-4 text-white">{student.name}</td>
                                        <td className="py-3 px-4 text-navy-300">{student.username}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-galaxy-900/50 text-galaxy-300 rounded text-xs">
                                                {student.class}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button className="p-1 hover:bg-navy-600 rounded transition-all">
                                                    <Edit className="h-4 w-4 text-navy-400 hover:text-galaxy-400" />
                                                </button>
                                                <button className="p-1 hover:bg-navy-600 rounded transition-all">
                                                    <Trash2 className="h-4 w-4 text-navy-400 hover:text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
