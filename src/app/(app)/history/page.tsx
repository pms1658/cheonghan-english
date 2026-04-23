'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dbService } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import ResultHistoryModal from '@/components/student/ResultHistoryModal';
import StructurePrintModal from '@/components/student/StructurePrintModal';
import AnalysisPrintModal from '@/components/student/AnalysisPrintModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { SkeletonHistoryList } from '@/components/common/Skeleton';
import StudentAccordion, { SubmissionWithMeta, StudentGroup } from './StudentAccordion';
import { toast } from 'sonner';

// Types imported from StudentAccordion

type DateRangeOption = '1week' | '2weeks' | '1month' | 'all' | 'custom';

export default function HistoryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [groupedHistory, setGroupedHistory] = useState<StudentGroup[]>([]); // Changed type to StudentGroup[]
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithMeta | null>(null);
    const [allAssignments, setAllAssignments] = useState<any[]>([]);
    const [isStructurePrintOpen, setIsStructurePrintOpen] = useState(false);
    const [structurePrintStudentId, setStructurePrintStudentId] = useState('');
    const [structurePrintStudentName, setStructurePrintStudentName] = useState('');
    const [isAnalysisPrintOpen, setIsAnalysisPrintOpen] = useState(false);
    const [analysisPrintStudentId, setAnalysisPrintStudentId] = useState('');
    const [analysisPrintStudentName, setAnalysisPrintStudentName] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [tick, setTick] = useState(0); // Trigger for refresh
    const [openStudentIds, setOpenStudentIds] = useState<Set<string>>(new Set()); // Persist expanded state
    const [rangeOption, setRangeOption] = useState<DateRangeOption>('2weeks');
    const [customDate, setCustomDate] = useState({ start: '', end: '' });
    const [groupFilter, setGroupFilter] = useState<string>('all');
    const [allStudentsData, setAllStudentsData] = useState<any[]>([]);

    // Calculate effective date range
    const getEffectiveDateRange = () => {
        const end = new Date();
        let start = new Date(); // Start defaults to now (overwritten below)

        switch (rangeOption) {
            case '1week':
                start.setDate(end.getDate() - 7);
                break;
            case '2weeks':
                start.setDate(end.getDate() - 14);
                break;
            case '1month':
                start.setMonth(end.getMonth() - 1);
                break;
            case 'all':
                return { start: null, end: null };
            case 'custom':
                return {
                    start: customDate.start ? new Date(customDate.start) : null,
                    end: customDate.end ? new Date(customDate.end) : null
                };
        }
        // Set to beginning of the calculated start day
        start.setHours(0, 0, 0, 0);
        return { start, end };
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [submissions, assignments, students, classesData] = await Promise.all([
                    dbService.getSubmissions(),
                    dbService.getAssignments(),
                    dbService.getStudents(),
                    dbService.getClasses()
                ]);

                setAllAssignments(assignments);
                setAllStudentsData(students);

                // 1. Enrich & Filter Invalid Data
                const enriched: SubmissionWithMeta[] = submissions
                    .map(sub => {
                        const assignment = assignments.find(a => a.id === sub.assignmentId);
                        const student = students.find(s => s.id === sub.studentId);

                        // Validate Data existence - BOTH must exist to be a valid record
                        if (!student || !assignment) return null;

                        // 3. Class Resolution Logic (Revised for single room matching)
                        const subClassId = (sub.classId && sub.classId !== 'unknown') ? sub.classId : null;
                        const assignmentClassIds = assignment.classIds || (assignment.classId ? [assignment.classId] : []);
                        const studentClassIds = (student as any).classIds || ((student as any).classId ? [(student as any).classId] : []);
                        const intersection = assignmentClassIds.filter(cid => studentClassIds.includes(cid));

                        // 4. Final Selection Priority:
                        // - Explicit submission class (if valid)
                        // - First intersection match (Ideal for multi-class assignments)
                        // - Fallback to assignment's primary class
                        const clsId = subClassId || intersection[0] || assignmentClassIds[0] || 'unknown';
                        const cls = classesData.find(c => c.id === clsId);

                        return {
                            ...sub,
                            studentName: student?.name || '알 수 없는 학생',
                            studentUsername: (student as any)?.username || '',
                            assignmentTitle: sub.assignmentTitle || assignment?.title || '[과제 제목 없음]',
                            className: cls?.name || '기타/미배정',
                            type: (sub as any).type === 'variant_session' ? 'transform' : (assignment ? (assignment as any).type || 'structure' : 'structure'),
                            isPassed: (() => {
                                // Workbook: use status/completedLevels
                                if ((assignment as any)?.type === 'workbook') {
                                    return (sub as any).status === 'passed' || (sub as any).status === 'completed' || (sub as any).manualPass === true;
                                }
                                return (sub.score || 0) >= 80 || (sub as any).manualPass === true;
                            })(),
                            isCompleted: (() => {
                                if ((assignment as any)?.type === 'workbook') {
                                    return (sub as any).status === 'completed';
                                }
                                return false;
                            })()
                        };
                    })
                    .filter(item => item !== null) as SubmissionWithMeta[]; // Type guard

                // 2. Apply Filters
                let filtered = enriched.filter(item =>
                    item.studentName !== '알 수 없는 학생' &&
                    item.assignmentTitle !== '[과제 제목 없음]'
                );

                if ((user as any)?.role === 'student') {
                    filtered = filtered.filter(s => s.studentId === (user as any).id);
                }

                if (searchTerm) {
                    const lower = searchTerm.toLowerCase();
                    filtered = filtered.filter(s =>
                        s.studentName?.toLowerCase().includes(lower) ||
                        s.assignmentTitle?.toLowerCase().includes(lower)
                    );
                }

                // Date Filtering Logic
                const { start, end } = getEffectiveDateRange();
                if (start) {
                    filtered = filtered.filter(s => new Date(s.submittedAt) >= start);
                }
                if (end && rangeOption === 'custom') { // Only apply end date strictly for custom range if specified, otherwise 'now' is implicit end
                    const endDate = new Date(end);
                    endDate.setHours(23, 59, 59, 999);
                    filtered = filtered.filter(s => new Date(s.submittedAt) <= endDate);
                } else if (end && rangeOption !== 'all') {
                    // For presets, end is "now", so no need to filter future (unless future dates exist?)
                }


                // 3. Grouping Logic (Flattened by student, then by submission)
                const studentSubmissionMap: Record<string, SubmissionWithMeta[]> = {};
                filtered.forEach(sub => {
                    if (!studentSubmissionMap[sub.studentId]) {
                        studentSubmissionMap[sub.studentId] = [];
                    }
                    studentSubmissionMap[sub.studentId].push(sub);
                });

                // Aggregate scores for each assignment within a student's submissions
                const groupedByStudentAndAssignment: Record<string, Record<string, SubmissionWithMeta[]>> = {};
                for (const studentId in studentSubmissionMap) {
                    groupedByStudentAndAssignment[studentId] = {};
                    studentSubmissionMap[studentId].forEach(sub => {
                        if (!groupedByStudentAndAssignment[studentId][sub.assignmentId]) {
                            groupedByStudentAndAssignment[studentId][sub.assignmentId] = [];
                        }
                        groupedByStudentAndAssignment[studentId][sub.assignmentId].push(sub);
                    });
                }

                const finalGroupedHistory: StudentGroup[] = students.map(student => {
                    // If student role, only process the current user
                    if ((user as any)?.role === 'student' && student.id !== (user as any).id) return null;

                    const studentId = student.id;
                    const studentSubmissions = groupedByStudentAndAssignment[studentId] || {};

                    const enrichedSubmissions: SubmissionWithMeta[] = [];
                    for (const assignmentId in studentSubmissions) {
                        const submissionsForAssignment = studentSubmissions[assignmentId].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
                        if (submissionsForAssignment.length > 0) {
                            const latest = submissionsForAssignment[submissionsForAssignment.length - 1];
                            enrichedSubmissions.push({
                                ...latest,
                                scores: submissionsForAssignment.map(s => s.score).filter(sc => sc !== undefined && sc !== null && sc >= 0) as number[],
                                isPassed: (() => {
                                    // Workbook: use status/completedLevels from best submission
                                    const assignmentObj = allAssignments.find(a => a.id === assignmentId);
                                    if ((assignmentObj as any)?.type === 'workbook') {
                                        return submissionsForAssignment.some((s: any) => s.status === 'passed' || s.status === 'completed' || s.manualPass === true);
                                    }
                                    const validScores = submissionsForAssignment.map(s => s.score).filter(sc => sc !== undefined && sc !== null && sc >= 0) as number[];
                                    const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;
                                    const threshold = (latest.type === 'writing' || latest.type === 'writing_session') ? 90 : 80;
                                    return maxScore >= threshold || submissionsForAssignment.some((s: any) => s.manualPass === true);
                                })(),
                                isCompleted: (() => {
                                    const assignmentObj = allAssignments.find(a => a.id === assignmentId);
                                    if ((assignmentObj as any)?.type === 'workbook') {
                                        return submissionsForAssignment.some((s: any) => s.status === 'completed');
                                    }
                                    return false;
                                })()
                            });
                        }
                    }

                    // Sort all submissions by date (newest first)
                    const sortedSubmissions = enrichedSubmissions
                        .filter((s): s is SubmissionWithMeta => s !== null) // Ensure type guard
                        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

                    return {
                        studentId,
                        studentName: student?.name || '알 수 없는 학생',
                        studentUsername: (student as any)?.username || '',
                        lastActive: sortedSubmissions.length > 0 ? new Date(sortedSubmissions[0].submittedAt) : new Date(0),
                        totalSubmissions: sortedSubmissions.length, // This is now total unique assignments with submissions
                        submissions: sortedSubmissions
                    };
                }).filter((s): s is StudentGroup => s !== null) // Filter out nulls from student role check
                    .sort((a, b) => a.studentName.localeCompare(b.studentName)); // Initial sort by name, will be re-sorted by lastActive later

                // 4. Final Sort
                finalGroupedHistory.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

                setGroupedHistory(finalGroupedHistory);

            } catch (error) {
                console.error("Failed to load history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) loadData();
    }, [user, searchTerm, rangeOption, customDate, tick]); // Added tick to dependencies

    // --- Handlers ---
    const refreshData = () => {
        setTick(t => t + 1);
    };

    const handleToggleGuidance = async (submissionId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? "지도 필요 상태로 변경하시겠습니까?" : "지도 완료 처리하시겠습니까?")) return;
        try {
            await dbService.updateSubmissionGuidance(submissionId, !currentStatus);
            setTick(prev => prev + 1);
        } catch (e) {
            console.error(e);
            toast.error("처리 중 오류가 발생했습니다.");
        }
    };

    const handleManualPass = async (submissionId: string, currentManualPass: boolean) => {
        const newValue = !currentManualPass;
        if (!confirm(newValue ? '이 학생을 PASS 처리하시겠습니까?' : 'PASS 처리를 취소하시겠습니까?')) return;
        try {
            await dbService.updateSubmissionManualPass(submissionId, newValue);
            setTick(prev => prev + 1);
        } catch (e) {
            console.error(e);
            toast.error('처리 중 오류가 발생했습니다.');
        }
    };

    const handlePrint = (studentName: string, submissionId: string) => {
        // Logic identical to ClassRoomPage
        // We need to fetch the submission details first. 
        // Since we have the data in `groupedHistory`, we can find it.
        // Or just fetch from DB. Finding in local state is faster.

        let targetSub: SubmissionWithMeta | undefined;

        // Search in groupedHistory
        for (const g of groupedHistory) {
            for (const sub of g.submissions) {
                if (sub.id === submissionId) {
                    targetSub = sub;
                    break;
                }
            }
            if (targetSub) break;
        }

        if (!targetSub) {
            toast.error("제출 기록을 찾을 수 없습니다.");
            return;
        }

        const failedItems = targetSub.aiAnalysis?.filter((item: any) => item.score < 100) || [];
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>${studentName} - 오답 노트</title>
                <style>
                    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
                    .meta { margin-bottom: 40px; color: #666; font-size: 14px; }
                    .item { margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
                    .score { color: #e11d48; font-weight: bold; }
                    .sentence { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                    .analysis { color: #475569; margin-bottom: 10px; }
                    .feedback { background: #f8fafc; padding: 10px; border-radius: 4px; color: #4b5563; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>오답 노트 / 지도 자료</h1>
                <div class="meta">
                    <strong>학생:</strong> ${studentName}<br>
                    <strong>과제:</strong> ${targetSub.assignmentTitle}<br>
                    <strong>일시:</strong> ${new Date(targetSub.submittedAt).toLocaleString()}
                </div>
                ${failedItems.length > 0 ? failedItems.map((item: any, idx: number) => `
                    <div class="item">
                        <div class="sentence">Q${idx + 1}. (점수: <span class="score">${item.score}</span>)</div>
                        <div class="analysis"><strong>[정답 구조]</strong><br>${item.correctStructure || '정보 없음'}</div>
                        <div class="feedback"><strong>[피드백]</strong><br>${item.feedback || '피드백 없음'}</div>
                    </div>
                `).join('') : '<p>오답 데이터가 없거나 모든 문장을 통과했습니다.</p>'}
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleResetAssignment = async (studentId: string, assignmentId: string, title: string) => {
        if (!confirm(`[주의] '${title}' 과제의 모든 제출 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            // Find specific assignment history
            let submissionIds: string[] = [];

            // Search in groupedHistory
            const studentGroup = groupedHistory.find(g => g.studentId === studentId);
            if (!studentGroup) return;

            studentGroup.submissions.forEach(sub => {
                if (sub.assignmentId === assignmentId) {
                    submissionIds.push(sub.id);
                }
            });

            if (submissionIds.length === 0) {
                toast.error("삭제할 기록이 없습니다.");
                return;
            }

            // Delete
            await Promise.all(submissionIds.map(id => dbService.deleteSubmission(id)));

            toast.success("초기화 완료되었습니다.");
            setTick(prev => prev + 1);
        } catch (e) {
            console.error(e);
            toast.error("초기화 중 오류가 발생했습니다.");
        }
    };


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full">
            <motion.header
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 sm:gap-8 mb-8 sm:mb-12"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">History</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none">학습 리포트</h1>
                    <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mt-3 sm:mt-4 font-medium max-w-2xl">
                        학생별 학습 현황 및 통합 성적표를 확인하세요.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-64 group">
                        <input
                            type="text"
                            placeholder="이름 또는 과제 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium dark:text-white"
                        />
                        <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    {/* Quick Date Filter */}
                    <div className="relative">
                        <select
                            value={rangeOption}
                            onChange={(e) => setRangeOption(e.target.value as DateRangeOption)}
                            className="w-full md:w-auto px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-slate-700 font-bold cursor-pointer appearance-none pr-10"
                        >
                            <option value="2weeks">최근 2주</option>
                            <option value="1week">최근 1주</option>
                            <option value="1month">최근 1개월</option>
                            <option value="all">전체 기간</option>
                            <option value="custom">직접 선택</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Conditional Date Picker */}
                    {rangeOption === 'custom' && (
                        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                            <input
                                type="date"
                                value={customDate.start}
                                onChange={(e) => setCustomDate({ ...customDate, start: e.target.value })}
                                className="px-3 py-1.5 rounded-xl text-sm text-slate-600 focus:outline-none focus:bg-slate-50 border-none font-medium"
                            />
                            <span className="text-slate-300">-</span>
                            <input
                                type="date"
                                value={customDate.end}
                                onChange={(e) => setCustomDate({ ...customDate, end: e.target.value })}
                                className="px-3 py-1.5 rounded-xl text-sm text-slate-600 focus:outline-none focus:bg-slate-50 border-none font-medium"
                            />
                        </div>
                    )}
                </div>
            </motion.header>

            {/* Group Filter */}
            {(user as any)?.role === 'admin' && (() => {
                const groupNames = [...new Set(allStudentsData.map((s: any) => s.groupName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')) as string[];
                if (groupNames.length === 0) return null;
                return (
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative">
                            <select
                                value={groupFilter}
                                onChange={e => setGroupFilter(e.target.value)}
                                className="appearance-none px-4 py-2.5 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none transition-all"
                            >
                                <option value="all">전체 반</option>
                                {groupNames.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <svg className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                );
            })()}

            {/* Accordion List */}
            <div className="space-y-4">
                {loading ? (
                    <SkeletonHistoryList />
                ) : (
                    <>
                        {groupedHistory
                            .filter(sg => {
                                if (groupFilter === 'all') return true;
                                const student = allStudentsData.find((s: any) => s.id === sg.studentId);
                                return (student?.groupName || '') === groupFilter;
                            })
                            .map(studentGroup => (
                            <StudentAccordion
                                key={studentGroup.studentId}
                                group={studentGroup}
                                isOpen={openStudentIds.has(studentGroup.studentId)}
                                onToggle={() => setOpenStudentIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(studentGroup.studentId)) next.delete(studentGroup.studentId);
                                    else next.add(studentGroup.studentId);
                                    return next;
                                })}
                                onSelectSubmission={setSelectedSubmission}
                                onToggleGuidance={handleToggleGuidance}
                                onManualPass={handleManualPass}
                                onPrint={handlePrint}
                                onReset={handleResetAssignment}
                                onStructurePrint={(sid, sname) => {
                                    setStructurePrintStudentId(sid);
                                    setStructurePrintStudentName(sname);
                                    setIsStructurePrintOpen(true);
                                }}
                                onAnalysisPrint={(sid, sname) => {
                                    setAnalysisPrintStudentId(sid);
                                    setAnalysisPrintStudentName(sname);
                                    setIsAnalysisPrintOpen(true);
                                }}
                                userRole={(user as any)?.role || 'student'}
                                assignments={allAssignments}
                            />
                        ))}

                        {groupedHistory.length === 0 && (
                            <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-dashed border-slate-200 dark:border-white/10">
                                <p className="text-slate-400 dark:text-slate-500 font-medium">조회된 학습 기록이 없습니다.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedSubmission && (
                <ResultHistoryModal
                    onClose={() => setSelectedSubmission(null)}
                    assignmentId={selectedSubmission.assignmentId}
                    studentId={selectedSubmission.studentId}
                    assignmentTitle={selectedSubmission.assignmentTitle || ''}
                    assignmentType={selectedSubmission.type || 'structure'}
                    onViewDetail={() => { }}
                    onRefresh={() => setTick(prev => prev + 1)}
                />
            )}

            {/* Structure Print Modal */}
            {isStructurePrintOpen && (
                <StructurePrintModal
                    studentId={structurePrintStudentId}
                    studentName={structurePrintStudentName}
                    assignments={allAssignments}
                    onClose={() => setIsStructurePrintOpen(false)}
                    isAdmin={(user as any)?.role === 'admin'}
                />
            )}

            {/* Analysis Print Modal */}
            {isAnalysisPrintOpen && (
                <AnalysisPrintModal
                    studentId={analysisPrintStudentId}
                    studentName={analysisPrintStudentName}
                    assignments={allAssignments}
                    onClose={() => setIsAnalysisPrintOpen(false)}
                    isAdmin={(user as any)?.role === 'admin'}
                />
            )}
        </div>
    );
}

