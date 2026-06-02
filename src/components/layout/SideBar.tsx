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
    isCollapsed?: boolean;
    onCollapseToggle?: () => void;
}

export default function SideBar({ isOpen, onClose, isAssignmentPage = false, isCollapsed = false, onCollapseToggle }: SideBarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <aside
            role="navigation"
            aria-label="사이드바 메뉴"
            className={`
            fixed lg:sticky top-0 inset-y-0 left-0 z-[9999] lg:z-50
            h-[100dvh] bg-[#0A0E27] text-slate-300 flex flex-col
            overflow-hidden
            border-r border-white/[0.08]
            transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isOpen ? 'translate-x-0 shadow-2xl w-[280px]' : '-translate-x-full lg:translate-x-0 w-[280px]'}
            ${isCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-[220px] xl:w-[280px]'}
        `}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Inner container — fixed width prevents content reflow during animation */}
            <div className="w-[280px] lg:w-[220px] xl:w-[280px] flex-shrink-0 flex flex-col h-full">

                {/* Header / Logo Area */}
                <div className="pt-6 pb-4 xl:pt-8 xl:pb-6 flex flex-col items-center relative">
                    <Link href="/dashboard" className="block relative group cursor-pointer">
                        <div className="w-[120px] h-[120px] xl:w-[160px] xl:h-[160px] relative bg-[#083973] rounded-[2rem] xl:rounded-[2.5rem] shadow-2xl shadow-blue-900/60 ring-1 ring-white/15 overflow-hidden transform group-hover:scale-[1.03] transition-transform duration-500 flex items-center justify-center p-1">
                            <Logo className="w-full h-full" />
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                            <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        </div>
                    </Link>

                    {/* Desktop collapse button — top-right of header */}
                    {onCollapseToggle && (
                        <button
                            onClick={onCollapseToggle}
                            className="hidden lg:flex absolute top-4 right-4 w-7 h-7 items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200"
                            title="사이드바 접기"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M21 12H4" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Theme Toggle */}
                <div className="flex justify-center pb-4">
                    <ThemeToggle />
                </div>

                {/* Scrollable Nav Content */}
                <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden flex flex-col" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                    {/* Section 1: Notice & Guide */}
                    <div className="mb-6 px-3">
                        <div className="px-3 xl:px-4 text-[9px] xl:text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Notice & Guide</div>

                        <div className="space-y-0.5 mx-1">
                            <Link href="/board" onClick={onClose}
                                className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/board') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                                <span className="text-[12px] xl:text-[13px]">공지사항</span>
                                {pathname.startsWith('/board') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                            </Link>

                            <Link href="/feedback" onClick={onClose}
                                className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/feedback') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                                <span className="text-[12px] xl:text-[13px]">피드백</span>
                                {pathname.startsWith('/feedback') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                            </Link>

                            <Link href="/guide" onClick={onClose}
                                className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/guide') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                                <span className="text-[12px] xl:text-[13px]">구조독해 가이드</span>
                                {pathname.startsWith('/guide') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                            </Link>

                            <Link href="/writing" onClick={onClose}
                                className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/writing') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                                <span className="text-[12px] xl:text-[13px]">구조작문 가이드</span>
                                {pathname.startsWith('/writing') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                            </Link>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-white/[0.08] mx-4 mb-1"></div>

                    {/* Section 2: Class Tree */}
                    <div className="flex-1 pt-3 px-3">
                        <ClassTree onNavigate={onClose} />
                    </div>

                </div>
            </div>
        </aside>
    );
}
