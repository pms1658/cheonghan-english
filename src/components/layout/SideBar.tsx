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
        <aside className={`
            fixed lg:sticky top-0 inset-y-0 left-0 z-[9999] lg:z-50
            w-[280px] lg:w-[220px] xl:w-[280px] h-[100dvh] bg-[#0A0E27] text-slate-300 flex flex-col
            transform transition-transform duration-300 ease-in-out
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

                    <div className="bg-white/5 rounded-xl xl:rounded-2xl py-1 mx-1 xl:mx-2 ring-1 ring-white/5 shadow-sm space-y-0.5">
                        <Link href="/board"
                            onClick={onClose}
                            className={`flex items-center justify-between px-3 py-2 mx-1 rounded-xl transition-all duration-200 group ${pathname.startsWith('/board') ? 'bg-white/10 text-white font-bold' : 'text-white/60 font-medium hover:text-white hover:bg-white/5'
                                }`}>
                            <div className="flex items-center gap-3">
                                <svg className={`w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] transition-transform duration-200 ${pathname.startsWith('/board') ? 'text-blue-400 scale-110' : 'text-white/40 group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                                <span className="text-[11px] xl:text-[13px]">공지사항</span>
                            </div>
                            {pathname.startsWith('/board') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </Link>

                        <Link href="/feedback"
                            onClick={onClose}
                            className={`flex items-center justify-between px-3 py-2 mx-1 rounded-xl transition-all duration-200 group ${pathname.startsWith('/feedback') ? 'bg-white/10 text-white font-bold' : 'text-white/60 font-medium hover:text-white hover:bg-white/5'
                                }`}>
                            <div className="flex items-center gap-3">
                                <svg className={`w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] transition-transform duration-200 ${pathname.startsWith('/feedback') ? 'text-blue-400 scale-110' : 'text-white/40 group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                <span className="text-[11px] xl:text-[13px]">피드백</span>
                            </div>
                            {pathname.startsWith('/feedback') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </Link>

                        <Link href="/guide"
                            onClick={onClose}
                            className={`flex items-center justify-between px-3 py-2 mx-1 rounded-xl transition-all duration-200 group ${pathname.startsWith('/guide') ? 'bg-white/10 text-white font-bold' : 'text-white/60 font-medium hover:text-white hover:bg-white/5'
                                }`}>
                            <div className="flex items-center gap-3">
                                <svg className={`w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] transition-transform duration-200 ${pathname.startsWith('/guide') ? 'text-blue-400 scale-110' : 'text-white/40 group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                <span className="text-[11px] xl:text-[13px]">구조독해 가이드</span>
                            </div>
                            {pathname.startsWith('/guide') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </Link>

                        <Link href="/writing"
                            onClick={onClose}
                            className={`flex items-center justify-between px-3 py-2 mx-1 rounded-xl transition-all duration-200 group ${pathname.startsWith('/writing') ? 'bg-white/10 text-white font-bold' : 'text-white/60 font-medium hover:text-white hover:bg-white/5'
                                }`}>
                            <div className="flex items-center gap-3">
                                <svg className={`w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] transition-transform duration-200 ${pathname.startsWith('/writing') ? 'text-blue-400 scale-110' : 'text-white/40 group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                <span className="text-[11px] xl:text-[13px]">구조작문 가이드</span>
                            </div>
                            {pathname.startsWith('/writing') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </Link>
                    </div>
                </div>

                {/* Section 2: Class Tree */}
                <div className="flex-1 bg-black/50 pt-6 px-3">
                    <ClassTree onNavigate={onClose} />
                </div>

            </div>


        </aside>
    );
}
