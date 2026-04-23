'use client';

import React from 'react';

interface SplitAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    splitTarget: any;
    splitOptions: { wordsPerChunk: number; handleRemainder: string };
    setSplitOptions: (opts: any) => void;
    handleSplitAssignment: () => void;
}

export default function SplitAssignmentModal({
    isOpen,
    onClose,
    splitTarget,
    splitOptions,
    setSplitOptions,
    handleSplitAssignment
}: SplitAssignmentModalProps) {
    if (!isOpen || !splitTarget) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2">단어장 나누기</h3>
                <p className="text-sm text-slate-500 mb-6">총 {splitTarget?.words?.length || 0}개의 단어를 분할합니다.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">분할 단위 (단어 개수)</label>
                        <input
                            type="number"
                            min="1"
                            value={splitOptions.wordsPerChunk}
                            onChange={(e) => setSplitOptions({ ...splitOptions, wordsPerChunk: parseInt(e.target.value) || 0 })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">나머지 처리</label>
                        <select
                            value={splitOptions.handleRemainder}
                            onChange={(e) => setSplitOptions({ ...splitOptions, handleRemainder: e.target.value as any })}
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="last">마지막 과제에 합치기 (추천)</option>
                            <option value="new">별도의 과제로 분리</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button
                        onClick={handleSplitAssignment}
                        className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
                    >
                        나누기 실행
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
