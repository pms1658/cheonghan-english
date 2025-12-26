"use client";

import { useState } from "react";
import { Bell, MessageSquare, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleSwitcher } from "./RoleSwitcher";
import { MessengerModal } from "./MessengerModal";
import { useRole } from "@/contexts/RoleContext";

export function TopBar() {
    const [isMessengerOpen, setIsMessengerOpen] = useState(false);
    const { role } = useRole();
    const pathname = usePathname();

    const navLinks = [
        { name: "학교내신", href: "/school-exam", roles: ["student", "admin"] },
        { name: "수능대비", href: "/csat-prep", roles: ["student", "admin"] },
        { name: "관리", href: "/admin", roles: ["admin"] },
        { name: "내정보", href: "/profile", roles: ["student", "admin"] },
    ];

    return (
        <>
            <header className="h-16 bg-navy-950 text-white shadow-md flex items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    {/* Logo and Title */}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Image
                            src="/logo.png"
                            alt="청한영어학원"
                            width={32}
                            height={32}
                            className="h-8 w-auto"
                        />
                        <h1 className="text-xl font-bold">청한영어학원 LMS</h1>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks
                            .filter(link => link.roles.includes(role))
                            .map(link => {
                                const isActive = pathname.startsWith(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? "bg-navy-800 text-white"
                                                : "text-navy-300 hover:text-white hover:bg-navy-900"
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <RoleSwitcher />

                    <button
                        onClick={() => setIsMessengerOpen(true)}
                        className="p-2 hover:bg-navy-900 rounded-lg transition-colors relative"
                        aria-label="메신저"
                    >
                        <MessageSquare className="h-5 w-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    <button
                        className="p-2 hover:bg-navy-900 rounded-lg transition-colors relative"
                        aria-label="알림"
                    >
                        <Bell className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2 pl-2 border-l border-navy-800">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">학생</span>
                    </div>
                </div>
            </header>

            <MessengerModal
                isOpen={isMessengerOpen}
                onClose={() => setIsMessengerOpen(false)}
            />
        </>
    );
}
