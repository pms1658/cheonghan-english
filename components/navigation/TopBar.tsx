"use client";

import Link from "next/link";
import { User, MessageSquare, ChevronDown } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useState } from "react";
import { RoleSwitcher } from "./RoleSwitcher";

export function TopBar() {
    const { role, setRole } = useRole();
    const [showAdminMenu, setShowAdminMenu] = useState(false);

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            {/* Logo - Center */}
            <div className="flex-1" />

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy-950 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">청</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">청한영어 LMS</h1>
            </div>

            <div className="flex-1" />

            {/* Right Side - Profile, Messages, Admin */}
            <div className="flex items-center gap-4">
                <RoleSwitcher />

                {/* Messages */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                    <MessageSquare className="h-5 w-5 text-gray-700" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Profile */}
                <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <User className="h-5 w-5 text-gray-700" />
                </Link>

                {/* Admin Menu (Admin Only) */}
                {role === "admin" && (
                    <div className="relative">
                        <button
                            onClick={() => setShowAdminMenu(!showAdminMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-lg transition-colors"
                        >
                            관리
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        {showAdminMenu && (
                            <>
                                <div
                                    className="fixed inset-0"
                                    onClick={() => setShowAdminMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                    <Link
                                        href="/admin/students"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowAdminMenu(false)}
                                    >
                                        학생 관리
                                    </Link>
                                    <Link
                                        href="/admin/classes"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowAdminMenu(false)}
                                    >
                                        클래스 관리
                                    </Link>
                                    <Link
                                        href="/admin/attendance"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowAdminMenu(false)}
                                    >
                                        출석부
                                    </Link>
                                    <Link
                                        href="/admin/assignments"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowAdminMenu(false)}
                                    >
                                        과제 관리
                                    </Link>
                                    <Link
                                        href="/admin/csat-materials"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setShowAdminMenu(false)}
                                    >
                                        수능자료 DB
                                    </Link>
                                    <div className="border-t border-gray-200 my-2" />
                                    <button
                                        onClick={() => {
                                            setRole(role === "admin" ? "student" : "admin");
                                            setShowAdminMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        역할 전환 (개발용)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
