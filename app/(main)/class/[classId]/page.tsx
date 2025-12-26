"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getClassById, getSetsByClassId } from "@/lib/vocabulary-data";
import { SetList } from "@/components/class/SetList";
import { StudentManager } from "@/components/class/StudentManager";
import { LearningPolicy } from "@/components/class/LearningPolicy";
import { useRole } from "@/contexts/RoleContext";

type TabType = "sets" | "students" | "policy";

export default function ClassPage() {
    const { role } = useRole();
    const params = useParams();
    const classId = params.classId as string;

    const [classData, setClassData] = useState(getClassById(classId));
    const [sets, setSets] = useState(getSetsByClassId(classId));
    const [activeTab, setActiveTab] = useState<TabType>("sets");

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

    const tabs = [
        { id: "sets" as TabType, name: "세트 목록", roles: ["student", "admin"] },
        { id: "students" as TabType, name: "학생 목록", roles: ["admin"] },
        { id: "policy" as TabType, name: "학습 정책", roles: ["admin"] },
    ];

    const visibleTabs = tabs.filter(tab => tab.roles.includes(role));

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Class Header */}
            <div className="mb-6">
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex gap-8">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? "border-navy-950 text-navy-950"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === "sets" && (
                    <SetList
                        classId={classId}
                        sets={sets}
                        onSetCreated={refreshSets}
                    />
                )}

                {activeTab === "students" && role === "admin" && (
                    <StudentManager classId={classId} />
                )}

                {activeTab === "policy" && role === "admin" && (
                    <LearningPolicy classId={classId} />
                )}
            </div>
        </div>
    );
}
