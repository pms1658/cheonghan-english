"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Check, X, Clock } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late";

interface StudentAttendance {
    id: string;
    name: string;
    class: string;
    status: AttendanceStatus | null;
}

const mockStudents: StudentAttendance[] = [
    { id: "s1", name: "김민준", class: "고3-1반", status: null },
    { id: "s2", name: "이서연", class: "고3-1반", status: null },
    { id: "s3", name: "박지호", class: "고3-2반", status: null },
    { id: "s4", name: "최유진", class: "고2-1반", status: null },
];

const classes = ["전체", "고3-1반", "고3-2반", "고2-1반", "고2-2반"];

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState("전체");
    const [students, setStudents] = useState<StudentAttendance[]>(mockStudents);

    const filteredStudents = selectedClass === "전체"
        ? students
        : students.filter(s => s.class === selectedClass);

    const updateAttendance = (id: string, status: AttendanceStatus) => {
        setStudents(students.map(s => s.id === id ? { ...s, status } : s));
    };

    const stats = {
        total: filteredStudents.length,
        present: filteredStudents.filter(s => s.status === "present").length,
        absent: filteredStudents.filter(s => s.status === "absent").length,
        late: filteredStudents.filter(s => s.status === "late").length,
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">출결 체크</h2>
                <p className="text-navy-300 mt-2">학생 출석 관리</p>
            </div>

            {/* Date and Class Selector */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-galaxy-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>
                <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                >
                    {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-navy-800 border-navy-700">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-navy-300 text-sm">전체</p>
                            <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-navy-800 border-green-700/50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-green-300 text-sm">출석</p>
                            <p className="text-3xl font-bold text-green-400 mt-2">{stats.present}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-navy-800 border-yellow-700/50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-yellow-300 text-sm">지각</p>
                            <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.late}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-navy-800 border-red-700/50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-red-300 text-sm">결석</p>
                            <p className="text-3xl font-bold text-red-400 mt-2">{stats.absent}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Sheet */}
            <Card className="bg-navy-800 border-navy-700 text-white">
                <CardHeader>
                    <CardTitle>출석부</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-4 bg-navy-900/50 rounded-lg hover:bg-navy-900 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="font-medium text-white">{student.name}</p>
                                        <p className="text-xs text-navy-400">{student.class}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateAttendance(student.id, "present")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${student.status === "present"
                                                ? "bg-green-600 text-white"
                                                : "bg-navy-800 text-navy-300 hover:bg-green-600/20 hover:text-green-400"
                                            }`}
                                    >
                                        <Check className="h-4 w-4" />
                                        출석
                                    </button>
                                    <button
                                        onClick={() => updateAttendance(student.id, "late")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${student.status === "late"
                                                ? "bg-yellow-600 text-white"
                                                : "bg-navy-800 text-navy-300 hover:bg-yellow-600/20 hover:text-yellow-400"
                                            }`}
                                    >
                                        <Clock className="h-4 w-4" />
                                        지각
                                    </button>
                                    <button
                                        onClick={() => updateAttendance(student.id, "absent")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${student.status === "absent"
                                                ? "bg-red-600 text-white"
                                                : "bg-navy-800 text-navy-300 hover:bg-red-600/20 hover:text-red-400"
                                            }`}
                                    >
                                        <X className="h-4 w-4" />
                                        결석
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button className="px-6 py-2 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all">
                            저장
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
