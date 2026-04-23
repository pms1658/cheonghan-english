import React from 'react';
import { Assignment } from '@/types';
import Link from 'next/link';

interface WorkbookDetailProps {
    category: string;
    assignments: (Assignment & { status: string })[];
    onBack: () => void;
}

export default function WorkbookDetail({ category, assignments, onBack }: WorkbookDetailProps) {
    // Sort by Title or CreatedAt? Usually Title for chapters (Day 01, Day 02...)
    const sortedAssignments = [...assignments].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all bg-white/50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">{category}</h2>
                    <p className="text-slate-500 font-medium">총 {assignments.length}개의 학습이 포함되어 있습니다.</p>
                </div>
            </div>

            <div className="space-y-3">
                {sortedAssignments.map((assignment, idx) => (
                    <Link
                        href={`/student/assignment/${assignment.id}`}
                        key={assignment.id}
                        className="block bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                                    ${assignment.status === 'completed'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                                `}>
                                    {assignment.status === 'completed' ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{assignment.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${assignment.type === 'vocabulary'
                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                : assignment.type === 'structure'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {assignment.type === 'vocabulary' ? '단어' : '구조'}
                                        </span>
                                        <span className="text-xs text-slate-400 max-w-[200px] truncate">{assignment.deadline} 까지</span>
                                    </div>
                                </div>
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
