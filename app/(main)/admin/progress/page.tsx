"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Share2, Download } from "lucide-react";

interface StudentProgress {
    id: string;
    name: string;
    class: string;
    avgScore: number;
    assignmentCompletion: number;
    attendanceRate: number;
}

const mockProgress: StudentProgress[] = [
    { id: "s1", name: "김민준", class: "고3-1반", avgScore: 95, assignmentCompletion: 100, attendanceRate: 100 },
    { id: "s2", name: "이서연", class: "고3-1반", avgScore: 88, assignmentCompletion: 90, attendanceRate: 95 },
    { id: "s3", name: "박지호", class: "고3-2반", avgScore: 92, assignmentCompletion: 85, attendanceRate: 90 },
    { id: "s4", name: "최유진", class: "고2-1반", avgScore: 78, assignmentCompletion: 75, attendanceRate: 85 },
];

export default function ProgressPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const filteredProgress = mockProgress.filter((student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleShare = (studentId: string) => {
        const shareUrl = `${window.location.origin}/share/progress/${studentId}`;
        navigator.clipboard.writeText(shareUrl);
        alert("학부모 공유 링크가 복사되었습니다!");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">학습현황</h2>
                <p className="text-navy-300 mt-2">학생별 성적 및 학습 데이터</p>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
                    <input
                        type="text"
                        placeholder="학생 이름 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    placeholder="시작일"
                    className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                />
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    placeholder="종료일"
                    className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                />
            </div>

            {/* Progress Table */}
            <Card className="bg-navy-800 border-navy-700 text-white">
                <CardHeader>
                    <CardTitle>학생 목록</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-navy-700">
                                <tr>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">이름</th>
                                    <th className="text-left py-3 px-4 text-navy-300 font-medium">클래스</th>
                                    <th className="text-center py-3 px-4 text-navy-300 font-medium">평균 점수</th>
                                    <th className="text-center py-3 px-4 text-navy-300 font-medium">과제 완료율</th>
                                    <th className="text-center py-3 px-4 text-navy-300 font-medium">출석률</th>
                                    <th className="text-center py-3 px-4 text-navy-300 font-medium">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProgress.map((student) => (
                                    <tr key={student.id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                                        <td className="py-3 px-4 text-white font-medium">{student.name}</td>
                                        <td className="py-3 px-4 text-navy-300">{student.class}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-bold ${student.avgScore >= 90 ? 'text-green-400' : student.avgScore >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {student.avgScore}점
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-navy-200">{student.assignmentCompletion}%</td>
                                        <td className="py-3 px-4 text-center text-navy-200">{student.attendanceRate}%</td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleShare(student.id)}
                                                    className="p-1 hover:bg-navy-600 rounded transition-all"
                                                    title="학부모 공유"
                                                >
                                                    <Share2 className="h-4 w-4 text-galaxy-400" />
                                                </button>
                                                <button className="p-1 hover:bg-navy-600 rounded transition-all" title="내역 다운로드">
                                                    <Download className="h-4 w-4 text-navy-400" />
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
