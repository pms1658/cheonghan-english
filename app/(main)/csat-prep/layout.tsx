"use client";

import { LeftSidebar } from "@/components/navigation/LeftSidebar";
import { BookText, BookOpen } from "lucide-react";

export default function CsatPrepLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const sidebarItems = [
        {
            name: "어휘학습",
            href: "/csat-prep/vocabulary",
            icon: BookOpen,
        },
        {
            name: "끊어읽기",
            href: "/csat-prep/chunk-reading",
            icon: BookText,
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
