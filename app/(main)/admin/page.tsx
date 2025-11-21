"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">관리자 대시보드</h2>
                <p className="text-gray-600 mt-2">학원 관리 시스템 개요</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">총 학생</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">24명</p>
                            </div>
                            <Users className="h-10 w-10 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">수능자료</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">1개</p>
                            </div>
                            <FileText className="h-10 w-10 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">끊어읽기 지문</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">3개</p>
                            </div>
                            <BookOpen className="h-10 w-10 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">평균 진도율</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">67%</p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white border-gray-200">
                <CardHeader>
                    <CardTitle className="text-gray-900">빠른 작업</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/admin/csat-materials">
                            <div className="p-4 border border-gray-200 rounded-lg hover:border-navy-950 hover:shadow-md transition-all cursor-pointer">
                                <FileText className="h-8 w-8 text-blue-600 mb-2" />
                                <h3 className="font-semibold text-gray-900">수능자료 관리</h3>
                                <p className="text-sm text-gray-600 mt-1">지문 추가 및 교재 생성</p>
                            </div>
                        </Link>

                        <Link href="/admin/chunk-reading">
                            <div className="p-4 border border-gray-200 rounded-lg hover:border-navy-950 hover:shadow-md transition-all cursor-pointer">
                                <BookOpen className="h-8 w-8 text-purple-600 mb-2" />
                                <h3 className="font-semibold text-gray-900">끊어읽기 관리</h3>
                                <p className="text-sm text-gray-600 mt-1">지문 관리 및 배정</p>
                            </div>
                        </Link>

                        <Link href="/admin/students">
                            <div className="p-4 border border-gray-200 rounded-lg hover:border-navy-950 hover:shadow-md transition-all cursor-pointer">
                                <Users className="h-8 w-8 text-green-600 mb-2" />
                                <h3 className="font-semibold text-gray-900">학생 관리</h3>
                                <p className="text-sm text-gray-600 mt-1">학생 정보 및 성적 관리</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border-gray-200">
                <CardHeader>
                    <CardTitle className="text-gray-900">최근 활동</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            <p className="text-sm text-gray-900">
                                <strong>2023학년도 6월모평 18번</strong> 자료가 추가되었습니다
                            </p>
                            <span className="text-xs text-gray-500 ml-auto">방금 전</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                            <p className="text-sm text-gray-900">
                                시스템이 시작되었습니다
                            </p>
                            <span className="text-xs text-gray-500 ml-auto">오늘</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
