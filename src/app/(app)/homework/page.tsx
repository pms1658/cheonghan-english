'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { dbService, dbSubscriptions } from '@/services/db';
import { Homework, HomeworkStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ───
function isNew(createdAt: number): boolean {
    return Date.now() - createdAt < 24 * 60 * 60 * 1000;
}

function formatKoreanDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
}

function isToday(dateStr: string): boolean {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export default function StudentHomeworkPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Phase 2: Student self-check state
    const [statusMap, setStatusMap] = useState<Record<string, HomeworkStatus>>({});
    const [togglingItem, setTogglingItem] = useState<string | null>(null); // "hwId_itemIdx"

    // Calendar state
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

    // Filter state
    const [filterMode, setFilterMode] = useState<'1w' | '1m' | 'all'>('1w');

    const isAdmin = (user as any)?.role === 'admin';
    const studentId = (user as any)?.id || (user as any)?.uid;

    useEffect(() => {
        if (authLoading) return;
        if (!user) return;

        if (isAdmin) {
            // Admin: real-time subscribe to all homeworks
            const unsub = dbSubscriptions.onHomeworks(undefined, (all) => {
                setHomeworks(all);
                setLoading(false);
            });
            return () => unsub();
        } else if (studentId) {
            // Student: subscribe to homework list + statuses simultaneously
            const unsub1 = dbSubscriptions.onStudentHomeworks(studentId, undefined, async (mine) => {
                setHomeworks(mine);
                // Check linked assignment completions
                const linkedStatuses: Record<string, string[]> = {};
                await Promise.all(mine.map(async (hw) => {
                    if (hw.linkedAssignments && hw.linkedAssignments.length > 0) {
                        const ids = hw.linkedAssignments.map(la => la.assignmentId);
                        const completed = await dbService.checkLinkedAssignmentCompletion(studentId, ids, hw.createdAt);
                        if (completed.length > 0) linkedStatuses[hw.id] = completed;
                    }
                }));
                // Merge linked statuses into statusMap
                setStatusMap(prev => {
                    const next = { ...prev };
                    for (const [hwId, completedIds] of Object.entries(linkedStatuses)) {
                        if (!next[hwId]) next[hwId] = { id: `${hwId}_${studentId}`, homeworkId: hwId, studentId, studentName: '', completed: false };
                        next[hwId].completedAssignments = completedIds;
                    }
                    return next;
                });
                setLoading(false);
            });

            const unsub2 = dbSubscriptions.onStudentStatuses(studentId, (statuses) => {
                setStatusMap(prev => {
                    const merged = { ...prev };
                    statuses.forEach(s => {
                        const existing = merged[s.homeworkId];
                        merged[s.homeworkId] = {
                            ...s,
                            // Preserve client-computed completedAssignments if Firestore doc doesn't have it
                            completedAssignments: s.completedAssignments || existing?.completedAssignments,
                        };
                    });
                    return merged;
                });
            });

            return () => { unsub1(); unsub2(); };
        }
    }, [user, authLoading]);

    // v2: Total items count (offline + linked)
    const getTotalItems = (hw: Homework): number => {
        return hw.items.length + (hw.linkedAssignments?.length || 0);
    };

    // v2: Check linked assignment completion
    const isLinkedComplete = (hwId: string, assignmentId: string): boolean => {
        return statusMap[hwId]?.completedAssignments?.includes(assignmentId) || false;
    };

    // Phase 2: Toggle individual item check
    const handleToggleItem = async (hw: Homework, itemIndex: number) => {
        if (isAdmin || !studentId) return;
        const key = `${hw.id}_${itemIndex}`;
        setTogglingItem(key);
        try {
            const userName = (user as any)?.name || studentId;
            const result = await dbService.toggleStudentHomeworkItem(
                hw.id, studentId, userName, itemIndex, getTotalItems(hw)
            );
            setStatusMap(prev => ({
                ...prev,
                [hw.id]: {
                    ...prev[hw.id],
                    id: `${hw.id}_${studentId}`,
                    homeworkId: hw.id,
                    studentId,
                    studentName: userName,
                    completed: prev[hw.id]?.completed || false,
                    completedItems: result.completedItems,
                    studentCompleted: result.studentCompleted,
                    studentCheckedAt: Date.now(),
                }
            }));
        } catch (e) {
            console.error('Failed to toggle item:', e);
        } finally {
            setTogglingItem(null);
        }
    };

    // Phase 2: Check if item is completed
    const isItemChecked = (hwId: string, itemIndex: number): boolean => {
        return statusMap[hwId]?.completedItems?.includes(itemIndex) || false;
    };

    const getCompletionCount = (hw: Homework): number => {
        const selfChecked = statusMap[hw.id]?.completedItems?.length || 0;
        const linkedComplete = statusMap[hw.id]?.completedAssignments?.length || 0;
        return selfChecked + linkedComplete;
    };

    // ─── Complete detection helper ───
    const isHwFullyComplete = (hw: Homework): boolean => {
        const st = statusMap[hw.id];
        if (st?.completed) return true; // admin confirmed
        const hasOffline = hw.items.length > 0;
        const offlineDone = !hasOffline || st?.completed; // offline needs admin confirm
        const linkedDone = (hw.linkedAssignments?.length || 0) === 0 || hw.linkedAssignments!.every(la => st?.completedAssignments?.includes(la.assignmentId));
        return !hasOffline ? linkedDone : (!!offlineDone && linkedDone);
    };

    // ─── Date helpers ───
    const todayStr = useMemo(() => {
        const d = new Date(); d.setHours(0,0,0,0);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }, []);

    const filterCutoff = useMemo(() => {
        const d = new Date(); d.setHours(0,0,0,0);
        if (filterMode === '1w') d.setDate(d.getDate() - 7);
        else if (filterMode === '1m') d.setMonth(d.getMonth() - 1);
        else return '1900-01-01'; // all
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }, [filterMode]);

    // ─── Filtered homeworks (for list, NOT calendar) ───
    const filteredHomeworks = useMemo(() => {
        return homeworks.filter(hw => {
            if (hw.date > todayStr) return false; // exclude future
            if (hw.date >= filterCutoff) return true; // within filter range
            return !isHwFullyComplete(hw); // older but incomplete
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [homeworks, todayStr, filterCutoff, statusMap]);

    // ─── Calendar Data ───
    const calendarDays = useMemo(() => {
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        const startPad = firstDay.getDay(); // 0=Sun
        const totalDays = lastDay.getDate();

        const days: { date: number; dateStr: string; isCurrentMonth: boolean }[] = [];

        // Previous month padding
        const prevLastDay = new Date(calYear, calMonth, 0).getDate();
        for (let i = startPad - 1; i >= 0; i--) {
            const d = prevLastDay - i;
            const m = calMonth === 0 ? 11 : calMonth - 1;
            const y = calMonth === 0 ? calYear - 1 : calYear;
            days.push({
                date: d,
                dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                isCurrentMonth: false
            });
        }

        // Current month
        for (let d = 1; d <= totalDays; d++) {
            days.push({
                date: d,
                dateStr: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                isCurrentMonth: true
            });
        }

        // Next month padding (fill to 42 = 6 rows)
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const m = calMonth === 11 ? 0 : calMonth + 1;
            const y = calMonth === 11 ? calYear + 1 : calYear;
            days.push({
                date: d,
                dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                isCurrentMonth: false
            });
        }

        return days;
    }, [calYear, calMonth]);

    const homeworkByDate = useMemo(() => {
        const map = new Map<string, Homework[]>();
        homeworks.forEach(hw => {
            const existing = map.get(hw.date) || [];
            existing.push(hw);
            map.set(hw.date, existing);
        });
        return map;
    }, [homeworks]);

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    const goToPrevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };

    const goToNextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    const goToToday = () => {
        const today = new Date();
        setCalYear(today.getFullYear());
        setCalMonth(today.getMonth());
    };

    // ─── Selected date for calendar detail ───
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const selectedDateHomeworks = selectedDate ? (homeworkByDate.get(selectedDate) || []) : [];

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full pb-24 lg:pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isAdmin ? 'Homework Management' : 'My Assignments'}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none">
                    {isAdmin ? '과제 관리' : '내 과제'}
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-4 font-medium">
                    {isAdmin ? '등록된 과제를 확인하세요.' : '선생님이 부여한 과제를 확인하세요.'}
                </p>
            </motion.div>

            {/* ═══ DUAL LAYOUT: List(left) + Calendar(right) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ─── LEFT: Homework List ─── */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        {/* Filter pills */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                            {([['1w', '1주'], ['1m', '1개월'], ['all', '전체']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterMode(key)}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                        filterMode === key
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >{label}</button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 font-bold">
                            {filteredHomeworks.length}개 과제
                            {filteredHomeworks.some(hw => !isHwFullyComplete(hw) && hw.date < filterCutoff) && (
                                <span className="text-red-400 ml-1">· 미완료 포함</span>
                            )}
                        </p>
                    </div>
                    {filteredHomeworks.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">아직 부여된 과제가 없습니다</p>
                        </div>
                    ) : (
                        filteredHomeworks.map((hw, idx) => {
                            const expanded = expandedId === hw.id;
                            return (
                                <motion.div
                                    key={hw.id}
                                    id={`hw-${hw.date}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div
                                        onClick={() => setExpandedId(expanded ? null : hw.id)}
                                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                                            isToday(hw.date)
                                                ? 'border-blue-300 dark:border-blue-500/50 shadow-md shadow-blue-500/10'
                                                : 'border-slate-200 dark:border-white/10 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isToday(hw.date) && (
                                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md uppercase">TODAY</span>
                                                )}
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{hw.title}</h3>
                                                {isNew(hw.createdAt) && (
                                                    <span className="relative flex items-center">
                                                        <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md">NEW</span>
                                                        <span className="absolute inset-0 bg-rose-500 rounded-md animate-ping opacity-30" />
                                                    </span>
                                                )}
                                                {/* Completion badges */}
                                                {!isAdmin && (() => {
                                                    const adminConfirmed = statusMap[hw.id]?.completed;
                                                    const allLinkedDone = (hw.linkedAssignments?.length || 0) > 0 && 
                                                        hw.linkedAssignments!.every(la => isLinkedComplete(hw.id, la.assignmentId));
                                                    const studentSelfDone = statusMap[hw.id]?.studentCompleted;
                                                    const hasOnlyLinked = hw.items.length === 0 && (hw.linkedAssignments?.length || 0) > 0;

                                                    if (adminConfirmed) {
                                                        return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md">완료</span>;
                                                    } else if (hasOnlyLinked && allLinkedDone) {
                                                        return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md">완료</span>;
                                                    } else if (studentSelfDone && allLinkedDone) {
                                                        return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md">완료</span>;
                                                    } else if (studentSelfDone) {
                                                        return <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-md">DONE</span>;
                                                    } else if (getCompletionCount(hw) > 0) {
                                                        return <span className="text-[10px] font-bold text-blue-500">{getCompletionCount(hw)}/{getTotalItems(hw)}</span>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">{formatKoreanDate(hw.date)}</span>
                                        </div>

                                        {/* Progress bar */}
                                        {!isAdmin && getTotalItems(hw) > 0 && getCompletionCount(hw) > 0 && (
                                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        statusMap[hw.id]?.completed || (statusMap[hw.id]?.studentCompleted && (hw.linkedAssignments || []).every(la => isLinkedComplete(hw.id, la.assignmentId)))
                                                            ? 'bg-blue-500' 
                                                            : statusMap[hw.id]?.studentCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${(getCompletionCount(hw) / getTotalItems(hw)) * 100}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* Items */}
                                        <div className="space-y-1.5">
                                            {(expanded ? hw.items : hw.items.slice(0, 3)).map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-start gap-2 text-sm transition-all ${
                                                        isItemChecked(hw.id, i)
                                                            ? 'text-slate-400 dark:text-slate-600'
                                                            : 'text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {!isAdmin ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleItem(hw, i); }}
                                                            disabled={togglingItem === `${hw.id}_${i}`}
                                                            className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
                                                                isItemChecked(hw.id, i)
                                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                                                            } ${togglingItem === `${hw.id}_${i}` ? 'opacity-50' : ''}`}
                                                        >
                                                            {isItemChecked(hw.id, i) && (
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-blue-500 font-bold min-w-[20px] text-right">{i + 1}.</span>
                                                    )}
                                                    <span className={isItemChecked(hw.id, i) ? 'line-through' : ''}>{item}</span>
                                                </div>
                                            ))}
                                            {/* Linked assignments */}
                                            {(expanded ? hw.linkedAssignments || [] : (hw.linkedAssignments || []).slice(0, Math.max(0, 3 - hw.items.length))).map((la, i) => {
                                                const isComplete = isLinkedComplete(hw.id, la.assignmentId);
                                                const itemNum = hw.items.length + i + 1;
                                                return (
                                                    <div
                                                        key={`la-${i}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isAdmin && la.classId) {
                                                                router.push(`/student/assignment/${la.assignmentId}?classId=${la.classId}`);
                                                            } else if (!isAdmin) {
                                                                router.push(`/student/assignment/${la.assignmentId}`);
                                                            }
                                                        }}
                                                        className={`flex items-start gap-2 text-sm transition-all cursor-pointer ${
                                                            isComplete ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {isComplete ? (
                                                            <span className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded border-2 bg-emerald-500 border-emerald-500 text-white flex items-center justify-center">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                            </span>
                                                        ) : (
                                                            <span className="text-indigo-500 font-bold min-w-[20px] text-right">{itemNum}.</span>
                                                        )}
                                                        <span className={`${isComplete ? 'line-through' : 'text-indigo-600 dark:text-indigo-400 hover:underline'}`}>{la.title}</span>
                                                        {!isComplete && !isAdmin && (
                                                            <svg className="w-3 h-3 text-indigo-400 opacity-50 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {!expanded && getTotalItems(hw) > 3 && (
                                                <p className="text-xs text-slate-400 pl-7">... 외 {getTotalItems(hw) - 3}개 항목</p>
                                            )}
                                        </div>

                                        {/* Expand indicator */}
                                        {getTotalItems(hw) > 3 && (
                                            <div className="flex justify-center mt-3">
                                                <svg className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ─── RIGHT: Calendar ─── */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-4 lg:sticky lg:top-24">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                                    {calYear}년 {monthNames[calMonth]}
                                </h2>
                                <button
                                    onClick={goToToday}
                                    className="px-2 py-0.5 text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                >
                                    오늘
                                </button>
                            </div>
                            <button onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-0.5">
                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                <div key={d} className={`text-center text-[9px] font-bold uppercase tracking-wider py-1 ${
                                    i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
                                }`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            {calendarDays.map((day, idx) => {
                                const dayHomeworks = homeworkByDate.get(day.dateStr) || [];
                                const hasHomework = dayHomeworks.length > 0;
                                const todayClass = isToday(day.dateStr);
                                const isSelected = selectedDate === day.dateStr;
                                const dayOfWeek = idx % 7;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (hasHomework) {
                                                setSelectedDate(isSelected ? null : day.dateStr);
                                                // Scroll to the homework card
                                                setTimeout(() => {
                                                    document.getElementById(`hw-${day.dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }
                                        }}
                                        className={`
                                            min-h-[36px] p-1 border-b border-r border-slate-100 dark:border-slate-800
                                            transition-all duration-150 flex flex-col items-center justify-start
                                            ${!day.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-950/50' : ''}
                                            ${hasHomework ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-500/5' : ''}
                                            ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-300 dark:ring-blue-500/50' : ''}
                                        `}
                                    >
                                        <span className={`
                                            text-[11px] font-bold leading-none
                                            ${!day.isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : 
                                              dayOfWeek === 0 ? 'text-rose-400' : 
                                              dayOfWeek === 6 ? 'text-blue-400' : 
                                              'text-slate-700 dark:text-slate-300'}
                                            ${todayClass ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]' : ''}
                                        `}>
                                            {day.date}
                                        </span>
                                        {hasHomework && (
                                            <div className="flex gap-0.5 mt-0.5">
                                                <span className="w-1 h-1 rounded-full bg-blue-500" />
                                                {dayHomeworks.length > 1 && <span className="w-1 h-1 rounded-full bg-blue-300" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected Date Detail */}
                        <AnimatePresence>
                            {selectedDate && selectedDateHomeworks.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {formatKoreanDate(selectedDate)} 과제
                                        </h3>
                                        <button
                                            onClick={() => setSelectedDate(null)}
                                            className="text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    {selectedDateHomeworks.map(hw => (
                                        <div key={hw.id} className="mb-3 last:mb-0">
                                            <p className="text-[10px] text-slate-400 font-bold mb-1">{hw.title}</p>
                                            <div className="space-y-0.5">
                                                {hw.items.map((item, i) => (
                                                    <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                                        <span className="text-blue-500 font-bold min-w-[14px] text-right">{i + 1}.</span>
                                                        <span className="truncate">{item}</span>
                                                    </p>
                                                ))}
                                                {hw.linkedAssignments?.map((la, i) => (
                                                    <p key={`la-${i}`} className="text-xs text-indigo-500 flex items-start gap-1.5">
                                                        <span className="font-bold min-w-[14px] text-right">{hw.items.length + i + 1}.</span>
                                                        <span className="truncate">{la.title}</span>
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

