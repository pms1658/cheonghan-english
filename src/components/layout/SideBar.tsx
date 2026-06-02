'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ClassTree from './ClassTree';
import Logo from '@/components/common/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SideBarProps {
    isOpen: boolean;
    onClose: () => void;
    isAssignmentPage?: boolean;
}

export default function SideBar({ isOpen, onClose, isAssignmentPage = false }: SideBarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    // TODO: Fetch classes from context/db and build tree
    // Ideally pass this down or fetch inside sidebar. 
    // For Phase 1 scaffold, we use static/placeholder data.

    return (
        <aside
            role="navigation"
            aria-label="사이드바 메뉴"
            className={`
            fixed lg:sticky top-0 inset-y-0 left-0 z-[9999] lg:z-50
            w-[280px] lg:w-[220px] xl:w-[280px] h-[100dvh] bg-[#0A0E27] text-slate-300 flex flex-col
            transform transition-transform duration-300 ease-in-out border-r border-white/[0.08]
            ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Header / Logo Area */}
            <div className="pt-6 pb-6 xl:pt-10 xl:pb-10 flex justify-center">
                <Link href="/dashboard" className="block relative group cursor-pointer">
                    {/* Main Container - 1.3cm (approx 50px) margin on each side of 280px sidebar = 180px wide */}
                    <div className="w-[140px] h-[140px] xl:w-[180px] xl:h-[180px] relative bg-[#083973] rounded-[2rem] xl:rounded-[2.5rem] shadow-2xl shadow-blue-900/60 ring-1 ring-white/15 overflow-hidden transform group-hover:scale-[1.03] transition-transform duration-500 flex items-center justify-center p-1">
                        <Logo className="w-full h-full" />

                        {/* Premium Glass Badge Shine */}
                        {/* 1. Subtle High-Quality Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                        {/* 2. Inner Edge highlight for definition */}
                        <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>

                        {/* 3. Soft Bottom Depth */}
                        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                    </div>
                </Link>
            </div>

            {/* Theme Toggle — under logo */}
            <div className="flex justify-center pb-4">
                <ThemeToggle />
            </div>

            {/* Scrollable Nav Content */}
            <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden flex flex-col" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                {/* Section 1: Global Tools */}
                <div className="mb-6 px-3">
                    <div className="px-3 xl:px-4 text-[9px] xl:text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Notice & Guide</div>

                    <div className="space-y-0.5 mx-1">
                        <Link href="/board"
                            onClick={onClose}
                            className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/board') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                            <span className="text-[12px] xl:text-[13px]">공지사항</span>
                            {pathname.startsWith('/board') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                        </Link>

                        <Link href="/feedback"
                            onClick={onClose}
                            className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/feedback') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                            <span className="text-[12px] xl:text-[13px]">피드백</span>
                            {pathname.startsWith('/feedback') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                        </Link>

                        <Link href="/guide"
                            onClick={onClose}
                            className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/guide') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                            <span className="text-[12px] xl:text-[13px]">구조독해 가이드</span>
                            {pathname.startsWith('/guide') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                        </Link>

                        <Link href="/writing"
                            onClick={onClose}
                            className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/writing') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                            <span className="text-[12px] xl:text-[13px]">구조작문 가이드</span>
                            {pathname.startsWith('/writing') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                        </Link>
                    </div>
                </div>

                {/* Section 2: Class Tree */}
                <div className="flex-1 pt-6 px-3">
                    <ClassTree onNavigate={onClose} />
                </div>

            </div>


        </aside>
    );
}
