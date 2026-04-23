'use client';

import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Workbook } from '@/types';
import ChapterManager from './ChapterManager';

export default function WorkbookManager() {
    const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(null);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newWorkbookTitle, setNewWorkbookTitle] = useState('');
    const [newWorkbookType, setNewWorkbookType] = useState<Workbook['type']>('exam');

    useEffect(() => {
        loadWorkbooks();
    }, []);

    const loadWorkbooks = async () => {
        setIsLoading(true);
        const data = await dbService.getWorkbooks();
        setWorkbooks(data);
        setIsLoading(false);
    };

    const handleCreateWorkbook = async () => {
        if (!newWorkbookTitle.trim()) return;

        await dbService.addWorkbook({
            title: newWorkbookTitle,
            type: newWorkbookType,
            createdAt: Date.now(),
            description: ''
        });

        setNewWorkbookTitle('');
        setIsCreateModalOpen(false);
        loadWorkbooks();
    };

    if (selectedWorkbook) {
        return (
            <ChapterManager
                workbook={selectedWorkbook}
                onBack={() => setSelectedWorkbook(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">교재 (Library)</h2>
                    <p className="text-slate-500">학생들에게 배부할 교재와 학습자료를 관리합니다.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4d75] transition shadow-lg shadow-[#1e3a5f]/10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>새 교재 만들기</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {workbooks.map(book => (
                        <div key={book.id} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#1e3a5f]/40 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 bg-white/80 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('정말 삭제하시겠습니까?')) {
                                            dbService.deleteWorkbook(book.id).then(loadWorkbooks);
                                        }
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                                    ${book.type === 'exam' ? 'bg-blue-100 text-blue-600' :
                                        book.type === 'voca' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}
                                `}>
                                    {book.type === 'exam' ? '📋' : book.type === 'voca' ? '📝' : '📚'}
                                </div>
                                <div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block
                                        ${book.type === 'exam' ? 'bg-blue-50 text-blue-600' :
                                            book.type === 'voca' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}
                                    `}>
                                        {book.type === 'exam' ? '모의고사/시험' : book.type === 'voca' ? '수어집' : '교과서'}
                                    </span>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-[#1e3a5f] transition-colors">
                                        {book.title}
                                    </h3>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {new Date(book.createdAt).toLocaleDateString()} 생성
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-slate-500 text-sm">
                                <span>관리모드</span>
                                <button
                                    onClick={() => setSelectedWorkbook(book)}
                                    className="flex items-center gap-1 hover:translate-x-1 transition-transform text-[#1e3a5f] font-bold"
                                >
                                    보기
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add Button Card */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-2xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-all min-h-[180px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="font-bold">새 교재 추가</span>
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">새 교재 만들기</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">교재 이름</label>
                                <input
                                    type="text"
                                    value={newWorkbookTitle}
                                    onChange={(e) => setNewWorkbookTitle(e.target.value)}
                                    placeholder="예: 2026년 3월 고1 모의고사"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] font-bold text-slate-800"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">유형</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setNewWorkbookType('exam')}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${newWorkbookType === 'exam'
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                                            : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        📋 모의고사
                                    </button>
                                    <button
                                        onClick={() => setNewWorkbookType('textbook')}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${newWorkbookType === 'textbook'
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                                            : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        📚 교과서
                                    </button>
                                    <button
                                        onClick={() => setNewWorkbookType('voca')}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${newWorkbookType === 'voca'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1'
                                            : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        📝 수어집
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-8">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateWorkbook}
                                disabled={!newWorkbookTitle.trim()}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1e3a5f] hover:bg-[#2a4d75] transition-colors disabled:opacity-50"
                            >
                                만들기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
