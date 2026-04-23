'use client';

import React from 'react';

interface StudentManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentClassStudents: any[];
    availableStudents: any[];
    isAddingStudent: boolean;
    setIsAddingStudent: (v: boolean) => void;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    selectedStudentIds: Set<string>;
    toggleStudentSelection: (id: string) => void;
    handleAddSelectedStudents: () => void;
    setSelectedStudentIds: (s: Set<string>) => void;
}

export default function StudentManageModal({
    isOpen,
    onClose,
    currentClassStudents,
    availableStudents,
    isAddingStudent,
    setIsAddingStudent,
    searchTerm,
    setSearchTerm,
    selectedStudentIds,
    toggleStudentSelection,
    handleAddSelectedStudents,
    setSelectedStudentIds
}: StudentManageModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="text-blue-600">👥</span>
                        수강 학생
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{currentClassStudents.length}명</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsAddingStudent(!isAddingStudent);
                                setSearchTerm('');
                                setSelectedStudentIds(new Set());
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1
                                ${isAddingStudent ? 'bg-slate-100 text-slate-500' : 'bg-[#0A0E27] text-white hover:bg-blue-800'}
                            `}
                        >
                            {isAddingStudent ? '목록으로' : '+ 학생 추가'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {isAddingStudent ? (
                    <div className="flex-1 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-4 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input
                                type="text"
                                placeholder="이름 또는 ID로 학생 검색..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 mb-4 pr-1">
                            {availableStudents.length > 0 ? (
                                availableStudents.map(student => {
                                    const isSelected = selectedStudentIds.has(student.id);
                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleStudentSelection(student.id)}
                                            className={`
                                                flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                                                ${isSelected
                                                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}
                                                `}>
                                                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">{student.name}</div>
                                                    <div className="text-xs text-slate-400">{student.id}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-sm">
                                    {searchTerm ? '검색 결과가 없습니다.' : '추가 가능한 학생이 없습니다.'}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAddSelectedStudents}
                            disabled={selectedStudentIds.size === 0}
                            className={`
                                w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                                ${selectedStudentIds.size > 0
                                    ? 'bg-[#0A0E27] text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            <span>선택 완료</span>
                            {selectedStudentIds.size > 0 && <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">{selectedStudentIds.size}</span>}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                        {currentClassStudents.length > 0 ? (
                            <ul className="space-y-2">
                                {currentClassStudents.map(student => (
                                    <li key={student.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">
                                                {student.name.slice(0, 1)}
                                            </div>
                                            <div>
                                                <div className="text-base font-bold text-slate-700 leading-none mb-1">{student.name}</div>
                                                <div className="text-sm text-slate-400 font-medium leading-none">{student.id}</div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <p>배정된 학생이 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
