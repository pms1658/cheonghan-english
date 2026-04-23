'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/services/db';
import RichTextEditor from '@/components/common/RichTextEditor';
import { toast } from 'sonner';

export default function BoardWritePage() {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = (user as any)?.role === 'admin';

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Redirect non-admins
    if (user && !isAdmin) {
        router.push('/board');
        return null;
    }

    const handleCreatePost = async () => {
        if (!title.trim() || !content.trim()) return toast.warning('제목과 내용을 입력해주세요.');
        if (!confirm('공지사항을 등록하시겠습니까?')) return;

        try {
            setSubmitting(true);
            await dbService.addPost({
                type: 'notice',
                title,
                content, // This now contains HTML
                isVisible: true
            });
            toast("등록되었습니다.");
            router.push('/board');
        } catch (e) {
            console.error(e);
            toast.error("등록 실패");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-50 pb-24 lg:pb-8">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">공지사항 작성</h1>
                </div>
                <button
                    onClick={handleCreatePost}
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                >
                    {submitting ? '저장 중...' : '완료'}
                </button>
            </div>

            {/* Editor Container */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 text-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:border-blue-500 outline-none transition-colors"
                        placeholder="제목을 입력하세요"
                    />
                </div>

                <div className="editor-container">
                    <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="내용을 자유롭게 작성하세요..."
                        className="min-h-[500px] shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}
