"use client";

import { LeftSidebar } from "@/components/navigation/LeftSidebar";
import { Settings, Users, BookOpen, FileText } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { redirect } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { role } = useRole();

    // Redirect non-admin users
    if (role !== "admin") {
        redirect("/");
    }

    const sidebarItems = [
        {
            name: "대시보드",
            href: "/admin",
            icon: Settings,
        },
        {
            name: "학생 관리",
            href: "/admin/students",
            icon: Users,
        },
        {
            name: "수능자료",
            href: "/admin/csat-materials",
            icon: FileText,
        },
        {
            name: "끊어읽기 관리",
            href: "/admin/chunk-reading",
            icon: BookOpen,
        },
    ];

    return (
        <div className="flex">
            <LeftSidebar items={sidebarItems} />
            <div className="flex-1 p-8">
                <div className="mx-auto max-w-6xl">
                    {children}
                </div>
            </div>
        </div>
    );
}
