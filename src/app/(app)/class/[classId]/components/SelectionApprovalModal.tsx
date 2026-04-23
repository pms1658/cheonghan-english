'use client';

import React from 'react';

interface SelectionApprovalModalProps {
    approvalModal: {
        submissionId: string;
        studentName: string;
        assignmentId: string;
        assignmentTitle: string;
        selectedWords: { term: string; meaning: string; contextSentence?: string }[];
        selectedIndices: number[];
    } | null;
    onClose: () => void;
    splitWordsPerChunk: number | string;
    setSplitWordsPerChunk: (v: number | string) => void;
    handleApproveSubmission: (id: string) => void;
    handleApproveWithSplit: () => void;
    handleRejectSubmission: (id: string) => void;
}

export default function SelectionApprovalModal({
    approvalModal,
    onClose,
    splitWordsPerChunk,
    setSplitWordsPerChunk,
    handleApproveSubmission,
    handleApproveWithSplit,
    handleRejectSubmission
}: SelectionApprovalModalProps) {
    if (!approvalModal) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">단어 선택 승인</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                <span className="font-bold text-amber-600">{approvalModal.studentName}</span> · {approvalModal.assignmentTitle}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-xl text-slate-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            선택 단어: {approvalModal.selectedWords.length}개
                        </span>
                    </div>
                </div>

                {/* Word List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2" style={{ maxHeight: '40vh' }}>
                    {approvalModal.selectedWords.map((word, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                            <div className="flex-1">
                                <span className="font-bold text-slate-800">{word.term}</span>
                                <span className="text-slate-400 ml-2 text-sm">{word.meaning}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Split Controls */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3 mb-3">
                        <label className="text-xs font-bold text-slate-500">분할 설정:</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">과제당</span>
                            <input
                                type="number"
                                min={5}
                                max={approvalModal.selectedWords.length}
                                value={splitWordsPerChunk}
                                placeholder="30"
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '') { setSplitWordsPerChunk(''); return; }
                                    setSplitWordsPerChunk(Number(val));
                                }}
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <span className="text-xs text-slate-400">개</span>
                        </div>
                        {Number(splitWordsPerChunk) >= 5 && (
                            <span className="text-xs font-bold text-blue-600 ml-auto">
                                → {Math.ceil(approvalModal.selectedWords.length / Number(splitWordsPerChunk))}개 과제
                            </span>
                        )}
                    </div>
                    {Number(splitWordsPerChunk) >= 5 && approvalModal.selectedWords.length > Number(splitWordsPerChunk) && (
                        <p className="text-[10px] text-slate-400">
                            {Array.from({ length: Math.ceil(approvalModal.selectedWords.length / Number(splitWordsPerChunk)) }, (_, i) => {
                                const start = i * Number(splitWordsPerChunk);
                                const end = Math.min(start + Number(splitWordsPerChunk), approvalModal.selectedWords.length);
                                return `${i + 1}번: ${end - start}개`;
                            }).join(' · ')}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={() => handleRejectSubmission(approvalModal.submissionId)}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors border border-red-100"
                    >
                        반려
                    </button>
                    <button
                        onClick={() => handleApproveSubmission(approvalModal.submissionId)}
                        className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm hover:bg-[#2a4d75] transition-colors shadow-lg shadow-[#1e3a5f]/10"
                    >
                        그대로 승인
                    </button>
                    {Number(splitWordsPerChunk) >= 5 && approvalModal.selectedWords.length > Number(splitWordsPerChunk) && (
                        <button
                            onClick={handleApproveWithSplit}
                            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100"
                        >
                            분할 승인 ({Math.ceil(approvalModal.selectedWords.length / Number(splitWordsPerChunk))}개)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
