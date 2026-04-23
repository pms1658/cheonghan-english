'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbService, Class, Student } from '@/services/db';
import { Chapter, Workbook, Word } from '@/types';
import { toast } from 'sonner';

interface ChapterManagerProps {
    workbook: Workbook;
    onBack: () => void;
}

export default function ChapterManager({ workbook, onBack }: ChapterManagerProps) {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Dispatcher State
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [dispatchTarget, setDispatchTarget] = useState<'class' | 'student'>('class');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [dispatchDeadline, setDispatchDeadline] = useState('');

    // Editing State (Content)
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');

    const loadDispatchData = useCallback(async () => {
        const [cls, std] = await Promise.all([
            dbService.getClasses(),
            dbService.getStudents()
        ]);
        setClasses(cls);
        setStudents(std);
    }, []);

    const loadChapters = useCallback(async () => {
        setIsLoading(true);
        const data = await dbService.getChapters(workbook.id);
        setChapters(data);
        setIsLoading(false);
    }, [workbook.id]);

    useEffect(() => {
        loadChapters();
        loadDispatchData();
    }, [loadChapters, loadDispatchData]);

    const handleCreateChapter = async () => {
        if (!editTitle.trim()) return;

        // Simple sentence parsing logic
        const sentences = editContent
            .replace(/\n/g, ' ')
            .replace(/([.?!]['"]?)\s+/g, '$1|SPLIT|')
            .split('|SPLIT|')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const newChapter: Omit<Chapter, 'id'> = {
            workbookId: workbook.id,
            title: editTitle,
            content: editContent,
            sentences: sentences,
            order: chapters.length + 1, // Append to end
            words: [] // Should extract words separate
        };

        if (editingChapter) {
            await dbService.updateChapter(editingChapter.id, {
                title: editTitle,
                content: editContent,
                sentences: sentences
            });
        } else {
            await dbService.addChapter(newChapter);
        }

        setEditingChapter(null);
        setEditTitle('');
        setEditContent('');
        setIsCreateModalOpen(false);
        loadChapters();
    };

    const openEdit = (chapter: Chapter) => {
        setEditingChapter(chapter);
        setEditTitle(chapter.title);
        setEditContent(chapter.content || '');
        setIsCreateModalOpen(true);
    };

    const handleDispatch = async () => {
        if (selectedChapterIds.length === 0) return toast.warning("배부할 챕터를 선택해주세요.");
        if (dispatchTarget === 'class' && selectedClassIds.length === 0) return toast.warning("배부할 반을 선택해주세요.");
        if (dispatchTarget === 'student' && selectedStudentIds.length === 0) return toast.warning("배부할 학생을 선택해주세요.");

        if (!confirm(`${selectedChapterIds.length}개의 챕터를 선택한 대상에게 배부하시겠습니까?`)) return;

        // Create Assignment for EACH selected chapter
        for (const chapId of selectedChapterIds) {
            const chap = chapters.find(c => c.id === chapId);
            if (!chap) continue;

            // Common Assignment Data
            const assignmentData = {
                title: chap.title,
                content: chap.content,
                sentences: chap.sentences || [],
                words: chap.words || [],
                deadline: dispatchDeadline,
                status: 'assigned' as const,
                workbookId: workbook.id,
                chapterId: chap.id,
                yearMonth: new Date().toISOString().slice(0, 7), // 2024-03
                category: 'sat' as 'sat' | 'midterm',
                type: 'structure' as 'vocabulary' | 'structure' | 'writing' | 'selection' | 'transform',
                createdAt: Date.now()
            };

            await dbService.addAssignment({
                ...assignmentData,
                classIds: dispatchTarget === 'class' ? selectedClassIds : [],
                studentIds: dispatchTarget === 'student' ? selectedStudentIds : [],
                // Legacy: Pick first classId if exists
                classId: (dispatchTarget === 'class' && selectedClassIds.length > 0) ? selectedClassIds[0] : undefined
            });
        }

        toast.success("배부가 완료되었습니다.");
        setIsDispatchModalOpen(false);
        setSelectedChapterIds([]);
    };

    const handleDelete = async (id: string) => {
        if (confirm('정말 이 챕터를 삭제하시겠습니까?')) {
            await dbService.deleteChapter(id);
            loadChapters();
        }
    };

    const toggleChapterSelection = (id: string) => {
        setSelectedChapterIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div>
                    {/* ... (Existing Title) ... */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${workbook.type === 'exam' ? 'bg-blue-100 text-blue-600' : 'bg-blue-100 text-blue-600'}`}>
                            {workbook.type.toUpperCase()}
                        </span>
                        <span>Library</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{workbook.title}</h2>
                </div>
                <div className="ml-auto flex gap-2">
                    {selectedChapterIds.length > 0 && (
                        <button
                            onClick={() => setIsDispatchModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shadow-lg animate-fade-in"
                        >
                            <span>{selectedChapterIds.length}개 배부하기</span>
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingChapter(null);
                            setEditTitle('');
                            setEditContent('');
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4d75] transition shadow-lg shadow-[#1e3a5f]/10"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        <span>챕터 추가</span>
                    </button>
                </div>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    {chapters.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 mb-4">아직 등록된 챕터가 없습니다.</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-bold"
                            >
                                새 챕터 만들기
                            </button>
                        </div>
                    )}

                    {chapters.map((chapter, idx) => (
                        <div key={chapter.id}
                            className={`bg-white rounded-xl border p-4 flex items-center justify-between group transition-all cursor-pointer
                             ${selectedChapterIds.includes(chapter.id) ? 'border-[#1e3a5f] ring-1 ring-[#1e3a5f] bg-[#1e3a5f]/10/10' : 'border-slate-200 hover:border-[#1e3a5f]/40'}
                             `}
                            onClick={() => toggleChapterSelection(chapter.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedChapterIds.includes(chapter.id)}
                                        onChange={() => toggleChapterSelection(chapter.id)}
                                        className="w-5 h-5 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">{chapter.title}</h4>
                                    <p className="text-xs text-slate-400 line-clamp-1 max-w-md">
                                        {chapter.content || '내용 없음'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(chapter); }}
                                    className="p-2 text-slate-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg transition-colors"
                                >
                                    편집
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(chapter.id); }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dispatch Modal */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">학습지 배부 (Assign)</h3>

                        <div className="space-y-4 mb-6">
                            {/* Target Type */}
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setDispatchTarget('class')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dispatchTarget === 'class' ? 'bg-white shadow text-[#1e3a5f]' : 'text-slate-500'}`}
                                >
                                    반별 배부
                                </button>
                                <button
                                    onClick={() => setDispatchTarget('student')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${dispatchTarget === 'student' ? 'bg-white shadow text-[#1e3a5f]' : 'text-slate-500'}`}
                                >
                                    개별 배부
                                </button>
                            </div>

                            {/* Target Selection */}
                            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2">
                                {dispatchTarget === 'class' ? (
                                    classes.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedClassIds.includes(cls.id)}
                                                onChange={() => {
                                                    setSelectedClassIds(prev => prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id]);
                                                }}
                                                className="w-5 h-5 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                                            />
                                            <span className="font-bold text-slate-700">{cls.name}</span>
                                        </label>
                                    ))
                                ) : (
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="학생 이름 검색..."
                                            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                                            onChange={(e) => {
                                                // Implement search if list is long
                                            }}
                                        />
                                        {students.map(std => (
                                            <label key={std.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(std.id)}
                                                    onChange={() => {
                                                        setSelectedStudentIds(prev => prev.includes(std.id) ? prev.filter(id => id !== std.id) : [...prev, std.id]);
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                                                />
                                                <div>
                                                    <div className="font-bold text-slate-700">{std.name}</div>
                                                    <div className="text-xs text-slate-400">{classes.find(c => c.id === std.classIds?.[0])?.name || '미배정'}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">마감일</label>
                                <input
                                    type="date"
                                    value={dispatchDeadline}
                                    onChange={(e) => setDispatchDeadline(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsDispatchModalOpen(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDispatch}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1e3a5f] hover:bg-[#2a4d75] transition-colors"
                            >
                                배부하기
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Create/Edit Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingChapter ? '챕터 편집' : '새 챕터 추가'}
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">챕터 제목</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="예: 18번 글의 목적"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] font-bold text-slate-800"
                                />
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-bold text-slate-600 mb-1">지문 내용</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="지문 내용을 붙여넣으세요..."
                                    className="w-full flex-1 min-h-[300px] p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-slate-700 leading-relaxed resize-none font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateChapter}
                                disabled={!editTitle.trim()}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1e3a5f] hover:bg-[#2a4d75] transition-colors disabled:opacity-50"
                            >
                                {editingChapter ? '수정 완료' : '추가하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
