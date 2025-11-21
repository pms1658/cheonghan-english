"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BookOpen, BookText, ListOrdered } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClassById, getSetsByClassId } from "@/lib/vocabulary-data";
import { SetCreator } from "@/components/vocabulary/SetCreator";
import { StudentManager } from "@/components/class/StudentManager";
import { useRole } from "@/contexts/RoleContext";
import Link from "next/link";

export default function ClassPage() {
    const { role } = useRole();
    const params = useParams();
    const classId = params.classId as string;

    const [classData, setClassData] = useState(getClassById(classId));
    const [sets, setSets] = useState(getSetsByClassId(classId));

    // Effect to reload data when classId changes or when returning to this page
    useEffect(() => {
        setClassData(getClassById(classId));
        setSets(getSetsByClassId(classId));
    }, [classId]);

    const refreshSets = () => {
        setSets(getSetsByClassId(classId));
    };

    if (!classData) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <p className="text-gray-500">클래스를 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    const getSetIcon = (type: string) => {
        switch (type) {
            case "vocabulary": return <BookOpen className="h-5 w-5 text-blue-600" />;
            case "chunk-reading": return <BookText className="h-5 w-5 text-green-600" />;
            case "sequence": return <ListOrdered className="h-5 w-5 text-purple-600" />;
            default: return <BookOpen className="h-5 w-5 text-gray-600" />;
        }
    };

    const getSetTypeLabel = (type: string) => {
        switch (type) {
            case "vocabulary": return "어휘학습";
            case "chunk-reading": return "끊어읽기";
            case "sequence": return "순서 세트";
            default: return "세트";
        }
    };

    const getSetTypeBadge = (type: string) => {
        switch (type) {
            case "vocabulary": return "bg-blue-100 text-blue-700";
            case "chunk-reading": return "bg-green-100 text-green-700";
            case "sequence": return "bg-purple-100 text-purple-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Class Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: classData.color }}
                    />
                    <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
                </div>
                {classData.description && (
                    <p className="text-gray-600">{classData.description}</p>
                )}
            </div>

            {/* Sets Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">학습 세트</h2>
                    {role === "admin" && (
                        <SetCreator classId={classId} onSetCreated={refreshSets} />
                    )}
                </div>

                {sets.length === 0 ? (
                    <Card className="bg-white border-gray-200">
                        <CardContent className="p-12 text-center">
                            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">아직 생성된 세트가 없습니다.</p>
                            <p className="text-sm text-gray-400 mt-1">새 세트를 만들어 학습을 시작하세요.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sets.map((set) => (
                            <Link key={set.id} href={`/class/${classId}/set/${set.id}`}>
                                <Card className="bg-white border-gray-200 hover:border-navy-950 hover:shadow-md transition-all cursor-pointer h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-gray-900">
                                            {getSetIcon(set.type)}
                                            <span className="truncate">{set.name}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {set.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{set.description}</p>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">
                                                {set.words.length}개 항목
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs ${getSetTypeBadge(set.type)}`}>
                                                {getSetTypeLabel(set.type)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Student Management (Admin Only) */}
            {role === "admin" && (
                <div className="mt-12">
                    <StudentManager classId={classId} />
                </div>
            )}
        </div>
    );
}
