'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getAdminDisplayName, getAdminDisplayNameEn } from '@/lib/adminConfig';
import { useRouter, usePathname } from 'next/navigation';
import { dbService, dbSubscriptions } from '@/services/db';
import { toast } from 'sonner';

interface TopBarProps {
    onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showPwChange, setShowPwChange] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [saving, setSaving] = useState(false);
    const [incompleteCount, setIncompleteCount] = useState(0);

    // Real-time incomplete homework count
    useEffect(() => {
        if (!user) return;
        const isAdminUser = (user as any)?.role === 'admin';
        const studentId = (user as any)?.id || (user as any)?.uid;
        if (isAdminUser || !studentId) return;

        // Subscribe to student's homework list + statuses
        let currentHomeworks: any[] = [];
        let currentStatuses: any[] = [];

        const recalculate = async () => {
            const todayD = new Date(); todayD.setHours(0,0,0,0);
            const todayStr = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
            const pastHws = currentHomeworks.filter((hw: any) => hw.date <= todayStr);
            let count = 0;
            for (const hw of pastHws) {
                const st = currentStatuses.find((s: any) => s.homeworkId === hw.id);
                if (st?.completed) continue;
                const hasOffline = hw.items.length > 0;
                if (hasOffline && !st?.completed) { count++; continue; }
                if (hw.linkedAssignments && hw.linkedAssignments.length > 0) {
                    const ids = hw.linkedAssignments.map((la: any) => la.assignmentId);
                    const completed = await dbService.checkLinkedAssignmentCompletion(studentId, ids, hw.createdAt);
                    const allLinkedDone = hw.linkedAssignments.every((la: any) => completed.includes(la.assignmentId));
                    if (!allLinkedDone) count++;
                }
            }
            setIncompleteCount(count);
        };

        const unsub1 = dbSubscriptions.onStudentHomeworks(studentId, undefined, (hws) => {
            currentHomeworks = hws;
            recalculate();
        });
        const unsub2 = dbSubscriptions.onStudentStatuses(studentId, (sts) => {
            currentStatuses = sts;
            recalculate();
        });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const handleChangePassword = async () => {
        if (!newPw || newPw.length < 4) {
            toast.warning('새 비밀번호를 4자 이상 입력하세요.');
            return;
        }
        const tenantId = (user as any)?.tenantId;
        if (!tenantId) {
            toast.error('학원 정보를 찾을 수 없습니다.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userType: 'tenant_admin',
                    tenantId,
                    currentPassword: currentPw,
                    newPassword: newPw,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                toast.error(result.error || '비밀번호 변경에 실패했습니다.');
                return;
            }

            toast.success('비밀번호가 변경되었습니다!');
            setShowPwChange(false);
            setCurrentPw('');
            setNewPw('');
        } catch (e) {
            console.error('Failed to change password:', e);
            toast.error('비밀번호 변경 실패');
        } finally {
            setSaving(false);
        }
    };

    const isAdmin = (user as any)?.role === 'admin';
    const isSuperAdmin = (user as any)?.isSuperAdmin;

    return (
        <header
            className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0A0E27]/90 backdrop-blur-md sticky top-0 z-20"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
        >
            {/* Left: Mobile Menu & Breadcrumb/Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    aria-label="메뉴 열기"
                    className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                <div className="block">
                    <span className="text-lg sm:text-xl font-bold text-white tracking-tight truncate max-w-[200px] block">
                        {isAdmin ? '관리자 대시보드' : '나의 학습실'}
                    </span>
                </div>

                {/* Super Admin - next to title */}
                {isSuperAdmin && (
                    <Link
                        href="/super-admin"
                        className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${pathname?.startsWith('/super-admin')
                            ? 'bg-amber-400 text-[#0A0E27] shadow-lg shadow-amber-400/20'
                            : 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                            }`}
                        title="슈퍼 관리자"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        슈퍼관리
                    </Link>
                )}
            </div>

            {/* Right: Global Actions */}
            <div className="flex items-center gap-2 md:gap-3">

                {/* 1. Homework */}
                <Link
                    href={isAdmin ? "/admin/homework" : "/homework"}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        (pathname?.startsWith('/homework') || pathname?.startsWith('/admin/homework'))
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title={isAdmin ? '과제 관리' : '내 과제'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <span className="hidden lg:inline">{isAdmin ? '과제관리' : '내 과제'}</span>
                    {!isAdmin && incompleteCount > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/15 border border-red-500/25 rounded-md backdrop-blur-sm">
                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            <span className="text-[10px] font-black text-red-400">{incompleteCount}</span>
                        </span>
                    )}
                </Link>

                {/* 2. History / Learning Record */}
                <Link
                    href="/history"
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/history')
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title="학습 내역 조회"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <span className="hidden lg:inline">학습내역</span>
                </Link>

                {/* 2.5 Report */}
                <Link
                    href={isAdmin ? "/admin/report" : "/student/report"}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        (pathname?.startsWith('/admin/report') || pathname?.startsWith('/student/report'))
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title={isAdmin ? '성장 리포트' : '나의 리포트'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span className="hidden lg:inline">{isAdmin ? '리포트' : '리포트'}</span>
                </Link>
                {/* 3. Management (Student/PW) */}
                <Link
                    href="/management"
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/management')
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title={isAdmin ? '학생 관리' : '정보 설정'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="hidden lg:inline">{isAdmin ? '학원관리' : '설정'}</span>
                </Link>

                {/* Password Change (admin only, non-super) */}
                {isAdmin && !isSuperAdmin && (
                    <div className="relative hidden md:block">
                        <button
                            onClick={() => setShowPwChange(!showPwChange)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showPwChange
                                ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                            title="비밀번호 변경"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            <span className="hidden lg:inline">비번변경</span>
                        </button>

                        {/* Password Change Dropdown */}
                        {showPwChange && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowPwChange(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 p-4">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">🔑 비밀번호 변경</h4>
                                    <div className="space-y-2">
                                        <input
                                            type="password"
                                            value={currentPw}
                                            onChange={e => setCurrentPw(e.target.value)}
                                            placeholder="현재 비밀번호"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="password"
                                            value={newPw}
                                            onChange={e => setNewPw(e.target.value)}
                                            placeholder="새 비밀번호 (4자 이상)"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => { setShowPwChange(false); setCurrentPw(''); setNewPw(''); }}
                                            className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleChangePassword}
                                            disabled={saving}
                                            className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? '변경 중...' : '변경하기'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* User Profile & Logout */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-white">
                            {isAdmin
                                ? getAdminDisplayName((user as any)?.email).replace('!', '')
                                : `${(user as any)?.name || (user as any)?.id || '학생'}님`
                            }
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {isAdmin
                                ? getAdminDisplayNameEn((user as any)?.email)
                                : 'Student'
                            }
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        aria-label="로그아웃"
                        className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        title="로그아웃"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
