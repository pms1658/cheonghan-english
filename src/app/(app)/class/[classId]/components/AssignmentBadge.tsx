'use client';

import React from 'react';

// Jewel-like Badge Component
export const Badge = ({ type }: { type: string }) => {
    let borderClass = '';
    let bgClass = '';
    let label = '';

    switch (type) {
        case 'structure':
            borderClass = 'border-l-[3px] border-blue-600';
            bgClass = 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/30 dark:to-slate-800 text-blue-900 dark:text-blue-300';
            label = '구조독해';
            break;
        case 'vocabulary':
            borderClass = 'border-l-[3px] border-green-500';
            bgClass = 'bg-gradient-to-r from-green-50 to-white dark:from-green-900/30 dark:to-slate-800 text-green-900 dark:text-green-300';
            label = '단어학습';
            break;
        case 'selection':
            borderClass = 'border-l-[3px] border-yellow-500';
            bgClass = 'bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/30 dark:to-slate-800 text-yellow-900 dark:text-yellow-300';
            label = '단어선택';
            break;
        case 'transform':
            borderClass = 'border-l-[3px] border-violet-600';
            bgClass = 'bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/30 dark:to-slate-800 text-violet-900 dark:text-violet-300';
            label = '변형객관';
            break;
        case 'writing':
            borderClass = 'border-l-[3px] border-pink-500';
            bgClass = 'bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/30 dark:to-slate-800 text-pink-900 dark:text-pink-300';
            label = '구조작문';
            break;
        case 'transform_subjective':
            borderClass = 'border-l-[3px] border-[#0A0E27]';
            bgClass = 'bg-gradient-to-r from-[#0A0E27]/10 to-white dark:from-[#0A0E27]/30 dark:to-slate-800 text-[#0A0E27] dark:text-blue-300';
            label = '변형주관';
            break;
        case 'analysis':
            borderClass = 'border-l-[3px] border-sky-500';
            bgClass = 'bg-gradient-to-r from-sky-50 to-white dark:from-sky-900/30 dark:to-slate-800 text-sky-900 dark:text-sky-300';
            label = '본문분석';
            break;
        case 'workbook':
            borderClass = 'border-l-[3px] border-purple-500';
            bgClass = 'bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/30 dark:to-slate-800 text-purple-900 dark:text-purple-300';
            label = '워크북';
            break;
        case 'listening_set':
            borderClass = 'border-l-[3px] border-teal-500';
            bgClass = 'bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/30 dark:to-slate-800 text-teal-900 dark:text-teal-300';
            label = '🎧듣기';
            break;
        case 'sentence_order':
            borderClass = 'border-l-[3px] border-amber-700';
            bgClass = 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/30 dark:to-slate-800 text-amber-900 dark:text-amber-300';
            label = '세부순서';
            break;
        default:
            borderClass = 'border-l-[3px] border-slate-500';
            bgClass = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-300';
            label = type;
    }

    return (
        <span className={`
            relative px-1.5 py-0.5 text-[9px] font-black shrink-0 tracking-tighter
            ${borderClass}
            ${bgClass} shadow-sm rounded-r-md rounded-l-[1px]
        `}>
            {label}
        </span>
    );
};

// Personal Status Badge for Student View
export const StudentStatusBadge = ({ assignment, submissions, userId, allAssignmentsRaw }: {
    assignment: any,
    submissions: any[],
    userId: string,
    allAssignmentsRaw: any[]
}) => {
    const mySubs = submissions.filter((s: any) => s.assignmentId === assignment.id && s.studentId === userId);
    const latest = mySubs.sort((a: any, b: any) => (a.attemptNumber || 0) - (b.attemptNumber || 0)).at(-1);

    let statusText = '학습 전';
    let statusColor = 'bg-slate-100 text-slate-500 border-slate-200';

    if (mySubs.length > 0) {
        if (assignment.type === 'structure') {
            const maxScore = Math.max(...mySubs.map((s: any) => s.score || 0));
            const attempts = mySubs.length;
            const guidanceCompleted = latest?.guidanceCompleted === true;
            const hasManualPass = mySubs.some((s: any) => s.manualPass === true);

            if (maxScore >= 80 || hasManualPass) {
                const completionCount = mySubs.filter((s: any) => (s.score || 0) >= 80 || s.manualPass === true).length;
                statusText = completionCount >= 2 ? `${completionCount}회완료` : '학습완료';
                statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
            } else if (attempts >= 3 && !guidanceCompleted) {
                statusText = '지도 필요';
                statusColor = 'bg-red-100 text-red-600 border-red-200 animate-pulse';
            } else if (attempts >= 3 && guidanceCompleted) {
                statusText = '지도 완료';
                statusColor = 'bg-green-100 text-green-700 border-green-200';
            } else {
                statusText = '학습 중';
                statusColor = 'bg-yellow-50 text-yellow-600 border-yellow-200';
            }
        } else if (assignment.type === 'selection') {
            const hasApproved = mySubs.some((s: any) => s.status === 'approved');
            const hasPendingReview = mySubs.some((s: any) => s.status === 'pending_review');

            if (hasApproved) {
                const childAssignments = allAssignmentsRaw.filter(
                    (a: any) => a.parentAssignmentId === assignment.id && a.parentStudentId === userId
                );
                if (childAssignments.length > 0) {
                    const allChildrenDone = childAssignments.every((c: any) => {
                        const cSubs = submissions.filter((s: any) => s.assignmentId === c.id && s.studentId === userId);
                        return cSubs.some((s: any) => s.score >= 100);
                    });
                    if (allChildrenDone) {
                        // Count total completions across all children
                        let totalCompletions = 0;
                        childAssignments.forEach((c: any) => {
                            const cSubs = submissions.filter((s: any) => s.assignmentId === c.id && s.studentId === userId);
                            totalCompletions += cSubs.filter((s: any) => s.score >= 100).length;
                        });
                        const avgCompletions = Math.floor(totalCompletions / childAssignments.length);
                        statusText = avgCompletions >= 2 ? `${avgCompletions}회완료` : '학습완료';
                        statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
                    } else {
                        // Check if any child has study submissions
                        const anyChildStarted = childAssignments.some((c: any) => {
                            const cSubs = submissions.filter((s: any) => s.assignmentId === c.id && s.studentId === userId);
                            return cSubs.some((s: any) => s.score >= 0 && s.status !== 'pending_review' && s.status !== 'approved' && s.status !== 'selection_rejected');
                        });
                        if (anyChildStarted) {
                            statusText = '학습 중';
                            statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
                        } else {
                            statusText = '승인 완료';
                            statusColor = 'bg-green-100 text-green-700 border-green-200';
                        }
                    }
                } else {
                    // No child assignments — check if there are test submissions directly on this assignment
                    const studySubs = mySubs.filter((s: any) => s.status !== 'pending_review' && s.status !== 'approved' && s.status !== 'selection_rejected' && s.attempt > 0);
                    if (studySubs.some((s: any) => s.score >= 100)) {
                        const completionCount = studySubs.filter((s: any) => s.score >= 100).length;
                        statusText = completionCount >= 2 ? `${completionCount}회완료` : '학습완료';
                        statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
                    } else if (studySubs.length > 0) {
                        statusText = '학습 중';
                        statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
                    } else {
                        statusText = '승인 완료';
                        statusColor = 'bg-green-100 text-green-700 border-green-200';
                    }
                }
            } else if (hasPendingReview) {
                statusText = '승인 대기';
                statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
            } else {
                statusText = '학습 중';
                statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
            }
        } else if (assignment.type === 'transform' || (assignment as any).type === 'variant_session' || assignment.type === 'transform_subjective') {
            const maxScore = Math.max(...mySubs.map((s: any) => s.score || 0));
            if (maxScore >= 80) {
                const completionCount = mySubs.filter((s: any) => (s.score || 0) >= 80).length;
                statusText = completionCount >= 2 ? `${completionCount}회완료` : '학습완료';
                statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
            } else {
                statusText = '학습 중';
                statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
            }
        } else {
            const validSubs = mySubs.filter((s: any) => s.score >= 0);
            const maxScore = validSubs.length > 0 ? Math.max(...validSubs.map((s: any) => s.score || 0)) : 0;
            if (maxScore >= 100) {
                const completionCount = validSubs.filter((s: any) => (s.score || 0) >= 100).length;
                statusText = completionCount >= 2 ? `${completionCount}회완료` : '학습완료';
                statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
            } else {
                statusText = '학습 중';
                statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
            }
        }
    }

    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold whitespace-nowrap ${statusColor}`}>
            {statusText}
        </span>
    );
};
