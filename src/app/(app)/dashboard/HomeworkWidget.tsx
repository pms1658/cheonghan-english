'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { dbService, dbSubscriptions } from '@/services/db';
import { Homework, HomeworkStatus } from '@/types';
import { SkeletonHomeworkWidget } from '@/components/common/Skeleton';

export default function HomeworkWidget({ user, isAdmin }: { user: any; isAdmin: boolean }) {
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
    const [statusMap, setStatusMap] = useState<Record<string, HomeworkStatus>>({});
    const [adminStatusMap, setAdminStatusMap] = useState<Record<string, HomeworkStatus>>({});
    const [loading, setLoading] = useState(true);
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());

    const studentsRef = React.useRef<{ id: string; name: string }[]>([]);

    useEffect(() => {
        if (!user) return;

        if (isAdmin) {
            let cancelled = false;
            const loadStudents = async () => {
                const sts = await dbService.getStudents();
                const mapped = sts.map(s => ({ id: s.id, name: s.name }));
                studentsRef.current = mapped;
                setStudents(mapped);
            };
            loadStudents();

            const unsub = dbSubscriptions.onHomeworks(undefined, async (all) => {
                if (cancelled) return;
                const todayD = new Date(); todayD.setHours(0,0,0,0);
                const weekAgo = new Date(todayD); weekAgo.setDate(weekAgo.getDate() - 7);
                const todayStr = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
                const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth()+1).padStart(2,'0')}-${String(weekAgo.getDate()).padStart(2,'0')}`;
                const recentHws = all.filter(hw => hw.date <= todayStr && hw.date >= weekAgoStr);
                setHomeworks(recentHws);

                const adminStatuses: Record<string, HomeworkStatus> = {};
                const currentStudents = studentsRef.current;
                await Promise.all(recentHws.map(async hw => {
                    const statuses = await dbService.getHomeworkStatuses(hw.id);
                    statuses.forEach(s => { adminStatuses[`${hw.id}_${s.studentId}`] = s; });
                    if (hw.linkedAssignments && hw.linkedAssignments.length > 0) {
                        const laIds = hw.linkedAssignments.map(la => la.assignmentId);
                        await Promise.all((hw.studentIds || []).map(async sid => {
                            const completedIds = await dbService.checkLinkedAssignmentCompletion(sid, laIds);
                            if (completedIds.length > 0) {
                                const key = `${hw.id}_${sid}`;
                                if (!adminStatuses[key]) {
                                    adminStatuses[key] = { id: key, homeworkId: hw.id, studentId: sid, studentName: currentStudents.find(s => s.id === sid)?.name || sid, completed: false };
                                }
                                adminStatuses[key].completedAssignments = completedIds;
                            }
                        }));
                    }
                }));
                if (!cancelled) {
                    setAdminStatusMap(adminStatuses);
                    setLoading(false);
                }
            });
            return () => { cancelled = true; unsub(); };
        } else {
            const studentId = (user as any)?.id || (user as any)?.uid;
            if (!studentId) return;

            const unsub1 = dbSubscriptions.onStudentHomeworks(studentId, undefined, async (mine) => {
                const todayD = new Date(); todayD.setHours(0,0,0,0);
                const weekAgo = new Date(todayD); weekAgo.setDate(weekAgo.getDate() - 7);
                const todayStr = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
                const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth()+1).padStart(2,'0')}-${String(weekAgo.getDate()).padStart(2,'0')}`;

                const linkedMap: Record<string, string[]> = {};
                await Promise.all(mine.map(async hw => {
                    if (hw.linkedAssignments && hw.linkedAssignments.length > 0) {
                        const ids = hw.linkedAssignments.map(la => la.assignmentId);
                        const completed = await dbService.checkLinkedAssignmentCompletion(studentId, ids);
                        if (completed.length > 0) linkedMap[hw.id] = completed;
                    }
                }));

                if (Object.keys(linkedMap).length > 0) {
                    setStatusMap(prev => {
                        const next = { ...prev };
                        for (const [hwId, completedIds] of Object.entries(linkedMap)) {
                            if (!next[hwId]) {
                                next[hwId] = { id: `${hwId}_${studentId}`, homeworkId: hwId, studentId, studentName: '', completed: false };
                            }
                            next[hwId] = { ...next[hwId], completedAssignments: completedIds };
                        }
                        return next;
                    });
                }

                const filtered = mine.filter(hw => {
                    if (hw.date > todayStr) return false;
                    if (hw.date >= weekAgoStr) return true;
                    return false;
                });
                setHomeworks(filtered);
                setLoading(false);
            });

            const unsub2 = dbSubscriptions.onStudentStatuses(studentId, (statuses) => {
                setStatusMap(prev => {
                    const next = { ...prev };
                    statuses.forEach(s => {
                        const existing = next[s.homeworkId];
                        next[s.homeworkId] = {
                            ...s,
                            completedAssignments: s.completedAssignments || existing?.completedAssignments,
                        };
                    });
                    return next;
                });
            });

            return () => { unsub1(); unsub2(); };
        }
    }, [user]);

    const isNewHw = (createdAt: number) => Date.now() - createdAt < 24 * 60 * 60 * 1000;
    const isTodayHw = (dateStr: string) => {
        const today = new Date();
        const d = new Date(dateStr + 'T00:00:00');
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };

    const getStudentName = (id: string) => students.find(s => s.id === id)?.name || id;

    if (loading) return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <SkeletonHomeworkWidget />
        </motion.div>
    );
    if (homeworks.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
            >
                <div className="bg-white dark:bg-[#0c102b] rounded-2xl border border-slate-200 dark:border-white/10 p-6 text-center">
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">오늘 부여된 과제가 없습니다</p>
                </div>
            </motion.div>
        );
    }

    // Admin view
    if (isAdmin) {
        const studentHomeworkMap = new Map<string, { name: string; homeworks: Homework[] }>();
        homeworks.forEach(hw => {
            hw.studentIds?.forEach(sid => {
                const status = adminStatusMap[`${hw.id}_${sid}`];
                const offlineAllDone = hw.items.length === 0 || (status?.completedItems?.length || 0) >= hw.items.length || status?.studentCompleted;
                const linkedAllDone = (hw.linkedAssignments?.length || 0) === 0 || hw.linkedAssignments!.every(la => status?.completedAssignments?.includes(la.assignmentId));
                const isHwFullyDone = (offlineAllDone && linkedAllDone) || status?.completed;

                if (isHwFullyDone) return;

                if (!studentHomeworkMap.has(sid)) {
                    studentHomeworkMap.set(sid, { name: getStudentName(sid), homeworks: [] });
                }
                studentHomeworkMap.get(sid)!.homeworks.push(hw);
            });
        });

        const entries = Array.from(studentHomeworkMap.entries())
            .sort((a, b) => a[1].name.localeCompare(b[1].name))
            .map(([sid, { name, homeworks: sHws }]) => {
                const pending = sHws.reduce((s, hw) => s + hw.items.length + (hw.linkedAssignments?.length || 0), 0);
                return { sid, name, pending };
            });

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
            >
                <div className="bg-white dark:bg-[#0c102b] rounded-2xl border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                이번주 과제
                            </h2>
                            {homeworks.some(h => isNewHw(h.createdAt)) && (
                                <span className="relative flex items-center">
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md uppercase">NEW</span>
                                    <span className="absolute inset-0 bg-rose-500 rounded-md animate-ping opacity-30" />
                                </span>
                            )}
                        </div>
                        <Link
                            href="/admin/homework"
                            className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1"
                        >
                            과제관리
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </Link>
                    </div>

                    {entries.length === 0 ? (
                        <p className="text-[13px] text-slate-400 dark:text-slate-500 font-medium py-2">모든 학생이 과제를 완료했습니다 ✓</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {entries.map(({ sid, name, pending }) => (
                                <Link
                                    key={sid}
                                    href={`/admin/homework?student=${sid}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-full text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/20 hover:text-blue-700 dark:hover:text-blue-400 transition-all"
                                >
                                    <span className="w-5 h-5 rounded-full bg-[#0A0E27] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                        {name.charAt(0)}
                                    </span>
                                    {name}
                                    <span className="text-blue-500 font-black">{pending}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // Student view
    const allStudentHomeworks = homeworks;

    const calendarDays = (() => {
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        const startPad = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const days: { date: number; dateStr: string; isCurrentMonth: boolean }[] = [];
        const prevLastDay = new Date(calYear, calMonth, 0).getDate();
        for (let i = startPad - 1; i >= 0; i--) {
            const d = prevLastDay - i;
            const m = calMonth === 0 ? 11 : calMonth - 1;
            const y = calMonth === 0 ? calYear - 1 : calYear;
            days.push({ date: d, dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, isCurrentMonth: false });
        }
        for (let d = 1; d <= totalDays; d++) {
            days.push({ date: d, dateStr: `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const m = calMonth === 11 ? 0 : calMonth + 1;
            const y = calMonth === 11 ? calYear + 1 : calYear;
            days.push({ date: d, dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, isCurrentMonth: false });
        }
        return days;
    })();

    const hwDateSet = new Set(allStudentHomeworks.map(hw => hw.date));
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
        >
            <div className="bg-white dark:bg-[#0c102b] rounded-2xl border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            이번주 과제
                        </h2>
                        {homeworks.some(h => isNewHw(h.createdAt)) && (
                            <span className="relative flex items-center">
                                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md uppercase">NEW</span>
                                <span className="absolute inset-0 bg-rose-500 rounded-md animate-ping opacity-30" />
                            </span>
                        )}
                    </div>
                    <Link
                        href="/homework"
                        className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                    >
                        전체보기 →
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 space-y-4">
                        {homeworks.filter(hw => {
                            const status = statusMap[hw.id];
                            const offlineAllDone = hw.items.length === 0 || (status?.completedItems?.length || 0) >= hw.items.length || status?.studentCompleted;
                            const linkedAllDone = (hw.linkedAssignments?.length || 0) === 0 || hw.linkedAssignments!.every(la => status?.completedAssignments?.includes(la.assignmentId));
                            const isHwFullyDone = (offlineAllDone && linkedAllDone) || status?.completed;
                            return !isHwFullyDone;
                        }).map((hw, idx) => {
                            const structuredItems: { text: string; linked?: { assignmentId: string; classId?: string } }[] = [
                                ...hw.items.map(item => ({ text: item })),
                                ...(hw.linkedAssignments?.map(la => ({
                                    text: la.title,
                                    linked: { assignmentId: la.assignmentId, classId: la.classId }
                                })) || [])
                            ];
                            const status = statusMap[hw.id];

                            const renderItem = (item: typeof structuredItems[0], num: number, originalIndex: number) => {
                                const isCompleted = item.linked
                                    ? status?.completedAssignments?.includes(item.linked.assignmentId)
                                    : status?.completedItems?.includes(originalIndex);

                                if (item.linked) {
                                    return (
                                        <Link
                                            key={`l-${num}`}
                                            href={item.linked.classId
                                                ? `/student/assignment/${item.linked.assignmentId}?classId=${item.linked.classId}`
                                                : `/student/assignment/${item.linked.assignmentId}`
                                            }
                                            className={`text-[13px] leading-relaxed flex items-start gap-2 hover:underline ${isCompleted ? 'text-slate-400 dark:text-slate-600' : 'text-indigo-600 dark:text-indigo-400'}`}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <span className={`font-bold min-w-[18px] text-right ${isCompleted ? 'text-slate-400' : 'text-indigo-500'}`}>{num}.</span>
                                            <span className={isCompleted ? 'line-through' : ''}>{item.text}</span>
                                            {isCompleted
                                                ? <span className="text-emerald-500 text-[10px] mt-0.5 flex-shrink-0">✓</span>
                                                : <svg className="w-3 h-3 mt-1 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                            }
                                        </Link>
                                    );
                                }

                                return (
                                    <p key={`t-${num}`} className={`text-[13px] leading-relaxed flex items-start gap-2 ${isCompleted ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                        <span className={`font-bold min-w-[18px] text-right ${isCompleted ? 'text-slate-400' : 'text-blue-500'}`}>{num}.</span>
                                        <span className={isCompleted ? 'line-through' : ''}>{item.text}</span>
                                        {isCompleted && <span className="text-emerald-500 text-[10px] mt-0.5 flex-shrink-0">✓</span>}
                                    </p>
                                );
                            };

                            return (
                                <div key={hw.id}>
                                    {idx > 0 && <div className="border-t border-slate-100 dark:border-white/5 mb-4" />}
                                    <div className="flex items-center gap-2 mb-2">
                                        {isTodayHw(hw.date) && (
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-md">TODAY</span>
                                        )}
                                        <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{hw.title}</h3>
                                        <span className="text-[10px] text-slate-400 font-medium">{hw.date}</span>
                                    </div>
                                    <div className="space-y-1 pl-1">
                                        {structuredItems.map((item, i) => renderItem(item, i + 1, i))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mini Calendar */}
                    <div className="lg:col-span-2 hidden lg:block">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{calYear}년 {calMonth + 1}월</span>
                                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-7 mb-0.5">
                                {['일','월','화','수','목','금','토'].map((d, i) => (
                                    <div key={d} className={`text-center text-[8px] font-bold py-0.5 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                                {calendarDays.map((day, idx) => {
                                    const hasHw = hwDateSet.has(day.dateStr);
                                    const isToday = day.dateStr === todayStr;
                                    const dayOfWeek = idx % 7;
                                    return (
                                        <Link
                                            key={idx}
                                            href="/homework"
                                            className={`relative flex flex-col items-center justify-center h-7 rounded-md text-[10px] font-bold transition-all ${
                                                !day.isCurrentMonth ? 'text-slate-300 dark:text-slate-700' :
                                                isToday ? 'bg-blue-600 text-white' :
                                                hasHw ? 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10' :
                                                dayOfWeek === 0 ? 'text-rose-400' :
                                                dayOfWeek === 6 ? 'text-blue-400' :
                                                'text-slate-500 dark:text-slate-500'
                                            }`}
                                        >
                                            {day.date}
                                            {hasHw && !isToday && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />}
                                        </Link>
                                    );
                                })}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[8px] text-slate-400">
                                <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-blue-500" /> 과제</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

