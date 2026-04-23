'use client';

import { useState, useEffect } from 'react';
import { dbService, Submission } from '@/services/db';
import { toast } from 'sonner';
import { SkeletonModalList } from '@/components/common/Skeleton';

interface StructurePrintModalProps {
    studentId: string;
    studentName?: string;
    assignments: any[]; // All assignments
    onClose: () => void;
    isAdmin?: boolean;
}

export default function StructurePrintModal({
    studentId,
    studentName,
    assignments,
    onClose,
    isAdmin = false
}: StructurePrintModalProps) {
    const [loading, setLoading] = useState(true);
    const [passedAssignments, setPassedAssignments] = useState<{ id: string; title: string; score: number; attempt: number; timestamp: number }[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // For admin: student selection
    const [students, setStudents] = useState<{ id: string; name: string; classIds: string[] }[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId);
    const [selectedStudentName, setSelectedStudentName] = useState<string>(studentName || '');
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        if (isAdmin) {
            loadStudents();
            // If a student is already pre-selected (e.g., from a button click), also load their assignments
            if (studentId) {
                loadPassed(studentId);
            }
        } else {
            loadPassed(studentId);
        }
    }, []);

    const loadStudents = async () => {
        try {
            const allStudents = await dbService.getStudents();
            setStudents(allStudents.map(s => ({ id: s.id, name: s.name, classIds: s.classIds })));
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const loadPassed = async (sid: string) => {
        setLoading(true);
        try {
            const submissions = await dbService.getStudentSubmissions(sid);

            // Only structure reading assignments with score >= 80
            const structureAssignments = assignments.filter(a =>
                a.type !== 'vocabulary' && a.type !== 'selection' && a.type !== 'transform' && a.type !== 'workbook' && a.type !== 'analysis'
            );

            const passed: typeof passedAssignments = [];

            for (const a of structureAssignments) {
                const assignmentSubs = submissions
                    .filter(s => s.assignmentId === a.id)
                    .sort((x, y) => ((y as any).timestamp || 0) - ((x as any).timestamp || 0));

                if (assignmentSubs.length > 0) {
                    const best = assignmentSubs[0];
                    passed.push({
                        id: a.id,
                        title: a.title,
                        score: best.score,
                        attempt: best.attempt,
                        timestamp: (best as any).timestamp || 0
                    });
                }
            }

            // Sort by title for clean display
            passed.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

            setPassedAssignments(passed);
            setSelectedIds([]); // Reset selection
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = (sid: string, sname: string) => {
        setSelectedStudentId(sid);
        setSelectedStudentName(sname);
        loadPassed(sid);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === passedAssignments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(passedAssignments.map(a => a.id));
        }
    };

    const handlePrint = () => {
        if (selectedIds.length === 0) {
            toast.warning('인쇄할 과제를 선택해주세요.');
            return;
        }
        const ids = selectedIds.join(',');
        const url = `/student/structure-print?ids=${encodeURIComponent(ids)}&studentId=${encodeURIComponent(selectedStudentId)}&studentName=${encodeURIComponent(selectedStudentName)}`;
        window.open(url, '_blank');
    };

    const filteredStudents = students.filter(s =>
        s.name.includes(studentSearch) || s.id.includes(studentSearch)
    );

    // Admin flow: show student selection first
    if (isAdmin && !selectedStudentId) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                    <div className="bg-[#0A0E27] p-6 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">📄 구조독해 일괄 인쇄</h3>
                            <p className="text-xs text-slate-400 mt-1">학생을 선택해주세요</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <input
                            type="text"
                            placeholder="학생 이름 또는 ID 검색..."
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none mb-3"
                        />
                    </div>
                    <div className="px-4 pb-4 max-h-[50vh] overflow-y-auto space-y-1">
                        {loading ? (
                            <SkeletonModalList count={3} />
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">검색 결과가 없습니다.</div>
                        ) : (
                            filteredStudents.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSelectStudent(s.id, s.name)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-slate-100 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#0A0E27] flex items-center justify-center text-xs font-bold text-white">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">{s.name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{s.id}</div>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#0A0E27] p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            📄 구조독해 일괄 인쇄
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {selectedStudentName && <span className="text-blue-300 font-bold">{selectedStudentName}</span>}
                            {' '}· 제출한 과제를 선택하여 인쇄하세요
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Admin: Back to student list */}
                {isAdmin && (
                    <div className="px-6 pt-4">
                        <button
                            onClick={() => { setSelectedStudentId(''); setSelectedStudentName(''); setPassedAssignments([]); }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            다른 학생 선택
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <SkeletonModalList count={3} />
                    ) : passedAssignments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">📭</div>
                            <div className="text-slate-500 font-bold">제출한 구조독해 과제가 없습니다.</div>
                            <p className="text-sm text-slate-400 mt-1">한 번이라도 제출한 과제가 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Select All */}
                            <button
                                onClick={toggleAll}
                                className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-3 mb-3"
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                    selectedIds.length === passedAssignments.length
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300'
                                }`}>
                                    {selectedIds.length === passedAssignments.length && (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-slate-600">
                                    전체 선택 ({selectedIds.length}/{passedAssignments.length})
                                </span>
                            </button>

                            {passedAssignments.map((a, idx) => {
                                const isSelected = selectedIds.includes(a.id);
                                const orderNum = isSelected ? selectedIds.indexOf(a.id) + 1 : null;

                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => toggleSelect(a.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${
                                            isSelected
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                                        }`}
                                    >
                                        {/* Checkbox / Order Number */}
                                        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'border-2 border-slate-300 text-slate-300 group-hover:border-blue-400'
                                        }`}>
                                            {isSelected ? orderNum : ''}
                                        </div>

                                        {/* Assignment Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">{a.title}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    {a.score}점
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {a.attempt}차 시도
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {passedAssignments.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-400">
                            {selectedIds.length}개 선택됨
                        </span>
                        <button
                            onClick={handlePrint}
                            disabled={selectedIds.length === 0}
                            className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all text-sm ${
                                selectedIds.length > 0
                                    ? 'bg-[#0A0E27] text-white shadow-lg hover:bg-[#1a1f3d]'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            인쇄하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
