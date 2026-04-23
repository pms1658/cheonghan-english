'use client';

import React, { useEffect, useState } from 'react';
import { dbService, Feedback } from '@/services/db';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFeedbacks = async () => {
        const list = await dbService.getFeedbacks();
        setFeedbacks(list);
        setLoading(false);
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="mb-12">
                <h1 className="text-3xl font-black text-slate-900 mb-2">Feedback Management</h1>
                <p className="text-slate-500">학생들의 피드백을 확인하고 관리합니다.</p>
            </div>

            {loading ? (
                <LoadingSpinner message="피드백 로딩 중..." variant="skeleton" />
            ) : feedbacks.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-slate-400 font-medium">등록된 피드백이 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {feedbacks.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                                            {item.studentName[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{item.studentName}</div>
                                            <div className="text-xs text-slate-400">Student</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded-full">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 mb-4 min-h-[100px] text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {item.content}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                        Mark as Read
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
