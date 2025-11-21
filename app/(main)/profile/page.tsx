"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Calendar, Award } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

export default function ProfilePage() {
    const { role, setRole } = useRole();

    // Mock user data
    const userData = {
        name: role === "admin" ? "관리자" : "학생",
        id: role === "admin" ? "admin" : "student001",
        email: role === "admin" ? "admin@cheonghan.com" : "student@example.com",
        phone: "010-1234-5678",
        joinDate: "2024-01-01",
        role: role === "admin" ? "관리자" : "학생",
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">내정보</h2>
                    <p className="text-gray-600 mt-2">프로필 정보를 확인하세요</p>
                </div>

                {/* Profile Card */}
                <Card className="bg-white border-gray-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <User className="h-5 w-5" />
                            프로필 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-navy-950 flex items-center justify-center text-white text-2xl font-bold">
                                {userData.name.substring(0, 1)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{userData.name}</h3>
                                <p className="text-sm text-gray-600">{userData.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">이메일</p>
                                    <p className="text-gray-900">{userData.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">전화번호</p>
                                    <p className="text-gray-900">{userData.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">가입일</p>
                                    <p className="text-gray-900">{userData.joinDate}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Award className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">역할</p>
                                    <p className="text-gray-900">{userData.role}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Role Switch Card (Mock) */}
                <Card className="bg-white border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-gray-900">역할 전환 (개발용)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-600">
                                현재 역할: <strong className="text-gray-900">{role === "admin" ? "관리자" : "학생"}</strong>
                            </p>
                            <button
                                onClick={() => setRole(role === "admin" ? "student" : "admin")}
                                className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded transition-all"
                            >
                                {role === "admin" ? "학생으로 전환" : "관리자로 전환"}
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistics Card (학생인 경우) */}
                {role === "student" && (
                    <Card className="bg-white border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-gray-900">학습 통계</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">12</p>
                                    <p className="text-sm text-gray-600 mt-1">완료한 끊어읽기</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">156</p>
                                    <p className="text-sm text-gray-600 mt-1">학습한 어휘</p>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <p className="text-2xl font-bold text-purple-600">85%</p>
                                    <p className="text-sm text-gray-600 mt-1">평균 정답률</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
