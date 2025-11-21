"use client";

import { useRole } from "@/contexts/RoleContext";
import { UserCog, GraduationCap } from "lucide-react";

export function RoleSwitcher() {
    const { role, setRole } = useRole();

    return (
        <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
            <button
                onClick={() => setRole("student")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${role === "student"
                    ? "bg-white text-navy-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
            >
                <GraduationCap className="h-3.5 w-3.5" />
                학생
            </button>
            <button
                onClick={() => setRole("admin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${role === "admin"
                    ? "bg-navy-950 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
            >
                <UserCog className="h-3.5 w-3.5" />
                관리자
            </button>
        </div>
    );
}
