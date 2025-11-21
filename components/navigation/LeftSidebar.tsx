"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface SidebarItem {
    name: string;
    href: string;
    icon?: LucideIcon;
}

interface LeftSidebarProps {
    items: SidebarItem[];
}

export function LeftSidebar({ items }: LeftSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => pathname === href;

    if (items.length === 0) return null;

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <nav className="p-4 space-y-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                                    ? "bg-navy-950 text-white font-semibold shadow-sm"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            {Icon && <Icon className="h-5 w-5" />}
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
