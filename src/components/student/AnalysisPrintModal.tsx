'use client';

import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { toast } from 'sonner';
import { SkeletonModalList } from '@/components/common/Skeleton';

interface AnalysisPrintModalProps {
    studentId: string;
    studentName?: string;
    assignments: any[]; // All assignments
    onClose: () => void;
    isAdmin?: boolean;
}

export default function AnalysisPrintModal({
    studentId,
    studentName,
    assignments,
    onClose,
    isAdmin = false
}: AnalysisPrintModalProps) {
    const [loading, setLoading] = useState(true);
    const [completedAssignments, setCompletedAssignments] = useState<{ id: string; title: string; timestamp: number; memoCount: number }[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Section selection for print
    const ALL_SECTIONS = [
        { key: 'passage', label: '📖 전체지문', emoji: '📖' },
        { key: 'summary', label: '📋 써머리', emoji: '📋' },
        { key: 'structure', label: '📐 구조·해석', emoji: '📐' },
        { key: 'sentences', label: '🔍 문장분석', emoji: '🔍' },
        { key: 'grammar', label: '📝 핵심문법', emoji: '📝' },
        { key: 'vocab', label: '📚 어휘종합', emoji: '📚' },
    ] as const;
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(ALL_SECTIONS.map(s => s.key)));

    // For admin: student selection
    const [students, setStudents] = useState<{ id: string; name: string; classIds: string[] }[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId);
    const [selectedStudentName, setSelectedStudentName] = useState<string>(studentName || '');
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        if (isAdmin) {
            loadStudents();
            if (studentId) {
                loadCompleted(studentId);
            }
        } else {
            loadCompleted(studentId);
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

    const loadCompleted = async (sid: string) => {
        setLoading(true);
        try {
            const submissions = await dbService.getStudentSubmissions(sid);

            // Only analysis assignments
            const analysisAssignments = assignments.filter(a => a.type === 'analysis');

            const completed: typeof completedAssignments = [];

            for (const a of analysisAssignments) {
                const assignmentSubs = submissions
                    .filter(s => s.assignmentId === a.id)
                    .sort((x, y) => ((y as any).timestamp || 0) - ((x as any).timestamp || 0));

                if (assignmentSubs.length > 0) {
                    const latest = assignmentSubs[0];
                    // Check memo count
                    let memoCount = 0;
                    try {
                        const annotations = await dbService.getWordAnnotations(a.id, sid);
                        if (annotations) {
                            const clean = { ...annotations };
                            delete clean._analysisNote;
                            memoCount = Object.keys(clean).length;
                        }
                    } catch {}

                    completed.push({
                        id: a.id,
                        title: a.title,
                        timestamp: (latest as any).timestamp || (latest as any).submittedAt || 0,
                        memoCount
                    });
                }
            }

            // Sort by title
            completed.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

            setCompletedAssignments(completed);
            setSelectedIds([]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = (sid: string, sname: string) => {
        setSelectedStudentId(sid);
        setSelectedStudentName(sname);
        loadCompleted(sid);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === completedAssignments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(completedAssignments.map(a => a.id));
        }
    };

    const toggleSection = (key: string) => {
        setSelectedSections(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                // Don't allow deselecting all sections
                if (next.size <= 1) return prev;
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handlePrint = () => {
        if (selectedIds.length === 0) {
            toast.warning('인쇄할 과제를 선택해주세요.');
            return;
        }
        // Single tab with all selected assignments (avoids popup blocker)
        const idsParam = selectedIds.join(',');
        const sectionsParam = Array.from(selectedSections).join(',');
        window.open(`/analysis-batch-print?ids=${encodeURIComponent(idsParam)}&studentId=${encodeURIComponent(selectedStudentId)}&mode=detail&sections=${encodeURIComponent(sectionsParam)}`, '_blank');
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
                            <h3 className="text-lg font-bold flex items-center gap-2">📖 본문분석 인쇄</h3>
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
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none mb-3"
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
                                    className="w-full text-left p-3 rounded-xl hover:bg-teal-50 hover:border-teal-200 border border-slate-100 transition-all flex items-center justify-between group"
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
                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
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
                            📖 본문분석 인쇄
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {selectedStudentName && <span className="text-teal-300 font-bold">{selectedStudentName}</span>}
                            {' '}· 학습한 과제를 선택하여 인쇄하세요
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
                            onClick={() => { setSelectedStudentId(''); setSelectedStudentName(''); setCompletedAssignments([]); }}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
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
                    ) : completedAssignments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">📭</div>
                            <div className="text-slate-500 font-bold">학습 완료한 본문분석 과제가 없습니다.</div>
                            <p className="text-sm text-slate-400 mt-1">학생이 학습완료를 누른 과제가 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Select All */}
                            <button
                                onClick={toggleAll}
                                className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-3 mb-3"
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                    selectedIds.length === completedAssignments.length
                                        ? 'bg-teal-600 border-teal-600 text-white'
                                        : 'border-slate-300'
                                }`}>
                                    {selectedIds.length === completedAssignments.length && (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-slate-600">
                                    전체 선택 ({selectedIds.length}/{completedAssignments.length})
                                </span>
                            </button>

                            {completedAssignments.map((a) => {
                                const isSelected = selectedIds.includes(a.id);
                                const orderNum = isSelected ? selectedIds.indexOf(a.id) + 1 : null;

                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => toggleSelect(a.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${
                                            isSelected
                                                ? 'bg-teal-50 border-teal-200'
                                                : 'bg-white border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'
                                        }`}
                                    >
                                        {/* Checkbox / Order Number */}
                                        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-colors ${
                                            isSelected
                                                ? 'bg-teal-600 text-white shadow-sm'
                                                : 'border-2 border-slate-300 text-slate-300 group-hover:border-teal-400'
                                        }`}>
                                            {isSelected ? orderNum : ''}
                                        </div>

                                        {/* Assignment Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">{a.title}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {a.memoCount > 0 && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                        📝 {a.memoCount}개 메모
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {a.timestamp ? new Date(a.timestamp).toLocaleDateString('ko-KR') : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Section Selection */}
                {completedAssignments.length > 0 && selectedIds.length > 0 && (
                    <div className="px-6 pb-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">인쇄 항목 선택</div>
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_SECTIONS.map(s => {
                                const isOn = selectedSections.has(s.key);
                                return (
                                    <button
                                        key={s.key}
                                        onClick={() => toggleSection(s.key)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                            isOn
                                                ? 'bg-teal-50 border-teal-200 text-teal-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedSections.size < ALL_SECTIONS.length && (
                            <p className="text-[10px] text-amber-500 font-medium mt-1.5">✨ 선택 항목이 적을수록 지문이 더 크게 인쇄됩니다</p>
                        )}
                    </div>
                )}

                {/* Footer */}
                {completedAssignments.length > 0 && (
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
