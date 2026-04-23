'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { StudentReport } from '@/types';
import ReportView from '@/components/admin/ReportView';
import { SkeletonReportList } from '@/components/common/Skeleton';

export default function StudentReportPage() {
    const [reports, setReports] = useState<StudentReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('CHEONGHAN_STUDENT');
        if (!stored) {
            window.location.href = '/';
            return;
        }
        const student = JSON.parse(stored);
        if (!student?.id) { window.location.href = '/'; return; }

        setStudentName(student.name || '');

        // Only load published reports
        dbService.getStudentReports(student.id).then((all: StudentReport[]) => {
            const published = all.filter((r: StudentReport) => r.status === 'published');
            setReports(published);
            setLoading(false);
        });
    }, []);

    if (selectedReport) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 mb-6 transition-colors print:hidden"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        목록으로
                    </button>
                    <ReportView report={selectedReport} isAdmin={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        돌아가기
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        📊 나의 성장 리포트
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{studentName} 학생의 월간 학습 분석</p>
                </div>

                {loading ? (
                    <SkeletonReportList />
                ) : reports.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-6xl block mb-4">📭</span>
                        <p className="text-slate-500 font-bold">아직 발행된 리포트가 없습니다</p>
                        <p className="text-sm text-slate-400 mt-1">선생님이 리포트를 발행하면 여기에 표시됩니다</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(r => {
                            const [y, m] = r.yearMonth.split('-');
                            const avg = Math.round((r.vocabScore + r.grammarScore + r.readingScore) / 3);
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => setSelectedReport(r)}
                                    className="w-full bg-white rounded-2xl border border-slate-100 p-5 hover:border-indigo-200 hover:shadow-md transition-all text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-white shadow-lg ${
                                                avg >= 80 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                                                    avg >= 60 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                                                        'bg-gradient-to-br from-red-400 to-red-600'
                                            }`}>
                                                <span className="text-xl">{avg}</span>
                                                <span className="text-[8px] opacity-80">종합</span>
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-slate-900">{y}년 {parseInt(m)}월</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-slate-400">📚 {r.vocabScore}</span>
                                                    <span className="text-[10px] text-slate-400">✍️ {r.grammarScore}</span>
                                                    <span className="text-[10px] text-slate-400">📖 {r.readingScore}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
