'use client';

import React from 'react';

/** Base shimmer block — a single pulsing rectangle */
export function SkeletonBlock({ className = '' }: { className?: string }) {
    return (
        <div className={`skeleton-shimmer rounded-lg ${className}`} />
    );
}

/** Mimics a single assignment card in the class room */
export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 sm:gap-4 py-2 px-3 sm:px-4">
                {/* Admin Checkbox Space (Optional, subtle gap) */}
                <div className="w-0 sm:w-6 hidden md:block"></div>

                {/* Badge Skeleton */}
                <div className="w-[50px] sm:w-[70px] flex justify-center flex-shrink-0">
                    <SkeletonBlock className="w-10 h-5 sm:w-12 sm:h-6 rounded bg-slate-200/50 dark:bg-white/5" />
                </div>
                
                {/* Title & Info Skeleton */}
                <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-3">
                        <SkeletonBlock className="w-32 sm:w-56 h-4 sm:h-5 rounded bg-slate-200/50 dark:bg-white/5" />
                        <SkeletonBlock className="w-16 h-3 rounded bg-slate-200/50 dark:bg-white/5 hidden sm:block" />
                    </div>
                    {/* Stats & Status Badge Skeleton */}
                    <div className="flex items-center gap-4 border-l border-transparent">
                        <SkeletonBlock className="w-32 h-4 rounded-md hidden sm:block mr-4 bg-slate-200/50 dark:bg-white/5" />
                        <SkeletonBlock className="w-14 sm:w-16 h-6 rounded-full bg-slate-200/50 dark:bg-white/5" />
                        <SkeletonBlock className="w-5 h-5 rounded-full bg-slate-200/50 dark:bg-white/5 hidden sm:block" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Full assignment list skeleton (3 cards) */
export function SkeletonAssignmentList() {
    return (
        <div className="space-y-4 animate-fadeIn">
            {[0, 1, 2].map(i => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

/** Homework widget skeleton (dashboard) */
export function SkeletonHomeworkWidget() {
    return (
        <div className="bg-white dark:bg-[#0c102b] rounded-2xl border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SkeletonBlock className="w-1.5 h-1.5 rounded-full" />
                    <SkeletonBlock className="w-24 h-5" />
                </div>
                <SkeletonBlock className="w-14 h-4" />
            </div>
            {/* Items */}
            <div className="space-y-3">
                {[0, 1, 2].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <SkeletonBlock className="w-12 h-4 rounded-md" />
                            <SkeletonBlock className="w-32 h-4" />
                        </div>
                        <div className="pl-4 space-y-1.5">
                            <SkeletonBlock className="w-3/4 h-3" />
                            <SkeletonBlock className="w-1/2 h-3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** History page skeleton — mimics student accordion rows */
export function SkeletonHistoryList() {
    return (
        <div className="space-y-4 animate-fadeIn">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-2.5">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <SkeletonBlock className="w-8 h-8 rounded-full" />
                            <div className="space-y-1.5">
                                {/* Name + username */}
                                <div className="flex items-center gap-2">
                                    <SkeletonBlock className="w-16 h-4 rounded" />
                                    <SkeletonBlock className="w-12 h-3 rounded" />
                                </div>
                                {/* Last active */}
                                <SkeletonBlock className="w-24 h-2.5 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <SkeletonBlock className="w-20 h-6 rounded-lg hidden lg:block" />
                            <SkeletonBlock className="w-20 h-6 rounded-lg hidden lg:block" />
                            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-100">
                                <div className="flex flex-col items-center gap-1">
                                    <SkeletonBlock className="w-14 h-2.5 rounded" />
                                    <SkeletonBlock className="w-6 h-4 rounded" />
                                </div>
                            </div>
                            <SkeletonBlock className="w-6 h-6 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Modal list skeleton — mimics student/assignment list inside a modal */
export function SkeletonModalList({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-2 animate-fadeIn py-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                    <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <SkeletonBlock className="w-24 h-4 rounded" />
                        <SkeletonBlock className="w-16 h-3 rounded" />
                    </div>
                    <SkeletonBlock className="w-4 h-4 rounded" />
                </div>
            ))}
        </div>
    );
}

/** Report list skeleton — mimics report card rows */
export function SkeletonReportList() {
    return (
        <div className="space-y-3 animate-fadeIn">
            {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <SkeletonBlock className="w-14 h-14 rounded-2xl" />
                            <div className="space-y-2">
                                <SkeletonBlock className="w-28 h-5 rounded" />
                                <div className="flex items-center gap-3">
                                    <SkeletonBlock className="w-12 h-3 rounded" />
                                    <SkeletonBlock className="w-12 h-3 rounded" />
                                    <SkeletonBlock className="w-12 h-3 rounded" />
                                </div>
                            </div>
                        </div>
                        <SkeletonBlock className="w-5 h-5 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Full-page centered skeleton — replaces logo bounce for assignment/page loading */
export function SkeletonFullPage({ message }: { message?: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
            <div className="w-full max-w-md px-8 space-y-6">
                {/* Fake header bar */}
                <div className="flex items-center gap-3">
                    <SkeletonBlock className="w-16 h-6 rounded-lg" />
                    <SkeletonBlock className="w-40 h-5 rounded" />
                </div>
                {/* Fake content blocks */}
                <div className="space-y-3">
                    <SkeletonBlock className="w-full h-32 rounded-2xl" />
                    <SkeletonBlock className="w-full h-20 rounded-2xl" />
                    <SkeletonBlock className="w-3/4 h-12 rounded-xl" />
                </div>
                {/* Fake button row */}
                <div className="flex justify-center gap-3 pt-2">
                    <SkeletonBlock className="w-24 h-10 rounded-xl" />
                    <SkeletonBlock className="w-24 h-10 rounded-xl" />
                </div>
            </div>
            {message && (
                <p className="mt-6 text-slate-400 text-xs font-bold animate-pulse">{message}</p>
            )}
        </div>
    );
}

/** Print-page skeleton — for worksheet/analysis print loading */
export function SkeletonPrintPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white animate-fadeIn">
            <div className="w-full max-w-[210mm] px-8 space-y-6">
                {/* Header mimicry */}
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <SkeletonBlock className="w-12 h-12 rounded-xl" />
                        <div className="space-y-2">
                            <SkeletonBlock className="w-48 h-5 rounded" />
                            <SkeletonBlock className="w-32 h-3 rounded" />
                        </div>
                    </div>
                    <SkeletonBlock className="w-24 h-4 rounded" />
                </div>
                {/* Sentence rows */}
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-2 py-3 border-b border-slate-50">
                        <div className="flex gap-3 items-start">
                            <SkeletonBlock className="w-5 h-5 rounded flex-shrink-0" />
                            <SkeletonBlock className="w-full h-4 rounded" />
                        </div>
                        <div className="flex gap-3 items-start ml-8">
                            <SkeletonBlock className="w-full h-10 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
