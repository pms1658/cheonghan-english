'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Submission, AssignmentType } from '@/types';

// --- Types (shared with history page) ---
export interface SubmissionWithMeta extends Submission {
    studentName?: string;
    studentUsername?: string;
    assignmentTitle?: string;
    className?: string;
    type?: AssignmentType | string;
    scores?: number[];
    isPassed?: boolean;
    isCompleted?: boolean;
}

export interface StudentGroup {
    studentId: string;
    studentName: string;
    studentUsername: string;
    lastActive: Date;
    totalSubmissions: number;
    submissions: SubmissionWithMeta[];
}

// --- Badge Component (Jewel Style) ---
const Badge = ({ type }: { type: string }) => {
    let borderClass = '';
    let bgClass = '';
    let label = '';

    switch (type) {
        case 'structure':
            borderClass = 'border-l-[4px] border-blue-500';
            bgClass = 'bg-blue-50/50 text-blue-700';
            label = '구조독해';
            break;
        case 'vocabulary':
            borderClass = 'border-l-[4px] border-emerald-500';
            bgClass = 'bg-emerald-50/50 text-emerald-700';
            label = '단어학습';
            break;
        case 'selection':
            borderClass = 'border-l-[4px] border-amber-400';
            bgClass = 'bg-amber-50/50 text-amber-700';
            label = '단어선택';
            break;
        case 'transform':
        case 'variant_session':
            borderClass = 'border-l-[4px] border-amber-800';
            bgClass = 'bg-amber-50/40 text-amber-900';
            label = '변형문제';
            break;
        case 'writing':
        case 'writing_session':
            borderClass = 'border-l-[4px] border-fuchsia-500';
            bgClass = 'bg-fuchsia-50/50 text-fuchsia-700';
            label = '구조작문';
            break;
        case 'analysis':
            borderClass = 'border-l-[4px] border-teal-500';
            bgClass = 'bg-teal-50/50 text-teal-700';
            label = '본문분석';
            break;
        case 'sentence_order':
            borderClass = 'border-l-[4px] border-amber-700';
            bgClass = 'bg-amber-50/50 text-amber-800';
            label = '세부순서';
            break;
        default:
            borderClass = 'border-l-[4px] border-slate-400';
            bgClass = 'bg-slate-50 text-slate-600';
            label = type || '과제';
    }

    return (
        <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-bold ${borderClass} ${bgClass} rounded-r sm:px-1.5`}>
            {label}
        </span>
    );
};

// --- Student Level Accordion ---
interface StudentAccordionProps {
    group: StudentGroup;
    isOpen: boolean;
    onToggle: () => void;
    onSelectSubmission: (s: SubmissionWithMeta) => void;
    onToggleGuidance: (id: string, s: boolean) => void;
    onManualPass: (id: string, current: boolean) => void;
    onPrint: (name: string, id: string) => void;
    onReset: (sid: string, aid: string, title: string) => void;
    onStructurePrint: (sid: string, sname: string) => void;
    onAnalysisPrint: (sid: string, sname: string) => void;
    userRole: string;
    assignments: any[];
}

export default function StudentAccordion({ group, isOpen, onToggle, onSelectSubmission, onToggleGuidance, onManualPass, onPrint, onReset, onStructurePrint, onAnalysisPrint, userRole, assignments }: StudentAccordionProps) {

    // Calc Stats (Simplified for flattened view)
    let guidanceNeeded = 0;
    let approvalNeeded = 0;

    group.submissions.forEach(sub => {
        // Guidance (based on latest submission for an assignment)
        const hasManualPass = (sub as any).manualPass === true || sub.isPassed;
        if (sub.type === 'structure' && (sub.scores?.length || 0) >= 3 && Math.max(...(sub.scores || [0])) < 80 && !hasManualPass && !sub.guidanceCompleted) {
            guidanceNeeded++;
        }
        // Approval
        if (sub.type === 'selection' && sub.status === 'pending_review') {
            approvalNeeded++;
        }
    });

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* Header */}
            <div
                onClick={onToggle}
                className={`flex items-center justify-between px-4 sm:px-5 py-2.5 cursor-pointer transition-all duration-300 ${isOpen ? 'bg-white dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A0E27] flex items-center justify-center text-white font-bold text-sm">
                        {group.studentName[0]}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            {group.studentName}
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                {group.studentUsername}
                            </span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {group.lastActive.getTime() === 0 ? '접속 이력 없음' : `최근 활동: ${group.lastActive.toLocaleDateString('ko-KR')}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Structure Print Button */}
                    {userRole === 'admin' && group.submissions.some(s => s.type === 'structure') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onStructurePrint(group.studentId, group.studentName); }}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors hidden lg:flex items-center gap-1"
                        >
                            🖨️ 구조독해 인쇄
                        </button>
                    )}
                    {/* Analysis Print Button */}
                    {userRole === 'admin' && group.submissions.some(s => s.type === 'analysis') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAnalysisPrint(group.studentId, group.studentName); }}
                            className="text-[10px] font-bold text-teal-500 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors hidden lg:flex items-center gap-1"
                        >
                            🖨️ 본문분석 인쇄
                        </button>
                    )}
                    <div className="flex items-center gap-3 text-right hidden lg:flex">
                        {guidanceNeeded > 0 && (
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">지도필요</span>
                                <span className="text-base font-black text-red-600 leading-none">{guidanceNeeded}</span>
                            </div>
                        )}
                        {approvalNeeded > 0 && (
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-tighter">승인요청</span>
                                <span className="text-base font-black text-amber-600 leading-none">{approvalNeeded}</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center pl-4 border-l border-slate-100">
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">SUBMISSIONS</div>
                            <div className="text-base font-black text-blue-600 leading-none">{group.totalSubmissions}</div>
                        </div>
                    </div>
                    <svg
                        className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>

            {/* Content (Expanded) */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-50 bg-white">
                    {group.submissions.length > 0 ? (
                        <div className="w-full">
                            {/* Simple Table Header (Minimalist) */}
                            <div className="flex bg-slate-50/50 text-slate-400 px-4 py-1.5 font-bold text-[8px] sm:text-[9px] tracking-widest uppercase border-b border-slate-100">
                                <div className="w-[45%]">학습한 세트</div>
                                <div className="w-[35%] text-center hidden sm:block">기록 및 점수</div>
                                <div className="w-[20%] text-right pr-4">상태</div>
                            </div>

                            <div className="divide-y divide-slate-100/50">
                                {group.submissions.map((item: SubmissionWithMeta) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-0 py-2 px-3 sm:px-4 group hover:bg-slate-50/50 transition-all relative">
                                        {/* Column 1: Info */}
                                        <div className="col-span-7 sm:col-span-5 flex items-center gap-2 sm:gap-3">
                                            <div className="flex-shrink-0">
                                                <Badge type={item.type || 'structure'} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-700 text-xs sm:text-sm truncate group-hover:text-blue-600 transition-colors">
                                                    {item.assignmentTitle}
                                                </h4>
                                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">
                                                    최근: {new Date(item.submittedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Column 2: History */}
                                        <div className="hidden sm:col-span-4 sm:flex items-center justify-center gap-1.5">
                                            <div className="flex items-center gap-1">
                                                {item.scores?.map((score: number, idx: number) => {
                                                    const isWritingType = item.type === 'writing' || item.type === 'writing_session';
                                                    const threshold = isWritingType ? 90 : 80;
                                                    return (
                                                        <span key={idx} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${score >= threshold
                                                            ? (isWritingType ? 'bg-fuchsia-50 text-fuchsia-600' : 'bg-blue-50 text-blue-600')
                                                            : score >= 50 ? 'bg-amber-50 text-amber-600'
                                                                : 'bg-red-50 text-red-600'
                                                        }`}>
                                                            {score}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Column 3: Status */}
                                        <div className="col-span-5 sm:col-span-3 flex items-center justify-end pr-1 sm:pr-4 gap-1 sm:gap-1.5">
                                            <div className="flex flex-wrap items-center justify-end gap-1">
                                                {item.type === 'structure' && (item.scores?.length || 0) >= 3 && Math.max(...(item.scores || [0])) < 80 && !item.isPassed && !item.guidanceCompleted && userRole === 'admin' && (
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); onToggleGuidance(item.id, !!item.guidanceCompleted); }}
                                                        className="text-[8px] font-bold text-red-600 bg-red-50 px-1.5 py-px rounded border border-red-100 cursor-pointer hover:bg-red-100"
                                                    >
                                                        지도
                                                    </span>
                                                )}
                                                {item.type === 'selection' && item.status === 'pending_review' && (
                                                    <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-px rounded border border-amber-100 animate-pulse">
                                                        승인
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectSubmission(item);
                                                    }}
                                                    className={`px-1.5 py-px rounded text-[8px] font-black tracking-tight transition-all ${
                                                        item.isCompleted
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                                                            : item.isPassed
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                                                : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                                    }`}
                                                >
                                                    {item.isCompleted
                                                        ? '완료'
                                                        : item.isPassed
                                                            ? ((item as any).manualPass && Math.max(...(item.scores || [0])) < 80 ? 'PASS' : (item.type === 'workbook' ? 'PASS' : '완료'))
                                                            : '미완료'}
                                                </button>
                                                {/* Admin: Analysis Print */}
                                                {userRole === 'admin' && item.type === 'analysis' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); window.open(`/analysis-print/${item.assignmentId}?studentId=${group.studentId}&mode=detail`, '_blank'); }}
                                                        className="text-[8px] font-bold text-teal-600 bg-teal-50 px-1.5 py-px rounded border border-teal-100 hover:bg-teal-100 transition-colors"
                                                    >
                                                        🖨️
                                                    </button>
                                                )}
                                                {/* Admin: Manual Pass for structure */}
                                                {userRole === 'admin' && item.type === 'structure' && !item.isPassed && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onManualPass(item.id, false); }}
                                                        className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-px rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        ✔P
                                                    </button>
                                                )}
                                                {userRole === 'admin' && item.isPassed && (item as any).manualPass && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onManualPass(item.id, true); }}
                                                        className="text-[8px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                )}
                                            </div>
                                            {userRole === 'admin' && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onReset(group.studentId, item.assignmentId, item.assignmentTitle || '[과제 제목 없음]'); }}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                                                        title="기록 초기화"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">지정한 기간 동안 학습 내역이 없습니다.</p>
                        </div>
                    )}
                </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
