'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    // If no user, don't show (login screen usually handles this, but safe check)
    if (!user) return null;

    const isAdmin = (user as any)?.role === 'admin';
    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    return (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 px-2 md:px-6 pt-2 pb-6 safe-area-bottom z-[100] flex justify-around items-center shadow-[0_-5px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.3)] transition-colors">
            {/* 1. Home (Dashboard) */}
            <Link
                href="/dashboard"
                aria-label="홈 대시보드"
                className={`flex flex-col items-center gap-1 md:gap-1.5 px-4 md:px-8 py-2 rounded-2xl transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${isActive('/dashboard') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15' : 'text-slate-400 dark:text-slate-500'
                    }`}
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <span className={`text-[10px] md:text-xs font-bold ${isActive('/dashboard') ? 'opacity-100' : 'opacity-80'}`}>홈</span>
            </Link>

            {/* 2. Record */}
            <Link
                href="/history"
                aria-label="학습 기록"
                className={`flex flex-col items-center gap-1 md:gap-1.5 px-4 md:px-8 py-2 rounded-2xl transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${isActive('/history') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15' : 'text-slate-400 dark:text-slate-500'
                    }`}
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <span className={`text-[10px] md:text-xs font-bold ${isActive('/history') ? 'opacity-100' : 'opacity-80'}`}>기록</span>
            </Link>

            {/* 2.5 Homework */}
            <Link
                href={isAdmin ? "/admin/homework" : "/homework"}
                aria-label={isAdmin ? '과제 관리' : '내 과제'}
                className={`flex flex-col items-center gap-1 md:gap-1.5 px-4 md:px-8 py-2 rounded-2xl transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${(isActive('/homework') || isActive('/admin/homework')) ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15' : 'text-slate-400 dark:text-slate-500'
                    }`}
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                <span className={`text-[10px] md:text-xs font-bold ${(isActive('/homework') || isActive('/admin/homework')) ? 'opacity-100' : 'opacity-80'}`}>{isAdmin ? '과제관리' : '과제'}</span>
            </Link>


            {/* 3. My Info */}
            <Link
                href="/management"
                aria-label="내 정보 관리"
                className={`flex flex-col items-center gap-1 md:gap-1.5 px-4 md:px-8 py-2 rounded-2xl transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${isActive('/management') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15' : 'text-slate-400 dark:text-slate-500'
                    }`}
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                <span className={`text-[10px] md:text-xs font-bold ${isActive('/management') ? 'opacity-100' : 'opacity-80'}`}>내 정보</span>
            </Link>
        </div>
    );
}
