'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dbService, Student } from '@/services/db';
import { toast } from 'sonner';

export default function StudentManagement() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newStudent, setNewStudent] = useState<{ id: string, name: string, classIds: string[], groupName: string }>({ id: '', name: '', classIds: [], groupName: '' });
    const [selectedGroup, setSelectedGroup] = useState<string>('all');

    const [editingDocId, setEditingDocId] = useState<string | null>(null);

    // Filter & Sort State
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Student, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [studentData, classData] = await Promise.all([
            dbService.getStudents(),
            dbService.getClasses()
        ]);
        setStudents(studentData);
        setClasses(classData);
    };

    const loadStudents = async () => {
        const data = await dbService.getStudents();
        setStudents(data);
    };

    const handleSort = (key: keyof Student) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getFilteredAndSortedStudents = () => {
        let filtered = students;

        // Class filter
        if (selectedClass !== 'all') {
            filtered = filtered.filter(s => s.classIds.includes(selectedClass));
        }

        // Group filter
        if (selectedGroup !== 'all') {
            filtered = filtered.filter(s => (s.groupName || '') === selectedGroup);
        }

        // Search filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                s.id.toLowerCase().includes(lower)
            );
        }

        // Sort
        if (sortConfig) {
            const { key, direction } = sortConfig;
            filtered = [...filtered].sort((a, b) => {
                const valA = a[key] ?? '';
                const valB = b[key] ?? '';
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    };

    const displayStudents = getFilteredAndSortedStudents();

    // All unique group names (sorted)
    const groupNames = [...new Set(students.map(s => s.groupName).filter(Boolean))].sort((a, b) => (a as string).localeCompare(b as string, 'ko')) as string[];

    const openAddModal = () => {
        setNewStudent({ id: '', name: '', classIds: [], groupName: '' });
        setEditingDocId(null);
        setShowModal(true);
    };

    const handleEditStudent = (student: Student) => {
        setNewStudent({
            id: student.id,
            name: student.name,
            classIds: student.classIds || [],
            groupName: student.groupName || ''
        });
        setEditingDocId(student.docId || null);
        setShowModal(true);
    };

    const handleSaveStudent = async () => {
        if (!newStudent.id || !newStudent.name) {
            toast.warning("필수 정보를 입력해주세요.");
            return;
        }

        if (editingDocId) {
            await dbService.updateStudent(editingDocId, {
                id: newStudent.id,
                name: newStudent.name,
                classIds: Array.from(new Set(newStudent.classIds)),
                groupName: newStudent.groupName || undefined,
                ...((newStudent as any).password ? { password: (newStudent as any).password } : {})
            });
        } else {
            if (newStudent.classIds.length === 0 && !confirm('클래스를 선택하지 않았습니다. 진행할까요?')) return;

            await dbService.addStudent({
                id: newStudent.id,
                name: newStudent.name,
                classIds: newStudent.classIds,
                groupName: newStudent.groupName || undefined,
                password: (newStudent as any).password
            });
        }
        await loadStudents();
        setShowModal(false);
    };

    const handleDeleteStudent = async (docId: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            await dbService.deleteStudent(docId);
            await loadStudents();
        }
    };

    // Sort indicator
    const SortIcon = ({ column }: { column: keyof Student }) => {
        if (sortConfig?.key !== column) return <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>;
        return <span className="text-blue-500 text-[10px] font-black">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs group">
                        <input
                            type="text"
                            placeholder="이름 또는 아이디 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-white"
                        />
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    {/* Class Filter */}
                    <div className="relative">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                        >
                            <option value="all">전체 클래스</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                        <svg className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    {/* Group Filter */}
                    <div className="relative">
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                        >
                            <option value="all">전체 반</option>
                            {groupNames.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="">미배정</option>
                        </select>
                        <svg className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                {/* Add Button */}
                <button
                    onClick={openAddModal}
                    className="px-5 py-2.5 bg-[#0A0E27] dark:bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-900 dark:hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 dark:shadow-blue-600/20 flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    학생 추가
                </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    총 <span className="text-blue-600 dark:text-blue-400">{displayStudents.length}</span>명                     {selectedClass !== 'all' && ` (필터됨)`}
                    {searchTerm && ` · "${searchTerm}" 검색`}
                </span>
            </div>

            {/* Student List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <div className="flex items-center bg-slate-50/80 dark:bg-slate-700/50 px-5 py-2.5 border-b border-slate-100 dark:border-white/5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <div className="w-[160px] cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1.5 select-none" onClick={() => handleSort('id')}>
                            아이디 <SortIcon column="id" />
                        </div>
                        <div className="w-[140px] cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1.5 select-none" onClick={() => handleSort('name')}>
                            이름 <SortIcon column="name" />
                        </div>
                        <div className="flex-1">
                            클래스                        </div>
                        <div className="w-[120px] text-right pr-2">
                            관리                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                        {displayStudents.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className="flex items-center px-5 py-3 hover:bg-blue-50/30 dark:hover:bg-white/5 transition-all group"
                            >
                                <div className="w-[160px]">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                        {student.id}
                                    </span>
                                </div>
                                <div className="w-[140px]">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</span>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-1.5">
                                    {student.groupName && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                            {student.groupName}
                                        </span>
                                    )}
                                    {student.classIds.map(cid => (
                                        <span key={cid} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                            {classes.find(c => c.id === cid)?.name || cid}
                                        </span>
                                    ))}
                                    {student.classIds.length === 0 && !student.groupName && (
                                        <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">미배정</span>
                                    )}
                                </div>
                                <div className="w-[120px] flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditStudent(student)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                        title="수정"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteStudent(student.docId || student.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                        title="삭제"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                    {displayStudents.map((student, idx) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="p-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-start justify-between mb-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#0A0E27] flex items-center justify-center text-white text-sm font-black shadow-sm">
                                        {student.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</h3>
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{student.id}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEditStudent(student)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteStudent(student.docId || student.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-12">
                                {student.groupName && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                        {student.groupName}
                                    </span>
                                )}
                                {student.classIds.map(cid => (
                                    <span key={cid} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                                        {classes.find(c => c.id === cid)?.name || cid}
                                    </span>
                                ))}
                                {student.classIds.length === 0 && !student.groupName && (
                                    <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">미배정</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Empty State */}
                {displayStudents.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </div>
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                            {students.length === 0 ? '등록된 학생이 없습니다.' : '조건에 맞는 학생이 없습니다.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-white dark:bg-slate-800 rounded-[24px] p-7 max-w-md w-full shadow-2xl border border-slate-100 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                        {editingDocId ? '학생 정보 수정' : '새 학생 등록'}
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                        {editingDocId ? '정보를 수정하세요.' : '학생 정보를 입력하세요.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        아이디                                    </label>
                                    <input
                                        type="text"
                                        value={newStudent.id}
                                        onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-900 dark:text-white font-mono"
                                        placeholder="예: ch0004"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        이름
                                    </label>
                                    <input
                                        type="text"
                                        value={newStudent.name}
                                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-900 dark:text-white"
                                        placeholder="예: 홍길동"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        비밀번호
                                    </label>
                                    <input
                                        type="text"
                                        value={(newStudent as any).password || ''}
                                        onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value } as any)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-900 dark:text-white font-mono"
                                        placeholder={editingDocId ? "변경시에만 입력 (기존 유지)" : "기본값 123456"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        반                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newStudent.groupName}
                                            onChange={(e) => setNewStudent({ ...newStudent, groupName: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-900 dark:text-white"
                                            placeholder="예: 필수단어 외목반"
                                            list="group-suggestions"
                                        />
                                        <datalist id="group-suggestions">
                                            {groupNames.map(g => <option key={g} value={g} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        과제반배정
                                    </label>
                                    <div className="border border-slate-200 dark:border-white/10 rounded-xl p-2.5 max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 grid grid-cols-2 gap-1.5">
                                        {classes.map(cls => {
                                            const isSelected = newStudent.classIds.includes(cls.id);
                                            return (
                                                <div
                                                    key={cls.id}
                                                    onClick={() => {
                                                        const current = newStudent.classIds;
                                                        if (isSelected) {
                                                            setNewStudent({ ...newStudent, classIds: current.filter(id => id !== cls.id) });
                                                        } else {
                                                            setNewStudent({ ...newStudent, classIds: [...current, cls.id] });
                                                        }
                                                    }}
                                                    className={`
                                                        cursor-pointer px-3 py-2 rounded-lg text-xs font-bold border flex items-center justify-between transition-all select-none
                                                        ${isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                                                            : 'bg-white dark:bg-slate-600/30 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}
                                                    `}
                                                >
                                                    <span className="truncate">{cls.name}</span>
                                                    {isSelected && (
                                                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 mt-7">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-3 rounded-xl transition-all font-bold text-sm"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveStudent}
                                    className="flex-1 bg-[#0A0E27] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 font-bold text-sm active:scale-[0.98]"
                                >
                                    {editingDocId ? '수정 완료' : '등록하기'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
