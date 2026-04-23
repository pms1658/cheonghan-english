'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { dbService, Student } from '@/services/db';
import { Assignment, Submission, StudentReport } from '@/types';
import { analyzeStudentData } from '@/utils/reportAnalysis';
import ReportView from '@/components/admin/ReportView';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AdminReportPage() {
    // Selection state
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupFilter, setGroupFilter] = useState<string>('all');

    // Date range (default: current month)
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    });

    // Data state
    const [generating, setGenerating] = useState(false);
    const [currentReport, setCurrentReport] = useState<StudentReport | null>(null);
    const [existingReports, setExistingReports] = useState<StudentReport[]>([]);
    const [viewMode, setViewMode] = useState<'select' | 'report'>('select');

    // Load all students
    useEffect(() => {
        dbService.getStudents().then(setAllStudents);
    }, []);

    // Load existing reports for selected student
    useEffect(() => {
        if (!selectedStudentId) { setExistingReports([]); return; }
        dbService.getStudentReports(selectedStudentId).then(setExistingReports);
    }, [selectedStudentId]);

    // Unique group names (sorted)
    const groupNames = [...new Set(allStudents.map(s => s.groupName).filter(Boolean))].sort((a, b) => (a as string).localeCompare(b as string, 'ko')) as string[];

    // Filtered student list
    const filteredStudents = allStudents.filter(s => {
        if (groupFilter !== 'all' && (s.groupName || '') !== groupFilter) return false;
        if (searchQuery === '') return true;
        return s.name.includes(searchQuery) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const selectedStudent = allStudents.find(s => s.id === selectedStudentId);

    // Period label for display
    const periodLabel = (() => {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const sy = s.getFullYear(), sm = s.getMonth() + 1, sd = s.getDate();
        const ey = e.getFullYear(), em = e.getMonth() + 1, ed = e.getDate();
        if (sy === ey && sm === em) return `${sy}년 ${sm}월`;
        return `${sy}.${sm}.${sd} ~ ${ey}.${em}.${ed}`;
    })();

    // yearMonth for storage (use start month)
    const yearMonth = startDate.slice(0, 7);

    // Check if report already exists for this period
    const existingPeriodReport = existingReports.find(r => r.yearMonth === yearMonth);

    // Generate report
    const handleGenerate = useCallback(async () => {
        if (!selectedStudentId || !selectedStudent) return;
        setGenerating(true);

        try {
            // 1. Fetch all student submissions
            const submissions = await dbService.getStudentSubmissions(selectedStudentId);

            // 2. Fetch all assignments
            const assignmentIds = [...new Set(submissions.map(s => s.assignmentId))];
            const assignments: Assignment[] = [];
            for (const id of assignmentIds) {
                const a = await dbService.getAssignmentById(id);
                if (a) assignments.push(a);
            }

            // 3. Analyze data with date range
            const analysis = analyzeStudentData({
                submissions,
                assignments,
                studentId: selectedStudentId,
                studentName: selectedStudent.name,
                classId: selectedStudent.classIds?.[0] || '',
                yearMonth,
                startDate,
                endDate,
            });

            // 4. Generate AI summary
            let aiSummary = '';
            try {
                const res = await fetch('/api/generate-report-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...analysis, periodLabel })
                });
                if (res.ok) {
                    const data = await res.json();
                    aiSummary = data.summary || '';
                }
            } catch (e) {
                console.error('AI summary generation failed:', e);
            }

            // 5. Save or update report
            const reportData = {
                ...analysis,
                createdAt: Date.now(),
                status: 'draft' as const,
                aiSummary,
            };

            let saved: StudentReport;
            if (existingPeriodReport) {
                await dbService.updateReport(existingPeriodReport.id, reportData);
                saved = { ...existingPeriodReport, ...reportData };
                toast.success('리포트가 업데이트되었습니다.');
            } else {
                saved = await dbService.addReport(reportData);
                toast.success('리포트가 생성되었습니다.');
            }

            setCurrentReport(saved);
            setViewMode('report');
            dbService.getStudentReports(selectedStudentId).then(setExistingReports);
        } catch (e: any) {
            console.error(e);
            toast.error('리포트 생성 실패: ' + e.message);
        } finally {
            setGenerating(false);
        }
    }, [selectedStudentId, selectedStudent, yearMonth, startDate, endDate, existingPeriodReport, periodLabel]);

    // Publish
    const handlePublish = async () => {
        if (!currentReport) return;
        try {
            await dbService.updateReport(currentReport.id, { status: 'published' });
            setCurrentReport({ ...currentReport, status: 'published' });
            toast.success('리포트가 발행되었습니다! 학생이 확인할 수 있습니다.');
        } catch (e) {
            toast.error('발행 실패');
        }
    };

    // Delete
    const handleDelete = async () => {
        if (!currentReport) return;
        if (!confirm('리포트를 삭제하시겠습니까?')) return;
        try {
            await dbService.deleteReport(currentReport.id);
            setCurrentReport(null);
            setViewMode('select');
            dbService.getStudentReports(selectedStudentId).then(setExistingReports);
            toast.success('삭제되었습니다.');
        } catch (e) {
            toast.error('삭제 실패');
        }
    };

    // View existing
    const handleViewReport = (report: StudentReport) => {
        setCurrentReport(report);
        setViewMode('report');
    };

    if (viewMode === 'report' && currentReport) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <button
                        onClick={() => setViewMode('select')}
                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 mb-6 transition-colors print:hidden"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        목록으로
                    </button>
                    <ReportView
                        report={currentReport}
                        isAdmin={true}
                        onPublish={handlePublish}
                        onDelete={handleDelete}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Report generation</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none flex items-center gap-3">
                            성장 리포트
                        </h1>
                        <p className="mt-3 text-lg font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            학생을 선택하고 기간을 지정하여 성장 분석을 생성합니다.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="max-w-3xl mx-auto">
                {/* Selection */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5 mb-6">
                    {/* Student Search & Select */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">학생 선택</label>
                        {/* Group filter dropdown */}
                        {groupNames.length > 0 && (
                            <div className="relative mb-2">
                                <select
                                    value={groupFilter}
                                    onChange={e => setGroupFilter(e.target.value)}
                                    className="appearance-none w-full px-4 py-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                                >
                                    <option value="all">전체 반</option>
                                    {groupNames.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                                <svg className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        )}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="학생 이름 또는 ID로 검색..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none mb-2"
                        />
                        {selectedStudent && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-200 mb-2">
                                <span className="text-sm font-bold text-indigo-700">{selectedStudent.name}</span>
                                <span className="text-[10px] text-indigo-400">{selectedStudent.id}</span>
                                <button onClick={() => { setSelectedStudentId(''); setSearchQuery(''); }} className="ml-auto text-indigo-400 hover:text-red-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        )}
                        {!selectedStudent && searchQuery && (
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                                {filteredStudents.length === 0 ? (
                                    <p className="text-sm text-slate-400 p-3 text-center">검색 결과가 없습니다</p>
                                ) : (
                                    filteredStudents.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSelectedStudentId(s.id); setSearchQuery(''); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                                        >
                                            <span className="text-sm font-bold text-slate-800">{s.name}</span>
                                            <span className="text-[10px] text-slate-400">{s.id}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">분석 기간</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="text-[9px] text-slate-400 font-medium block mb-1">시작일</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none"
                                />
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-400 font-medium block mb-1">종료일</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none"
                                />
                            </div>
                        </div>
                        {selectedStudent && (
                            <p className="text-[10px] text-slate-400 mt-2">📅 {periodLabel} 기준 리포트를 생성합니다.</p>
                        )}
                    </div>

                    {/* Generate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedStudentId || generating}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                리포트 생성 중... (AI 분석 포함)
                            </>
                        ) : existingPeriodReport ? (
                            '🔄 리포트 재생성'
                        ) : (
                            '📊 리포트 생성'
                        )}
                    </button>
                </div>

                {/* Existing Reports */}
                {selectedStudentId && existingReports.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                            {selectedStudent?.name}의 리포트 히스토리
                        </h3>
                        <div className="space-y-2">
                            {existingReports.map(r => {
                                const [y, m] = r.yearMonth.split('-');
                                const avg = Math.round((r.vocabScore + r.grammarScore + r.readingScore) / 3);
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => handleViewReport(r)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                                                r.status === 'published' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                                {avg}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{y}년 {parseInt(m)}월</p>
                                                <p className="text-[10px] text-slate-400">
                                                    어휘 {r.vocabScore} · 문법 {r.grammarScore} · 독해 {r.readingScore}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                r.status === 'published'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                            }`}>
                                                {r.status === 'published' ? '발행됨' : '초안'}
                                            </span>
                                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
