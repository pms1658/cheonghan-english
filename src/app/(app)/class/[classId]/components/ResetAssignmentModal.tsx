'use client';

import React from 'react';

interface ResetAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    resetTargetAssignment: any;
    currentClassStudents: any[];
    allSubmissions: any[];
    resetSelectedStudents: Set<string>;
    toggleResetStudentSelection: (id: string) => void;
    handleExecuteReset: () => void;
}

export default function ResetAssignmentModal({
    isOpen,
    onClose,
    resetTargetAssignment,
    currentClassStudents,
    allSubmissions,
    resetSelectedStudents,
    toggleResetStudentSelection,
    handleExecuteReset
}: ResetAssignmentModalProps) {
    if (!isOpen || !resetTargetAssignment) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-50 rounded-full text-amber-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">학습 기록 초기화</h3>
                        <p className="text-sm text-slate-500">{resetTargetAssignment.title}</p>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3 mb-6">
                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        선택한 학생의 <strong>모든 제출 기록과 점수</strong>가 영구히 삭제됩니다.<br />
                        학생은 과제를 처음부터 다시 시작할 수 있게 됩니다.
                    </p>
                </div>

                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-sm font-bold text-slate-600">대상 학생 선택</span>
                    <span className="text-xs font-medium text-slate-400">제출 기록이 있는 학생만 표시됩니다</span>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 mb-6 min-h-[200px]">
                    {(() => {
                        const submittedStudentIds = new Set(
                            allSubmissions
                                .filter(s => s.assignmentId === resetTargetAssignment.id && currentClassStudents.some(cs => cs.id === s.studentId))
                                .map(s => s.studentId)
                        );
                        const targetStudents = currentClassStudents.filter(s => submittedStudentIds.has(s.id));

                        if (targetStudents.length === 0) {
                            return (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    제출 기록이 있는 학생이 없습니다.
                                </div>
                            );
                        }

                        return targetStudents.map(student => {
                            const isSelected = resetSelectedStudents.has(student.id);
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => toggleResetStudentSelection(student.id)}
                                    className={`
                                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                        ${isSelected ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-300'}`}>
                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{student.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono">{student.id}</span>
                                </div>
                            );
                        });
                    })()}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleExecuteReset}
                        disabled={resetSelectedStudents.size === 0}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-sm
                            ${resetSelectedStudents.size > 0 ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                        `}
                    >
                        {resetSelectedStudents.size}명 초기화 실행
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
