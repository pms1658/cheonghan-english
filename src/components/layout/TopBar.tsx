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
    isSidebarCollapsed?: boolean;
    onSidebarToggle?: () => void;
}

export default function TopBar({ onMenuClick, isSidebarCollapsed = false, onSidebarToggle }: TopBarProps) {
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
            className={`px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0A0E27] backdrop-blur-md sticky top-0 z-20 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'lg:pl-16' : ''}`}
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
                        className={`hidden md:flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors ${pathname?.startsWith('/super-admin')
                            ? 'bg-amber-400 text-[#0A0E27] shadow-lg shadow-amber-400/20'
                            : 'text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200'
                            }`}
                        title="슈퍼 관리자"
                    >
                        슈퍼관리
                    </Link>
                )}
            </div>

            {/* Right: Global Actions */}
            <div className="flex items-center gap-2 md:gap-3">

                {/* 1. Homework */}
                <Link
                    href={isAdmin ? "/admin/homework" : "/homework"}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${
                        (pathname?.startsWith('/homework') || pathname?.startsWith('/admin/homework'))
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-white hover:bg-white/10'
                        }`}
                >
                    {isAdmin ? '과제관리' : '내 과제'}
                    {!isAdmin && incompleteCount > 0 && (
                        <span className="flex items-center px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded-md">
                            <span className="text-[10px] font-black text-red-400">{incompleteCount}</span>
                        </span>
                    )}
                </Link>

                {/* 2. History */}
                <Link
                    href="/history"
                    className={`hidden md:flex items-center px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${pathname?.startsWith('/history')
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-white hover:bg-white/10'
                        }`}
                >
                    학습내역
                </Link>

                {/* 2.5 Report */}
                <Link
                    href={isAdmin ? "/admin/report" : "/student/report"}
                    className={`hidden md:flex items-center px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${
                        (pathname?.startsWith('/admin/report') || pathname?.startsWith('/student/report'))
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-white hover:bg-white/10'
                        }`}
                >
                    리포트
                </Link>
                {/* 3. Management */}
                <Link
                    href="/management"
                    className={`hidden md:flex items-center px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${pathname?.startsWith('/management')
                        ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                        : 'text-white hover:bg-white/10'
                        }`}
                >
                    {isAdmin ? '학원관리' : '설정'}
                </Link>

                {/* Password Change (admin only, non-super) */}
                {isAdmin && !isSuperAdmin && (
                    <div className="relative hidden md:block">
                        <button
                            onClick={() => setShowPwChange(!showPwChange)}
                            className={`flex items-center px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${showPwChange
                                ? 'bg-white text-[#0A0E27] shadow-lg shadow-white/10'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            비번변경
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
