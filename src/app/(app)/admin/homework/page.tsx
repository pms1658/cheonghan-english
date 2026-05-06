'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dbService, dbSubscriptions, Student, Class } from '@/services/db';
import { Homework, HomeworkStatus, Assignment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CreateHomeworkModal from './CreateHomeworkModal';

// ─── Helpers ───
function formatDateTitle(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}월 ${d.getDate()}일 과제`;
}

function formatToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(dateStr: string): boolean {
    return dateStr === formatToday();
}

export default function AdminHomeworkPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <AdminHomeworkInner />
        </Suspense>
    );
}

function AdminHomeworkInner() {
    const { user } = useAuth();
    const isAdmin = (user as any)?.role === 'admin';


    // ─── Data State ───
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    // ─── Student Detail State ───
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentStatuses, setStudentStatuses] = useState<HomeworkStatus[]>([]);
    const [statusLoading, setStatusLoading] = useState(false);

    // ─── Modal State ───
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [preselectedStudentId, setPreselectedStudentId] = useState<string | null>(null);
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

    // ─── Search ───
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Calendar State ───
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

    // ─── Filter State ───
    const [filterMode, setFilterMode] = useState<'1w' | '1m' | 'all'>('1w');
    const [groupFilter, setGroupFilter] = useState<string>('all');

    // ─── Deep-link: auto-select student from URL query ───
    const searchParams = useSearchParams();

    // ─── Load Data (classes, students, assignments once + homeworks realtime) ───
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        const loadOnce = async () => {
            setLoading(true);
            try {
                const [cls, sts, asns] = await Promise.all([
                    dbService.getClasses(),
                    dbService.getStudents(),
                    dbService.getAssignments()
                ]);
                if (!cancelled) {
                    setClasses(cls);
                    setStudents(sts);
                    setAssignments(asns);
                    // Auto-select student from URL query param
                    const studentParam = searchParams.get('student');
                    if (studentParam) {
                        setSelectedStudentId(studentParam);
                    }
                }
            } catch (e) {
                console.error(e);
                toast.error('데이터 로딩 실패');
            }
        };
        loadOnce();

        // Real-time: homeworks
        const unsub = dbSubscriptions.onHomeworks(undefined, (hws) => {
            if (!cancelled) {
                setHomeworks(hws);
                setLoading(false);
            }
        });

        return () => { cancelled = true; unsub(); };
    }, [isAdmin, searchParams]);

    // ─── Group names from student data ───
    const groupNames = useMemo(() => {
        return [...new Set(students.map(s => s.groupName).filter(Boolean))].sort((a, b) => (a as string).localeCompare(b as string, 'ko')) as string[];
    }, [students]);

    // ─── Student summary data ───
    const studentSummaries = useMemo(() => {
        return students
            .filter(s => {
                if (groupFilter !== 'all') {
                    if (groupFilter === '' && s.groupName) return false;
                    if (groupFilter !== '' && s.groupName !== groupFilter) return false;
                }
                if (!searchQuery) return true;
                return s.name.includes(searchQuery) || s.id.includes(searchQuery);
            })
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(student => {
                const studentHws = homeworks.filter(hw => hw.studentIds?.includes(student.id));
                const todayHws = studentHws.filter(hw => isToday(hw.date));
                return {
                    student,
                    totalHomeworks: studentHws.length,
                    todayCount: todayHws.length,
                };
            });
    }, [students, homeworks, searchQuery, groupFilter]);

    // ─── Real-time subscribe to statuses for selected student ───
    useEffect(() => {
        if (!selectedStudentId) {
            setStudentStatuses([]);
            return;
        }
        setStatusLoading(true);

        // Subscribe to all status docs for this student
        const unsub = dbSubscriptions.onStudentStatuses(selectedStudentId, async (statuses) => {
            // Also check linked assignment completions
            const studentHws = homeworks.filter(hw => hw.studentIds?.includes(selectedStudentId!));
            const enriched = [...statuses];

            await Promise.all(studentHws.map(async (hw) => {
                if (hw.linkedAssignments && hw.linkedAssignments.length > 0) {
                    const ids = hw.linkedAssignments.map(la => la.assignmentId);
                    const completed = await dbService.checkLinkedAssignmentCompletion(selectedStudentId!, ids, hw.createdAt);
                    if (completed.length > 0) {
                        const existing = enriched.find(s => s.homeworkId === hw.id);
                        if (existing) {
                            existing.completedAssignments = completed;
                        } else {
                            enriched.push({
                                id: `${hw.id}_${selectedStudentId}`,
                                homeworkId: hw.id,
                                studentId: selectedStudentId!,
                                studentName: students.find(s => s.id === selectedStudentId)?.name || selectedStudentId!,
                                completed: false,
                                completedAssignments: completed
                            });
                        }
                    }
                }
            }));

            setStudentStatuses(enriched);
            setStatusLoading(false);
        });

        return () => unsub();
    }, [selectedStudentId, homeworks]);

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentId(prev => prev === studentId ? null : studentId);
    };

    // ─── Toggle status (admin confirm all) ───
    const handleToggleStatus = async (hw: Homework, studentId: string) => {
        const student = students.find(s => s.id === studentId);
        const existing = studentStatuses.find(s => s.homeworkId === hw.id);
        const newCompleted = !existing?.completed;

        try {
            await dbService.setHomeworkStatus(hw.id, studentId, {
                studentName: student?.name || studentId,
                completed: newCompleted
            });
            setStudentStatuses(prev => {
                const filtered = prev.filter(s => s.homeworkId !== hw.id);
                return [...filtered, {
                    id: `${hw.id}_${studentId}`,
                    homeworkId: hw.id,
                    studentId,
                    studentName: student?.name || studentId,
                    completed: newCompleted,
                    checkedAt: Date.now(),
                    // When bulk confirm, mark all items as confirmed
                    adminConfirmedItems: newCompleted ? hw.items.map((_, i) => i) : [],
                }];
            });
            toast.success(newCompleted ? '일괄 확인 완료' : '확인 해제');
        } catch (e) {
            console.error(e);
            toast.error('상태 변경 실패');
        }
    };

    // ─── Toggle individual item (admin per-item confirm) ───
    const handleAdminToggleItem = async (hw: Homework, studentId: string, itemIndex: number) => {
        const student = students.find(s => s.id === studentId);
        try {
            const result = await dbService.adminToggleHomeworkItem(
                hw.id, studentId, student?.name || studentId, itemIndex, hw.items.length
            );
            setStudentStatuses(prev => {
                const filtered = prev.filter(s => s.homeworkId !== hw.id);
                const existing = prev.find(s => s.homeworkId === hw.id);
                return [...filtered, {
                    ...(existing || { id: `${hw.id}_${studentId}`, homeworkId: hw.id, studentId, studentName: student?.name || studentId }),
                    adminConfirmedItems: result.adminConfirmedItems,
                    completed: result.completed,
                    checkedAt: Date.now(),
                }];
            });
        } catch (e) {
            console.error(e);
            toast.error('항목 확인 실패');
        }
    };

    // ─── Delete homework ───
    const handleDelete = async (hw: Homework) => {
        if (!confirm(`"${hw.title}"을(를) 삭제하시겠습니까?`)) return;
        try {
            await dbService.deleteHomework(hw.id);
            setHomeworks(prev => prev.filter(h => h.id !== hw.id));
            toast.success('삭제 완료');
        } catch (e) {
            toast.error('삭제 실패');
        }
    };

    // ─── Edit homework ───
    const handleEdit = (hw: Homework) => {
        setEditingHomework(hw);
        setPreselectedStudentId(null);
        setShowCreateModal(true);
    };

    // ─── Selected student's homeworks (filtered by date range + incomplete) ───
    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const selectedStudentHomeworks = useMemo(() => {
        if (!selectedStudentId) return [];
        const todayD = new Date(); todayD.setHours(0,0,0,0);
        const todayS = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,'0')}-${String(todayD.getDate()).padStart(2,'0')}`;
        
        const cutoffD = new Date(todayD);
        if (filterMode === '1w') cutoffD.setDate(cutoffD.getDate() - 7);
        else if (filterMode === '1m') cutoffD.setMonth(cutoffD.getMonth() - 1);
        else cutoffD.setFullYear(1900);
        const cutoffS = `${cutoffD.getFullYear()}-${String(cutoffD.getMonth()+1).padStart(2,'0')}-${String(cutoffD.getDate()).padStart(2,'0')}`;

        const studentHws = homeworks.filter(hw => hw.studentIds?.includes(selectedStudentId));
        
        // Check completion
        const isComplete = (hw: Homework): boolean => {
            const st = studentStatuses.find(s => s.homeworkId === hw.id);
            if (st?.completed) return true;
            const hasOffline = hw.items.length > 0;
            if (hasOffline && !st?.completed) return false; // offline needs admin confirm
            const linkedDone = (hw.linkedAssignments?.length || 0) === 0 || 
                hw.linkedAssignments!.every(la => st?.completedAssignments?.includes(la.assignmentId));
            return linkedDone;
        };

        return studentHws
            .filter(hw => {
                if (hw.date >= cutoffS) return true; // within range (including future)
                return !isComplete(hw); // older but incomplete
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [selectedStudentId, homeworks, studentStatuses, filterMode]);

    // ─── Auth Guard ───
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-slate-500">관리자 전용 페이지입니다.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ─── RENDER ───
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 lg:pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Homework Manager</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none">
                            과제 관리
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                            학생별 과제 현황을 확인하고 새로운 과제를 부과하세요.
                        </p>
                    </div>
                    <button
                        onClick={() => { setPreselectedStudentId(null); setShowCreateModal(true); }}
                        className="hidden md:flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        과제 부과
                    </button>
                </div>
            </motion.div>

            {/* Filter + Search */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                {/* Filter pills */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {([['1w', '1주'], ['1m', '1개월'], ['all', '전체']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilterMode(key)}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                filterMode === key
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >{label}</button>
                    ))}
                </div>
                {/* Group Filter */}
                {groupNames.length > 0 && (
                    <div className="relative">
                        <select
                            value={groupFilter}
                            onChange={e => setGroupFilter(e.target.value)}
                            className="appearance-none px-4 py-3 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="all">전체 반</option>
                            {groupNames.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                        <svg className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                )}
                {/* Search */}
                <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="학생 이름 또는 ID 검색..."
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* ═══ DUAL LAYOUT: Student List(left) + Calendar(right) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ─── LEFT: Student List ─── */}
                <div className="lg:col-span-3 space-y-2">
                {studentSummaries.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                        <p className="text-slate-400 text-sm">
                            {searchQuery ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                        </p>
                    </div>
                ) : (
                    studentSummaries.map(({ student, totalHomeworks, todayCount }) => {
                        const isSelected = selectedStudentId === student.id;

                        return (
                            <div key={student.id}>
                                {/* Student Row */}
                                <div
                                    onClick={() => handleSelectStudent(student.id)}
                                    className={`bg-white dark:bg-slate-900 rounded-xl border px-4 py-2.5 cursor-pointer transition-all duration-200 ${
                                        isSelected
                                            ? 'border-blue-500 dark:border-blue-400 shadow-md ring-1 ring-blue-500/20'
                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                isSelected ? 'bg-blue-600 text-white' : 'bg-[#0A0E27] text-white'
                                            }`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</h3>
                                                <span className="text-[10px] text-slate-400">{student.id}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {todayCount > 0 && (
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">
                                                    오늘 {todayCount}건
                                                </span>
                                            )}
                                            {totalHomeworks > 0 && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                    전체 {totalHomeworks}건
                                                </span>
                                            )}
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Student Detail Panel ─── */}
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {selectedStudent?.name}의 과제
                                                    </h3>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreselectedStudentId(student.id);
                                                            setShowCreateModal(true);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all active:scale-95"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                        과제 부과
                                                    </button>
                                                </div>

                                                {statusLoading ? (
                                                    <div className="flex justify-center py-6">
                                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : selectedStudentHomeworks.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">등록된 과제가 없습니다</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {selectedStudentHomeworks.map(hw => {
                                                            const status = studentStatuses.find(s => s.homeworkId === hw.id);
                                                            const selfCheckCount = status?.completedItems?.length || 0;
                                                            const totalItems = hw.items.length + (hw.linkedAssignments?.length || 0);
                                                            const selfDone = status?.studentCompleted;

                                                            return (
                                                                <div key={hw.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 group">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                {isToday(hw.date) && (
                                                                                    <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-black rounded uppercase">Today</span>
                                                                                )}
                                                                                {hw.date > formatToday() && (
                                                                                    <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 text-[8px] font-black rounded uppercase">예정</span>
                                                                                )}
                                                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{hw.title}</h4>
                                                                            </div>
                                                                            <p className="text-[11px] text-slate-400 mt-0.5">{hw.date}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {/* Self-report indicator */}
                                                                            {(() => {
                                                                                const allLinkedDone = (hw.linkedAssignments?.length || 0) > 0 && hw.linkedAssignments!.every(la => status?.completedAssignments?.includes(la.assignmentId));
                                                                                const hasOfflineItems = hw.items.length > 0;
                                                                                if (status?.completed) {
                                                                                    return <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">완료</span>;
                                                                                } else if (!hasOfflineItems && allLinkedDone) {
                                                                                    return <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">완료</span>;
                                                                                } else if (selfDone && allLinkedDone) {
                                                                                    return <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">완료</span>;
                                                                                } else if (selfDone) {
                                                                                    return <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">자체완료</span>;
                                                                                } else if (selfCheckCount > 0) {
                                                                                    return <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">{selfCheckCount}/{totalItems}</span>;
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleEdit(hw); }}
                                                                                className="p-1 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                                                title="수정"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleDelete(hw); }}
                                                                                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                                                                title="삭제"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Items with per-item admin confirm */}
                                                                    <div className="space-y-1 mb-3">
                                                                        {hw.items.map((item, i) => {
                                                                            const itemChecked = status?.completedItems?.includes(i);
                                                                            const adminConfirmed = status?.adminConfirmedItems?.includes(i) || status?.completed;
                                                                            return (
                                                                                <div key={i} className="flex items-center justify-between group/item">
                                                                                    <p className={`text-xs flex-1 ${itemChecked ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                                        <span className="text-blue-500 font-bold mr-1">{i + 1}.</span>
                                                                                        <span className={itemChecked ? 'line-through' : ''}>{item}</span>
                                                                                        {itemChecked && !adminConfirmed && <span className="text-amber-500 text-[9px] ml-1">·DONE</span>}
                                                                                    </p>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleAdminToggleItem(hw, student.id, i); }}
                                                                                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                                                                                            adminConfirmed
                                                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                                                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 text-transparent hover:text-emerald-300'
                                                                                        }`}
                                                                                        title={adminConfirmed ? '확인 해제' : '항목 확인'}
                                                                                    >
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {hw.linkedAssignments?.map((la, i) => {
                                                                            const isLaComplete = status?.completedAssignments?.includes(la.assignmentId);
                                                                            return (
                                                                                <p key={`la-${i}`} className={`text-xs flex items-center gap-1 ${isLaComplete ? 'text-slate-400 dark:text-slate-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                                                    <span className="font-bold mr-1">{hw.items.length + i + 1}.</span>
                                                                                    <span className={isLaComplete ? 'line-through' : ''}>{la.title}</span>
                                                                                    {isLaComplete && <span className="text-emerald-500 text-[9px] ml-1">✓완료</span>}
                                                                                </p>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Admin bulk confirm - only for offline items */}
                                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                                                        {hw.items.length > 0 ? (
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={status?.completed || false}
                                                                                    onChange={() => handleToggleStatus(hw, student.id)}
                                                                                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                                                                />
                                                                                <span className={`text-xs font-bold ${status?.completed ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                                                    {status?.completed ? '일괄 확인 완료' : '일괄 확인'}
                                                                                </span>
                                                                            </label>
                                                                        ) : (
                                                                            <span className="text-[9px] text-slate-300">온라인 과제 자동 확인</span>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const text = `${hw.title}\n${hw.items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
                                                                                navigator.clipboard.writeText(text);
                                                                                toast.success('복사됨');
                                                                            }}
                                                                            className="text-[10px] text-slate-400 hover:text-blue-500 font-bold transition-colors"
                                                                        >
                                                                            복사
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
                </div>

                {/* ─── RIGHT: Calendar ─── */}
                <div className="lg:col-span-2 hidden lg:block">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-4 sticky top-24">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                                    {calYear}년 {calMonth + 1}월
                                </h2>
                                {selectedStudent && (
                                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">{selectedStudent.name}</span>
                                )}
                            </div>
                            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-0.5">
                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                <div key={d} className={`text-center text-[9px] font-bold py-1 ${
                                    i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
                                }`}>{d}</div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            {(() => {
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
                                    days.push({ date: d, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
                                }
                                for (let d = 1; d <= totalDays; d++) {
                                    days.push({ date: d, dateStr: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: true });
                                }
                                const remaining = 42 - days.length;
                                for (let d = 1; d <= remaining; d++) {
                                    const m = calMonth === 11 ? 0 : calMonth + 1;
                                    const y = calMonth === 11 ? calYear + 1 : calYear;
                                    days.push({ date: d, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
                                }

                                // homework dates based on selected student or all
                                const relevantHws = selectedStudentId
                                    ? homeworks.filter(hw => hw.studentIds?.includes(selectedStudentId))
                                    : homeworks;
                                const hwDateSet = new Set(relevantHws.map(hw => hw.date));

                                const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

                                return days.map((day, idx) => {
                                    const hasHw = hwDateSet.has(day.dateStr);
                                    const dayHws = hasHw ? relevantHws.filter(hw => hw.date === day.dateStr) : [];
                                    const isTodayDate = day.dateStr === todayStr;
                                    const dayOfWeek = idx % 7;
                                    const isSelected = selectedCalDate === day.dateStr;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (hasHw) setSelectedCalDate(isSelected ? null : day.dateStr);
                                            }}
                                            className={`min-h-[32px] p-0.5 border-b border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start transition-all ${
                                                !day.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-950/50' : ''
                                            } ${
                                                hasHw ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-500/5' : ''
                                            } ${
                                                isSelected ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-300 dark:ring-blue-500/50' : ''
                                            }`}
                                        >
                                            <span className={`text-[10px] font-bold leading-none ${!day.isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : dayOfWeek === 0 ? 'text-rose-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-slate-700 dark:text-slate-300'} ${isTodayDate ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]' : ''}`}>
                                                {day.date}
                                            </span>
                                            {hasHw && <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />}
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Selected Date Detail */}
                        <AnimatePresence>
                            {selectedCalDate && (() => {
                                const relevantHws = selectedStudentId
                                    ? homeworks.filter(hw => hw.studentIds?.includes(selectedStudentId) && hw.date === selectedCalDate)
                                    : homeworks.filter(hw => hw.date === selectedCalDate);
                                if (relevantHws.length === 0) return null;
                                const dateD = new Date(selectedCalDate + 'T00:00:00');
                                const weekdays = ['일','월','화','수','목','금','토'];
                                const dateLabel = `${dateD.getMonth()+1}/${dateD.getDate()} (${weekdays[dateD.getDay()]})`;
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                {dateLabel} 과제 ({relevantHws.length}건)
                                            </h3>
                                            <button onClick={() => setSelectedCalDate(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        {relevantHws.map(hw => (
                                            <div key={hw.id} className="mb-3 last:mb-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                                                        {hw.title}
                                                        {hw.studentIds && hw.studentIds.length > 0 && (
                                                            <span className="text-slate-400 ml-1">· {hw.studentIds.map(sid => students.find(s => s.id === sid)?.name || sid).join(', ')}</span>
                                                        )}
                                                    </p>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEdit(hw)} className="text-slate-300 hover:text-blue-500 p-0.5 rounded transition-colors" title="수정">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(hw)} className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors" title="삭제">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
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
                                                {hw.memo && <p className="text-[10px] text-slate-400 mt-1 italic">📝 {hw.memo}</p>}
                                            </div>
                                        ))}
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>

                        {/* Legend */}
                        <div className="mt-3 flex items-center gap-3 text-[9px] text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 과제 있음</span>
                            {selectedStudent && <span className="text-blue-500 font-bold">{selectedStudent.name} 과제만 표시</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile FAB (과제 부과) ─── */}
            <button
                onClick={() => { setPreselectedStudentId(null); setShowCreateModal(true); }}
                className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center z-[90] hover:bg-blue-700 active:scale-95 transition-all"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>

            {/* ═══ CREATE/EDIT HOMEWORK MODAL ═══ */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateHomeworkModal
                        students={students}
                        classes={classes}
                        assignments={assignments}
                        preselectedStudentId={preselectedStudentId}
                        editingHomework={editingHomework}
                        user={user}
                        onClose={() => { setShowCreateModal(false); setEditingHomework(null); }}
                        onCreated={async () => {
                            setShowCreateModal(false);
                            setEditingHomework(null);
                            const updated = await dbService.getHomeworks();
                            setHomeworks(updated);
                            // Refresh selected student detail
                            if (selectedStudentId) {
                                handleSelectStudent(selectedStudentId);
                            }
                            toast.success(editingHomework ? '과제가 수정되었습니다' : '과제가 등록되었습니다');
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

