'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dbService, Student, Class } from '@/services/db';
import { Homework, Assignment } from '@/types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ─── Helpers (shared with page) ───
function formatDateTitle(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}월 ${d.getDate()}일 과제`;
}

function formatToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface CreateHomeworkModalProps {
    students: Student[];
    classes: Class[];
    assignments: Assignment[];
    preselectedStudentId: string | null;
    editingHomework: Homework | null;
    user: any;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateHomeworkModal({
    students, classes, assignments, preselectedStudentId, editingHomework, user,
    onClose, onCreated
}: CreateHomeworkModalProps) {
    const isEditing = !!editingHomework;
    const [date, setDate] = useState(editingHomework?.date || formatToday());
    const [title, setTitle] = useState(editingHomework?.title || formatDateTitle(formatToday()));
    const [autoTitle, setAutoTitle] = useState(!editingHomework);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
        editingHomework?.studentIds || (preselectedStudentId ? [preselectedStudentId] : [])
    );
    const [itemsText, setItemsText] = useState(editingHomework?.items?.join('\n') || '');
    const [memo, setMemo] = useState(editingHomework?.memo || '');
    const [submitting, setSubmitting] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

    // ─── Linked Assignments ───
    const [linkedAssignments, setLinkedAssignments] = useState<{ assignmentId: string; title: string; classId?: string }[]>(
        editingHomework?.linkedAssignments || []
    );
    const [showAssignmentPicker, setShowAssignmentPicker] = useState(false);
    const [pickerClassId, setPickerClassId] = useState('');

    // Auto title
    useEffect(() => {
        if (autoTitle && date) {
            setTitle(formatDateTitle(date));
        }
    }, [date, autoTitle]);

    // Parse items
    const parsedItems = useMemo(() => {
        return itemsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }, [itemsText]);

    // Filtered students
    const filteredStudents = useMemo(() => {
        return students
            .filter(s => {
                if (!studentSearchQuery) return true;
                return s.name.includes(studentSearchQuery) || s.id.includes(studentSearchQuery);
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, studentSearchQuery]);

    // Assignments by class — sorted alphabetically
    const classAssignments = useMemo(() => {
        if (!pickerClassId) return [];
        return assignments
            .filter(a => a.classIds?.includes(pickerClassId))
            .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    }, [pickerClassId, assignments]);

    // Sorted classes for picker — filtered by selected students
    const sortedClasses = useMemo(() => {
        const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        if (selectedStudentIds.length === 0) return sorted;
        // Only show classes that all selected students belong to
        // Check from student side: student.classIds contains class id
        return sorted.filter(cls => 
            selectedStudentIds.every(sid => {
                const student = students.find(s => s.id === sid);
                return student?.classIds?.includes(cls.id) || cls.studentIds?.includes(sid);
            })
        );
    }, [classes, selectedStudentIds, students]);

    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const handleToggleLinkedAssignment = (assignment: Assignment) => {
        setLinkedAssignments(prev => {
            const exists = prev.find(la => la.assignmentId === assignment.id);
            if (exists) {
                return prev.filter(la => la.assignmentId !== assignment.id);
            } else {
                return [...prev, {
                    assignmentId: assignment.id,
                    title: assignment.title,
                    classId: assignment.classIds?.[0]
                }];
            }
        });
    };

    const handleRemoveLinkedAssignment = (assignmentId: string) => {
        setLinkedAssignments(prev => prev.filter(la => la.assignmentId !== assignmentId));
    };

    // Get order number of a linked assignment (1-based, by selection order)
    const getLinkedOrder = (assignmentId: string): number => {
        return linkedAssignments.findIndex(la => la.assignmentId === assignmentId) + 1;
    };

    const handleSubmit = async () => {
        if (parsedItems.length === 0 && linkedAssignments.length === 0) {
            toast.warning('과제 항목을 입력하거나 과제를 연동해주세요.');
            return;
        }
        if (selectedStudentIds.length === 0) {
            toast.warning('대상 학생을 선택해주세요.');
            return;
        }
        setSubmitting(true);
        try {
            const homeworkData = {
                title,
                date,
                items: parsedItems,
                studentIds: selectedStudentIds,
                classIds: [] as string[],
                ...(memo ? { memo } : {}),
                linkedAssignments: linkedAssignments.length > 0 ? linkedAssignments : [],
            };

            if (isEditing && editingHomework) {
                await dbService.updateHomework(editingHomework.id, homeworkData);
            } else {
                await dbService.addHomework({
                    ...homeworkData,
                    createdAt: Date.now(),
                    tenantId: (user as any)?.tenantId || 'cheonghan'
                });
            }
            onCreated();
        } catch (e) {
            console.error(e);
            toast.error(isEditing ? '과제 수정 실패' : '과제 등록 실패');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Clipboard text ───
    const clipboardText = useMemo(() => {
        const allItems = [...parsedItems, ...linkedAssignments.map(la => la.title)];
        if (allItems.length === 0) return '';
        return [title, ...allItems.map((item, i) => `${i + 1}. ${item}`)].join('\n');
    }, [title, parsedItems, linkedAssignments]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isEditing ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        {isEditing ? '과제 수정' : '과제 부과'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Date & Title */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">날짜</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">제목</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => { setTitle(e.target.value); setAutoTitle(false); }}
                                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                                {!autoTitle && (
                                    <button onClick={() => { setAutoTitle(true); setTitle(formatDateTitle(date)); }} className="text-[10px] text-blue-500 font-bold">자동</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Student Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                대상 학생 {selectedStudentIds.length > 0 && <span className="text-blue-500 normal-case">({selectedStudentIds.length}명)</span>}
                            </label>
                            <button onClick={handleSelectAll} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">
                                {selectedStudentIds.length === filteredStudents.length ? '전체 해제' : '전체 선택'}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={studentSearchQuery}
                            onChange={e => setStudentSearchQuery(e.target.value)}
                            placeholder="학생 검색..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-1.5 placeholder:text-slate-300"
                        />
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                            {filteredStudents.map(student => (
                                <label
                                    key={student.id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStudentIds.includes(student.id)}
                                        onChange={() => handleToggleStudent(student.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto">{student.id}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Items Textarea (오프라인 과제) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                            오프라인 과제 <span className="normal-case text-slate-400 font-normal">(줄바꿈으로 구분)</span>
                        </label>
                        <textarea
                            value={itemsText}
                            onChange={e => setItemsText(e.target.value)}
                            rows={4}
                            placeholder={`교재 p.52~54\n단어 Day 7 암기\n프린트물 완성`}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                    </div>

                    {/* Linked Assignments (과제방 연동) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                            과제방 연동 <span className="normal-case text-slate-400 font-normal">(선택)</span>
                        </label>

                        {/* Already linked */}
                        {linkedAssignments.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                                {linkedAssignments.map(la => (
                                    <div key={la.assignmentId} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg px-3 py-2">
                                        <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-1">{la.title}</span>
                                        <button
                                            onClick={() => handleRemoveLinkedAssignment(la.assignmentId)}
                                            className="p-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add assignment button / picker */}
                        {!showAssignmentPicker ? (
                            <button
                                onClick={() => setShowAssignmentPicker(true)}
                                className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                과제 추가하기
                            </button>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-500/20 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase">과제방에서 선택</span>
                                    <button onClick={() => { setShowAssignmentPicker(false); setPickerClassId(''); }} className="text-xs text-slate-400 hover:text-slate-600">닫기</button>
                                </div>
                                <select
                                    value={pickerClassId}
                                    onChange={e => setPickerClassId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">과제방 선택...</option>
                                    {sortedClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {pickerClassId && (
                                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                                        {classAssignments.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-3">이 과제방에 과제가 없습니다</p>
                                        ) : (
                                            classAssignments.map(asn => {
                                                const order = getLinkedOrder(asn.id);
                                                const isChecked = order > 0;
                                                return (
                                                    <label
                                                        key={asn.id}
                                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0 ${
                                                            isChecked
                                                                ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleLinkedAssignment(asn)}
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        {isChecked && (
                                                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                                                {order}
                                                            </span>
                                                        )}
                                                        <span className={`font-bold flex-1 ${isChecked ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{asn.title}</span>
                                                        <span className="text-slate-400 text-[10px]">({asn.type})</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Memo */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">메모 <span className="normal-case text-slate-400 font-normal">(선택)</span></label>
                        <input
                            type="text"
                            value={memo}
                            onChange={e => setMemo(e.target.value)}
                            placeholder="관리자용 메모 (학생에게 보이지 않음)"
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    {/* Preview */}
                    {(parsedItems.length > 0 || linkedAssignments.length > 0) && (
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">미리보기</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{title}</p>
                            <div className="space-y-1">
                                {parsedItems.map((item, i) => (
                                    <p key={i} className="text-xs text-slate-700 dark:text-slate-300">
                                        <span className="text-blue-500 font-bold mr-1">{i + 1}.</span>{item}
                                    </p>
                                ))}
                                {linkedAssignments.map((la, i) => (
                                    <p key={`la-${i}`} className="text-xs text-indigo-600 dark:text-indigo-400">
                                        <span className="font-bold mr-1">{parsedItems.length + i + 1}.</span>🔗 {la.title}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3">
                    <button
                        onClick={() => {
                            if (clipboardText) {
                                navigator.clipboard.writeText(clipboardText);
                                toast.success('카톡용 과제 복사됨');
                            }
                        }}
                        disabled={parsedItems.length === 0 && linkedAssignments.length === 0}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        카톡 복사
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (parsedItems.length === 0 && linkedAssignments.length === 0) || selectedStudentIds.length === 0}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        )}
                        {isEditing ? '수정' : '등록'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
