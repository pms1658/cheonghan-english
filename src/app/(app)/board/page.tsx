'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/services/db';
import { Post } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function BoardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = (user as any)?.role === 'admin';
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);

    // Detail View State
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await dbService.getPosts('notice');
            setPosts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await dbService.deletePost(id);
            loadPosts();
        } catch (error) {
            console.error(error);
            toast.error('삭제 실패');
        }
    };

    // if (loading) return <LoadingSpinner variant="skeleton" />;

    return (
        <div className="pb-24 md:pb-12 font-sans px-6 md:px-8">
            <div className="max-w-4xl mx-auto pt-12 md:pt-16">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 flex flex-col items-center text-center md:text-left md:flex-row md:items-end justify-between"
                >
                    <div>
                        <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-2 block">Updates & News</span>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2">Notice Board.</h1>
                        <p className="text-slate-500 dark:text-slate-400 md:text-lg">
                            학원의 새로운 소식과 중요한 알림을 확인하세요.
                        </p>
                    </div>

                    {isAdmin && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/board/write')}
                            className="bg-[#0A0E27] text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-slate-200 hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>작성하기</span>
                        </motion.button>
                    )}
                </motion.div>

                {/* Post List */}
                <div className="space-y-6">
                    {loading ? <LoadingSpinner variant="skeleton" /> : posts.length === 0 ? (
                        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 shadow-sm">
                            <div className="text-5xl mb-6 opacity-20">📢</div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">아직 공지사항이 없습니다.</h3>
                            <p className="text-slate-400 dark:text-slate-500">새로운 소식이 등록되면 여기서 확인할 수 있어요.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {posts.map((post, idx) => {
                                const isExpanded = expandedPostId === post.id;
                                const date = new Date(post.createdAt).toLocaleDateString();

                                return (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        layout
                                        onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                                        className={`bg-white dark:bg-slate-800 rounded-[2rem] border transition-all duration-500 overflow-hidden cursor-pointer group
                                            ${isExpanded
                                                ? 'border-blue-100 dark:border-blue-500/30 shadow-2xl shadow-blue-900/10 ring-1 ring-blue-500/10'
                                                : 'border-slate-100 dark:border-white/10 shadow-sm hover:shadow-lg hover:border-slate-200 dark:hover:border-white/20'
                                            }
                                        `}
                                    >
                                        <div className="p-8">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                            ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'}
                                                            transition-colors duration-300
                                                        `}>
                                                            Notice
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">{date}</span>
                                                    </div>
                                                    <h3 className={`text-xl md:text-2xl font-bold transition-colors duration-300 ${isExpanded ? 'text-blue-900 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                                                        {post.title}
                                                    </h3>
                                                </div>

                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500
                                                    ${isExpanded
                                                        ? 'bg-blue-600 border-blue-600 text-white rotate-180'
                                                        : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-white/10 text-slate-300 dark:text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500'
                                                    }
                                                `}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <div className="mt-8 pt-8 border-t border-slate-100">
                                                            <div className="prose prose-lg max-w-none text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                                <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                                                            </div>

                                                            {isAdmin && (
                                                                <div className="mt-10 flex justify-end">
                                                                    <button
                                                                        onClick={(e) => handleDeletePost(post.id, e)}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                        게시물 삭제
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
