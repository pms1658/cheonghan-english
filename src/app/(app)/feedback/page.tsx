'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dbService, Feedback } from '@/services/db';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';

export default function FeedbackPage() {
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadFeedbacks = async () => {
        const list = await dbService.getFeedbacks();
        setFeedbacks(list);
        setLoading(false);
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setIsSubmitting(true);
        try {
            await dbService.addFeedback({
                studentId: (user as any).id,
                studentName: (user as any).name,
                content: content,
                createdAt: Date.now(),
                status: 'pending'
            });
            setContent('');
            await loadFeedbacks();
        } catch (error) {
            console.error("Feedback error:", error);
            toast.error("피드백 등록에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
            {/* Header */}
            <div className="mb-12 text-center md:text-left">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-2 block">Connect & Improve</span>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">Feedback Board.</h1>
                    <p className="text-slate-500 dark:text-slate-400 md:text-lg">
                        함께 더 좋은 학습 환경을 만들어가요.<br className="md:hidden" /> 자유롭게 의견을 남겨주세요.
                    </p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {/* Left: Input Form */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-1"
                >
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/10 sticky top-8">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                            의견 보내기
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Message</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="불편한 점이나 바라는 점이 있나요?"
                                    className="w-full h-40 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-slate-700 placeholder-slate-400 text-sm leading-relaxed"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !content.trim()}
                                className="w-full py-4 bg-[#0A0E27] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#1a1f4b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>등록하기</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* Right: List (Bulletin Board Style) */}
                <div className="md:col-span-2 space-y-6">
                    {loading ? (
                        <LoadingSpinner message="로딩 중..." variant="skeleton" />
                    ) : feedbacks.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                            <div className="text-4xl mb-4">💬</div>
                            <p className="text-slate-400 font-medium">아직 등록된 의견이 없습니다.</p>
                            <p className="text-slate-400 text-sm mt-1">첫 번째 의견을 남겨보세요!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {feedbacks.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                                                    {item.studentName[0]}
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white text-sm">{item.studentName}</span>
                                                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Student</span>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-10">
                                            {item.content}
                                        </p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
