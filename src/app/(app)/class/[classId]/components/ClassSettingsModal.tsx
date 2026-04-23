'use client';

import React from 'react';

interface ClassSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingClassName: string;
    setEditingClassName: (v: string) => void;
    handleUpdateClass: () => void;
    handleDeleteClass: () => void;
}

export default function ClassSettingsModal({
    isOpen,
    onClose,
    editingClassName,
    setEditingClassName,
    handleUpdateClass,
    handleDeleteClass
}: ClassSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">클래스 설정</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">클래스 이름</label>
                        <input
                            type="text"
                            value={editingClassName}
                            onChange={e => setEditingClassName(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold text-slate-700"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button
                        onClick={handleUpdateClass}
                        disabled={!editingClassName.trim()}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        수정 완료
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200"
                    >
                        취소
                    </button>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                        onClick={handleDeleteClass}
                        className="w-full text-xs text-rose-400 font-bold hover:text-rose-600 hover:underline py-2"
                    >
                        ⚠️ 클래스 삭제 (복구 불가)
                    </button>
                </div>
            </div>
        </div>
    );
}
