"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Users, ClipboardCheck, BarChart3, MessageSquare, FileText, User, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";
import { UserRole } from "@/types/user";

export function Sidebar() {
    const pathname = usePathname();
    const { currentUser, toggleRole } = useUser();

    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Navigation items based on role
    const adminNavigation = [
        { name: "학생 관리", href: "/admin/students", icon: Users },
        { name: "출결 체크", href: "/admin/attendance", icon: ClipboardCheck },
        { name: "학습현황", href: "/admin/progress", icon: BarChart3 },
        { name: "과제 관리", href: "/admin/assignments", icon: FileText },
        { name: "메신저", href: "/admin/messages", icon: MessageSquare },
    ];

    const studentNavigation = [
        { name: "내정보", href: "/dashboard", icon: User },
        { name: "과제 업로드", href: "/student/assignments", icon: FileText },
        { name: "메신저", href: "/student/messages", icon: MessageSquare },
    ];

    const sharedNavigation = [
        { name: "내신대비", href: "/school-exam", icon: BookOpen },
        { name: "수능대비", href: "/csat-prep", icon: GraduationCap },
    ];

    const navigation = isAdmin ? adminNavigation : studentNavigation;

    return (
        <div className="flex h-full w-64 flex-col bg-navy-950 text-white border-r border-navy-800">
            <div className="flex flex-col h-16 px-6 py-3 border-b border-navy-800">
                <h1 className="text-xl font-bold text-galaxy-300 tracking-wider">
                    청한영어
                </h1>
                <p className="text-xs text-navy-400 mt-0.5">
                    {isAdmin ? "관리자" : currentUser.name}
                </p>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-navy-800 text-galaxy-300 shadow-lg shadow-navy-900/50"
                                    : "text-navy-300 hover:bg-navy-800/50 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-galaxy-300" : "text-navy-400")} />
                            {item.name}
                        </Link>
                    );
                })}

                <div className="my-2 border-t border-navy-800"></div>

                {sharedNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-navy-800 text-galaxy-300 shadow-lg shadow-navy-900/50"
                                    : "text-navy-300 hover:bg-navy-800/50 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-galaxy-300" : "text-navy-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-navy-800 space-y-2">
                <button
                    onClick={toggleRole}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-galaxy-400 bg-navy-800/50 hover:bg-navy-800 transition-all"
                >
                    <RefreshCw className="h-5 w-5" />
                    {isAdmin ? "학생 모드로 전환" : "관리자 모드로 전환"}
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-navy-300 hover:bg-navy-800/50 hover:text-white transition-all">
                    <LogOut className="h-5 w-5 text-navy-400" />
                    로그아웃
                </button>
            </div>
        </div>
    );
}
