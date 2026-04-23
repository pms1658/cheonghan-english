import React from 'react';
import { Assignment } from '@/types';

interface WorkbookListProps {
    assignments: (Assignment & { status: string })[];
    onSelectCategory: (category: string) => void;
}

export default function WorkbookList({ assignments, onSelectCategory }: WorkbookListProps) {
    // Group by Category
    const categories = Array.from(new Set(assignments.map(a => a.category || '기타'))).sort((a, b) => {
        if (a.includes('구조') || a.includes('Structure')) return -1;
        if (b.includes('구조') || b.includes('Structure')) return 1;
        return a.localeCompare(b);
    });

    // Calculate stats per category
    const workbookStats = categories.map(cat => {
        const catAssignments = assignments.filter(a => (a.category || '기타') === cat);
        const total = catAssignments.length;
        const completed = catAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length;
        const progress = Math.round((completed / total) * 100);
        return { category: cat, total, completed, progress };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <span className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/40"></span>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">나의 워크북 ({categories.length})</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workbookStats.map((stat) => (
                    <div
                        key={stat.category}
                        onClick={() => onSelectCategory(stat.category)}
                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>

                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            </div>

                            <h4 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{stat.category}</h4>
                            <p className="text-sm text-slate-500 font-medium mb-4">{stat.total}개의 챕터</p>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">진행률</span>
                                    <span className="text-indigo-600">{stat.progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                        style={{ width: `${stat.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
