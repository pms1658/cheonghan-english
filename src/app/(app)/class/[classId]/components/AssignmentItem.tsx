'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Assignment } from '@/types';
import { Badge, StudentStatusBadge } from './AssignmentBadge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssignmentWithStats, getTime } from '../useClassRoom';

// Sortable Item Wrapper
export const SortableItem = ({ id, children, disabled }: { id: string, children: React.ReactNode, disabled?: boolean }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? transition : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 99 : 'auto' as any,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

interface AssignmentItemProps {
    assignment: AssignmentWithStats;
    userRole: string;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onReset: (assignment: Assignment, e: React.MouseEvent, studentId?: string) => void;
    classStudents: any[];
    submissions: any[];
    router: any;
    currentUserId: string;
    onToggleGuidance: (id: string, status: boolean, e?: React.MouseEvent) => void;
    onApproveSubmission: (id: string) => void;
    onPrint: (name: string, id: string) => void;
    isReordering?: boolean;
    onManualPass?: (id: string, currentManualPass: boolean, e?: React.MouseEvent) => void;
    allAssignmentsRaw?: any[];
    expandedSelections?: Set<string>;
    setExpandedSelections?: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedAssignments?: Set<string>;
    toggleAssignmentSelection?: (id: string) => void;
    onEdit?: (assignment: Assignment, e: React.MouseEvent) => void;
    setApprovalModal?: (v: any) => void;
    setWritingDetailTarget?: (v: any) => void;
    isSplitModalOpen?: boolean;
    setSplitTarget?: (v: any) => void;
    setIsSplitModalOpen?: (v: boolean) => void;
    setStructurePrintStudentId?: (v: string) => void;
    setStructurePrintStudentName?: (v: string) => void;
    setIsStructurePrintOpen?: (v: boolean) => void;
    classId?: string;
    onConvertType?: (assignment: Assignment) => void;
    setMoveAssignmentModal?: (v: { assignmentId: string; title: string } | null) => void;
}

export const AssignmentItem = ({
    assignment,
    userRole,
    onDelete,
    onReset,
    classStudents,
    submissions,
    router,
    currentUserId,
    onToggleGuidance,
    onApproveSubmission,
    onPrint,
    isReordering,
    onManualPass,
    allAssignmentsRaw = [],
    expandedSelections = new Set<string>(),
    setExpandedSelections,
    selectedAssignments = new Set<string>(),
    toggleAssignmentSelection,
    onEdit,
    setApprovalModal,
    setWritingDetailTarget,
    setSplitTarget,
    setIsSplitModalOpen,
    setStructurePrintStudentId,
    setStructurePrintStudentName,
    setIsStructurePrintOpen,
    classId = '',
    onConvertType,
    setMoveAssignmentModal,
}: AssignmentItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // Filter submissions for this assignment
    const relevantSubmissions = submissions.filter(s => s.assignmentId === assignment.id);

    // [New] Calculate Admin Alert Counts for this Assignment
    let guidanceCount = 0;
    let approvalCount = 0;

    if (userRole === 'admin') {
        classStudents.forEach(std => {
            const stdSubs = relevantSubmissions.filter(s => s.studentId === std.id);
            const latest = stdSubs.sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0)).at(-1);

            if (assignment.type === 'structure') {
                const maxScore = Math.max(...stdSubs.map(s => s.score || 0), 0);
                const attempts = stdSubs.length;
                if (attempts >= 3 && maxScore < 80 && !latest?.guidanceCompleted) {
                    guidanceCount++;
                }
            }
            if (assignment.type === 'selection') {
                if (latest && latest.status === 'pending_review') {
                    approvalCount++;
                }
            }
        });
    }

    return (
        <>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-white/10 transition-colors hover:border-blue-300 dark:hover:border-blue-500/40 shadow-sm hover:shadow-md group">
            {/* Compact Bar */}
            <div
                className="flex items-center gap-2 sm:gap-4 py-2 px-3 sm:px-4 cursor-pointer"
                onClick={() => {
                    sessionStorage.setItem('scrollToAssignment', assignment.id);
                    router.push(`/student/assignment/${assignment.id}?classId=${classId}`);
                }}
            >
                {/* Checkbox for Merge / Print */}
                {userRole === 'admin' && (assignment.type === 'vocabulary' || assignment.type === 'selection' || assignment.type === 'transform' || assignment.type === 'transform_subjective' || assignment.type === 'structure' || assignment.type === 'workbook' || assignment.type === 'analysis' || assignment.type === 'sentence_order') && (
                    <div className="flex items-center justify-center pl-2 sm:pl-4" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={selectedAssignments.has(assignment.id)}
                            onChange={() => toggleAssignmentSelection?.(assignment.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                )}

                {/* Badge */}
                <div className="w-[50px] sm:w-[70px] flex justify-center flex-shrink-0">
                    <Badge type={assignment.type} />
                </div>

                {/* Title & Info */}
                <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {isReordering && (
                            <div className="cursor-grab active:cursor-grabbing text-slate-400 p-1 hover:bg-slate-100 rounded">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                            </div>
                        )}
                        <span className="text-sm sm:text-[15px] tracking-tight font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" style={{ fontWeight: 700 }}>
                            {assignment.title}
                        </span>

                        {/* Content Metadata */}
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 ml-2 hidden sm:flex">
                            {/* Structure: Sentences */}
                            {assignment.type === 'structure' && assignment.sentences && (
                                <span>문장: {assignment.sentences.length}</span>
                            )}

                            {/* Vocab: Words */}
                            {assignment.type === 'vocabulary' && assignment.words && (
                                <span>단어: {assignment.words.length}</span>
                            )}

                            {/* Transform: Problems */}
                            {assignment.type === 'transform' && (assignment as any).variantProblems && (
                                <span>문제: {(assignment as any).variantProblems.length}개</span>
                            )}

                            {/* Subjective: Problems */}
                            {assignment.type === 'transform_subjective' && (assignment as any).subjectiveProblems && (
                                <span>문제: {(assignment as any).subjectiveProblems.length}개</span>
                            )}

                            {/* Sentence Order: Sentences */}
                            {assignment.type === 'sentence_order' && (assignment as any).sentenceOrderConfig?.originalSentences && (
                                <span>문장: {(assignment as any).sentenceOrderConfig.originalSentences.length}개</span>
                            )}

                            {/* Selection: Words & Selected */}
                            {assignment.type === 'selection' && assignment.words && (
                                <>
                                    <span>단어: {assignment.words.length}</span>
                                    {/* Student Selected Count */}
                                    {userRole !== 'admin' && (() => {
                                        const stdSubs = relevantSubmissions.filter(s => s.studentId === currentUserId);
                                        const selectionRelease = stdSubs.find(s => s.status === 'approved' || s.status === 'pending_review' || s.status === 'selection_rejected');

                                        if (selectionRelease && selectionRelease.details && selectionRelease.details.length > 0 && selectionRelease.details[0]?.selectedIndices) {
                                            return (
                                                <>
                                                    <span className="w-px h-3 bg-slate-300 mx-1"></span>
                                                    <span className="text-blue-600 font-bold">
                                                        선택: {selectionRelease.details[0].selectedIndices.length}
                                                    </span>
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            )}
                        </div>

                        {/* [New] Admin Alerts on Card */}
                        {userRole === 'admin' && guidanceCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 animate-pulse">
                                🚨 지도필요 {guidanceCount}명
                            </span>
                        )}
                        {userRole === 'admin' && approvalCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                                ⚡ 승인요청 {approvalCount}명
                            </span>
                        )}
                    </div>

                    {/* Stats - Admin Only or Summary */}
                    <div className="hidden sm:flex items-center gap-6 mr-6">
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                            {userRole === 'admin' && (
                                <>
                                    <span className={`${assignment.progressRate === 100 ? 'text-emerald-600 font-bold' : 'text-blue-600'}`}>
                                        {assignment.submissionCount}명 제출 ({assignment.progressRate}%)
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Student Status Badge - Right Side */}
                    {userRole !== 'admin' && (
                        <div className="flex-shrink-0 ml-auto">
                            <StudentStatusBadge assignment={assignment} submissions={submissions} userId={currentUserId} allAssignmentsRaw={allAssignmentsRaw} />
                        </div>
                    )}
                </div>

                {/* Accordion Toggle - Admin Only */}
                {userRole === 'admin' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={`p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-all ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-600' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                )}

                {/* Admin Actions - ⋯ Dropdown Menu */}
                {userRole === 'admin' && (
                    <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                            className={`p-2 rounded-full transition-all ${menuOpen ? 'bg-slate-100 text-slate-600 shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 hover:shadow-sm'}`}
                            title="관리 메뉴"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                            </svg>
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                {(assignment.type === 'vocabulary' || assignment.type === 'selection') && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSplitTarget?.(assignment); setIsSplitModalOpen?.(true); }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4"></path></svg>
                                            나누기
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onConvertType?.(assignment); }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12M8 12h12m-12 5h12"></path></svg>
                                            {assignment.type === 'selection' ? '→ 학습으로 변환' : '→ 선택으로 변환'}
                                        </button>
                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                    </>
                                )}
                                <button
                                    onClick={(e) => { setMenuOpen(false); onEdit?.(assignment, e); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    수정
                                </button>
                                <button
                                    onClick={(e) => { setMenuOpen(false); onReset(assignment, e); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                    전체 초기화
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                {/* Move to another class */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        setMoveAssignmentModal?.({ assignmentId: assignment.id, title: assignment.title });
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                    다른 과제방으로 이동
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                <button
                                    onClick={(e) => { setMenuOpen(false); onDelete(assignment.id, e); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    삭제
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Student List Detail View --- */}
            {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Batch Print Bar for Structure/Writing Assignments */}
                        {(assignment.type === 'structure' || assignment.type === 'writing') && userRole === 'admin' && (() => {
                            const studentsWithSubs = classStudents.filter(s =>
                                relevantSubmissions.some(sub => sub.studentId === s.id)
                            );
                            return studentsWithSubs.length > 0 ? (
                                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${assignment.type === 'writing' ? 'bg-blue-50/60 border-blue-100' : 'bg-blue-50/60 border-blue-100'}`}>
                                    <span className={`text-xs font-bold ${assignment.type === 'writing' ? 'text-blue-600' : 'text-blue-600'}`}>{studentsWithSubs.length}명 제출 완료</span>
                                    <span className="text-[10px] text-slate-400">{assignment.type === 'writing' ? '학생 행 클릭으로 결과 확인' : '학생 행의 🖨️ 버튼으로 개별 인쇄'}</span>
                                </div>
                            ) : null;
                        })()}
                        {classStudents.map((student, idx) => {
                            // Filter student submissions & Sort by attempt
                            const stdSubmissions = relevantSubmissions
                                .filter(s => s.studentId === student.id)
                                .sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

                            const latest = stdSubmissions.length > 0 ? stdSubmissions[stdSubmissions.length - 1] : null;
                            const hasSubmission = !!latest;

                            // Score Logic
                            const scores = stdSubmissions.map(s => s.score || 0);
                            const maxScore = hasSubmission ? Math.max(...scores) : 0;

                            // Logic: Guidance Needed (Structure only)
                            const isStructure = assignment.type === 'structure';
                            const isWriting = assignment.type === 'writing';
                            const passThreshold = isWriting ? 90 : 80;
                            const attempts = stdSubmissions.length;
                            const needsGuidance = isStructure && attempts >= 3 && maxScore < 80;
                            const guidanceCompleted = latest?.guidanceCompleted === true;

                            const isPassed = maxScore >= passThreshold || stdSubmissions.some((s: any) => s.manualPass === true);
                            const isManualPassed = stdSubmissions.some((s: any) => s.manualPass === true);

                            // Logic: Approval Needed (Selection only)
                            const isSelection = assignment.type === 'selection';
                            const needsApproval = isSelection && latest?.status === 'pending_review';

                            return (
                                <div key={student.id} className={`flex items-center justify-between py-2 px-3 sm:px-4 ${idx !== classStudents.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-blue-50/20 group/row`}>

                                    {/* Left: Checkbox & Name */}
                                    <div className="flex items-center gap-3 w-[160px] sm:w-[200px]">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{student.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{student.id}</div>
                                        </div>
                                    </div>

                                    {/* Center: Score Boxes or Value */}
                                    <div className="flex-1 flex justify-center">
                                        {hasSubmission ? (
                                            <div className="flex flex-col items-center">
                                                {(isStructure || isWriting) ? (
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {stdSubmissions.map((sub, i) => (
                                                            <span key={i} className={`
                                                            text-[10px] font-bold px-1.5 py-0.5 rounded
                                                            ${sub.score >= passThreshold
                                                                    ? (isWriting ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600')
                                                                    : 'bg-red-50 text-red-600'}
                                                        `}>
                                                                {sub.score}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : isSelection ? (
                                                    /* Selection type: show stage instead of score */
                                                    (() => {
                                                        const hasApproved = stdSubmissions.some(s => s.status === 'approved');
                                                        const hasPending = stdSubmissions.some(s => s.status === 'pending_review');
                                                        const childAssignments = allAssignmentsRaw.filter(
                                                            a => a.parentAssignmentId === assignment.id && a.parentStudentId === student.id
                                                        );
                                                        const studySubs = stdSubmissions.filter(s => s.status !== 'pending_review' && s.status !== 'approved' && s.status !== 'selection_rejected' && s.attempt > 0);
                                                        
                                                        // Check children completion
                                                        let childStatus = '';
                                                        if (childAssignments.length > 0) {
                                                            const completedChildren = childAssignments.filter((c: any) => {
                                                                const cSubs = submissions.filter((s: any) => s.assignmentId === c.id && s.studentId === student.id);
                                                                return cSubs.some((s: any) => s.score >= 100);
                                                            });
                                                            if (completedChildren.length === childAssignments.length) childStatus = 'done';
                                                            else if (completedChildren.length > 0) childStatus = 'partial';
                                                        }
                                                        
                                                        if (childStatus === 'done' || studySubs.some(s => s.score >= 100)) {
                                                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200">학습완료</span>;
                                                        } else if (childStatus === 'partial' || studySubs.length > 0) {
                                                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">학습 중</span>;
                                                        } else if (hasApproved) {
                                                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200">승인완료</span>;
                                                        } else if (hasPending) {
                                                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 animate-pulse">승인대기</span>;
                                                        } else {
                                                            return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">선택 제출</span>;
                                                        }
                                                    })()
                                                ) : (
                                                    /* Other types: show score but hide -1 */
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {latest.score != null && latest.score >= 0 ? `${latest.score}점` : '-'}
                                                    </span>
                                                )}

                                                {/* Exam Date */}
                                                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                                    {new Date(latest.submittedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">미제출</span>
                                        )}
                                    </div>

                                    {/* Right: Status & Actions (Aligned Right) */}
                                    <div className="flex items-center justify-end gap-6 w-[350px]">

                                        {/* Status Badge Area */}
                                        <div className="flex flex-col items-end gap-1 min-w-[80px]">
                                            {needsGuidance && !guidanceCompleted && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span
                                                        onClick={userRole === 'admin' ? (e) => onToggleGuidance(latest.id, false, e) : undefined}
                                                        className={`text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 animate-pulse ${userRole === 'admin' ? 'cursor-pointer hover:bg-red-100 active:scale-95 transition-transform select-none' : ''}`}
                                                        title={userRole === 'admin' ? "클릭하여 지도 완료 처리" : ""}
                                                    >
                                                        지도필요
                                                    </span>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={() => onPrint(student.name, latest.id)}
                                                            className="text-[10px] font-bold text-slate-500 underline hover:text-slate-800 flex items-center gap-1"
                                                        >
                                                            🖨️ 출력
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {needsGuidance && guidanceCompleted && (
                                                <span
                                                    onClick={userRole === 'admin' ? (e) => onToggleGuidance(latest.id, true, e) : undefined}
                                                    className={`text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 ${userRole === 'admin' ? 'cursor-pointer hover:bg-emerald-100 active:scale-95 transition-transform select-none' : ''}`}
                                                    title={userRole === 'admin' ? "클릭하여 지도 필요 상태로 복구" : ""}
                                                >
                                                    지도완료
                                                </span>
                                            )}

                                            {needsApproval && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-bounce">
                                                        승인요청
                                                    </span>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={() => {
                                                                const sub = submissions.find((s: any) => s.id === latest.id);
                                                                if (sub && sub.details?.[0]?.selectedIndices && assignment.words) {
                                                                    const indices = sub.details[0].selectedIndices;
                                                                    const selectedWords = assignment.words.filter((_: any, i: number) => indices.includes(i));
                                                                    setApprovalModal?.({
                                                                        submissionId: latest.id,
                                                                        studentName: student.name,
                                                                        assignmentId: assignment.id,
                                                                        assignmentTitle: assignment.title,
                                                                        selectedWords,
                                                                        selectedIndices: indices,
                                                                    });
                                                                }
                                                            }}
                                                            className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded shadow-sm hover:bg-amber-600 transition-colors"
                                                        >
                                                            승인하기
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isPassed && !needsGuidance && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                                                        isManualPassed && maxScore < 80
                                                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                                            : 'text-blue-600 bg-blue-50 border-blue-100'
                                                    }`}>
                                                        {isManualPassed && maxScore < 80 ? 'PASS (관리자)' : '완료'}
                                                    </span>
                                                    {userRole === 'admin' && isManualPassed && (
                                                        <button
                                                            onClick={(e) => onManualPass?.(latest!.id, true, e)}
                                                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            PASS 취소
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Admin: Manual Pass Button - shown for structure assignments that have submissions but not passed */}
                                            {userRole === 'admin' && isStructure && hasSubmission && !isPassed && (
                                                <button
                                                    onClick={(e) => onManualPass?.(latest!.id, false, e)}
                                                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm"
                                                >
                                                    ✔ PASS 처리
                                                </button>
                                            )}
                                        </div>

                                        {/* Action: Print Structure (per student) */}
                                        {userRole === 'admin' && isStructure && hasSubmission && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStructurePrintStudentId?.(student.id);
                                                    setStructurePrintStudentName?.(student.name);
                                                    setIsStructurePrintOpen?.(true);
                                                }}
                                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover/row:opacity-100"
                                                title="이 학생의 구조독해 일괄 인쇄"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                            </button>
                                        )}

                                        {/* Action: View/Print Writing Result (per student) */}
                                        {isWriting && hasSubmission && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setWritingDetailTarget?.({ studentName: student.name, submissions: stdSubmissions });
                                                }}
                                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover/row:opacity-100"
                                                title="영작 결과 보기"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            </button>
                                        )}

                                        {/* Action: Reset */}
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={(e) => onReset(assignment, e, student.id)}
                                                className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all opacity-0 group-hover/row:opacity-100"
                                                title="이 학생 초기화"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Split Sub-Assignment Detail for this student */}
                                    {(() => {
                                        const childAssignments = allAssignmentsRaw.filter(
                                            a => a.parentAssignmentId === assignment.id && a.parentStudentId === student.id
                                        ).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999) || (a.title || '').localeCompare(b.title || ''));
                                        if (childAssignments.length === 0) return null;

                                        return (
                                            <div className="ml-8 mb-2 space-y-1.5 border-l-2 border-amber-200 pl-3 py-1">
                                                <div className="text-[10px] font-bold text-amber-600">
                                                    📂 분할 과제 ({childAssignments.length}개)
                                                </div>
                                                {childAssignments.map(child => {
                                                    const childSubs = submissions.filter(s => s.assignmentId === child.id && s.studentId === student.id);
                                                    const childCompleted = childSubs.some(s => s.score >= 100);
                                                    return (
                                                        <div key={child.id} className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-xs ${
                                                            childCompleted ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${childCompleted ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                                                <span className="font-bold text-slate-700">{child.title}</span>
                                                                <span className="text-[10px] text-slate-400">{child.words?.length || 0}개</span>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                childCompleted
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                    : childSubs.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                                                            }`}>
                                                                {childCompleted ? '완료' : childSubs.length > 0 ? '학습중' : '미시작'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}

                        {classStudents.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">학생이 없습니다.</div>
                        )}
                    </div>
                </div>
            )}
        </div>

            {/* Student: Split sub-assignments toggle */}
            {userRole !== 'admin' && assignment.type === 'selection' && (() => {
                const childAssignments = allAssignmentsRaw.filter(
                    (a: any) => a.parentAssignmentId === assignment.id && a.parentStudentId === currentUserId
                ).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999) || (a.title || '').localeCompare(b.title || ''));
                if (childAssignments.length === 0) return null;
                const completedCount = childAssignments.filter((c: any) => {
                    const cSubs = submissions.filter((s: any) => s.assignmentId === c.id && s.studentId === currentUserId);
                    return cSubs.some((s: any) => s.score >= 100);
                }).length;
                const allDone = completedCount === childAssignments.length;
                return (
                    <div className="mt-2">
                        <button
                            onClick={(e) => {
                                setExpandedSelections?.(prev => {
                                    const next = new Set(prev);
                                    if (next.has(assignment.id)) next.delete(assignment.id);
                                    else next.add(assignment.id);
                                    return next;
                                });
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/50 rounded-xl transition-all text-left"
                        >
                            <svg className={`w-3.5 h-3.5 text-amber-500 transition-transform ${expandedSelections.has(assignment.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                            <span className="text-[11px] font-bold text-amber-700">
                                분할 단어 과제 ({completedCount}/{childAssignments.length}완료)
                            </span>
                            {allDone && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-auto">✅ 전체 완료</span>
                            )}
                        </button>
                        {expandedSelections.has(assignment.id) && (
                            <div className="ml-4 mt-2 space-y-2 border-l-2 border-amber-200 pl-4">
                                {childAssignments.map((child: any) => {
                                    const cSubs = submissions.filter((s: any) => s.assignmentId === child.id && s.studentId === currentUserId);
                                    const isComplete = cSubs.some((s: any) => s.score >= 100);
                                    return (
                                        <div key={child.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            isComplete ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-white border-slate-100 hover:border-amber-200'
                                        }`}>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">단어</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                    isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>{isComplete ? '완료' : '진행중'}</span>
                                                <span className="text-sm font-bold text-slate-700 truncate">{child.title}</span>
                                                <span className="text-[10px] text-slate-400 flex-shrink-0">{child.words?.length || 0}개</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/student/assignment/${child.id}`); }}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0 ${
                                                    isComplete ? 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                                }`}
                                            >
                                                {isComplete ? '결과' : '학습'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}
    </>
    );
};
