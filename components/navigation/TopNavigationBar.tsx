"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, BookOpen, Target, Settings, User } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

export function TopNavigationBar() {
    const pathname = usePathname();
    const { role, setRole } = useRole();

    const navItems = [
        {
            name: "?ôÍµê?¥Ïã†",
            href: "/school-exam",
            icon: BookOpen,
            roles: ["student", "admin"],
        },
        {
            name: "?òÎä•?ÄÎπ?,
            href: "/csat-prep",
            icon: Target,
            roles: ["student", "admin"],
        },
        {
            name: "Í¥ÄÎ¶?,
            href: "/admin",
            icon: Settings,
            roles: ["admin"],
        },
        {
            name: "?¥Ï†ïÎ≥?,
            href: "/profile",
            icon: User,
            roles: ["student", "admin"],
        },
    ];

    const visibleItems = navItems.filter((item) => item.roles.includes(role));

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <header className="bg-navy-950 text-white shadow-md sticky top-0 z-50">
            <div className="mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <GraduationCap className="h-8 w-8 text-blue-400" />
                        <span className="text-xl font-bold">Ï≤?ïú?ÅÏñ¥ LMS</span>
                    </Link>

                    {/* Main Navigation */}
                    <nav className="flex items-center gap-2">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${active
                                            ? "bg-white/10 text-white font-semibold"
                                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Role Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-400">
                            {role === "admin" ? "Í¥ÄÎ¶¨Ïûê" : "?ôÏÉù"}
                        </div>
                        <button
                            onClick={() => setRole(role === "admin" ? "student" : "admin")}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                        >
                            ??ï† ?ÑÌôò
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
