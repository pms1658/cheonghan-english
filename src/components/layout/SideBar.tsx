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
            ${isOpen ? 'translate-x-0 shadow-2xl w-[224px]' : '-translate-x-full lg:translate-x-0 w-[224px]'}
            ${isCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-[176px] xl:w-[224px]'}
        `}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Inner container — fixed width prevents content reflow during animation */}
            <div className="w-[224px] lg:w-[176px] xl:w-[224px] flex-shrink-0 flex flex-col h-full">

                {/* Header / Logo Area */}
                <div className="pt-5 pb-3 xl:pt-6 xl:pb-4 flex flex-col items-center relative">
                    <Link href="/dashboard" className="block relative group cursor-pointer">
                        <div className="w-[96px] h-[96px] xl:w-[128px] xl:h-[128px] relative bg-[#083973] rounded-[1.75rem] xl:rounded-[2rem] shadow-2xl shadow-blue-900/60 ring-1 ring-white/15 overflow-hidden transform group-hover:scale-[1.03] transition-transform duration-500 flex items-center justify-center p-1">
                            <Logo className="w-full h-full" />
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                            <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        </div>
                    </Link>

                    {/* Control cluster: Dark mode toggle + Collapse button — top-right corner */}
                    <div className="absolute top-3 right-2 flex flex-col items-center gap-1.5">
                        {/* Theme Toggle (compact icon-only mode) */}
                        <ThemeToggle compact />

                        {/* Collapse button */}
                        {onCollapseToggle && (
                            <button
                                onClick={onCollapseToggle}
                                className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/50 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all duration-200 group"
                                title="사이드바 접기"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                                    <path strokeWidth="1.5" d="M9 3v18" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14 15l-2.5-3 2.5-3" />
                                </svg>
                            </button>
                        )}
                    </div>

                </div>

                {/* Scrollable Nav Content */}
                <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden flex flex-col" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                    {/* Section 1: Notice & Guide */}
                    <div className="pt-5 mb-6 px-3">
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

                            {user?.role === 'admin' && (
                                <Link href="/about" onClick={onClose}
                                    className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${pathname.startsWith('/about') ? 'bg-white/10 text-white font-bold' : 'text-white font-medium hover:bg-white/5'}`}>
                                    <span className="text-[12px] xl:text-[13px]">브로셔</span>
                                    {pathname.startsWith('/about') && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>}
                                </Link>
                            )}

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
