'use client';

import React from 'react';

interface WritingDetailModalProps {
    writingDetailTarget: {
        studentName: string;
        submissions: any[];
    } | null;
    onClose: () => void;
}

export default function WritingDetailModal({ writingDetailTarget, onClose }: WritingDetailModalProps) {
    if (!writingDetailTarget) return null;

    const handlePrint = () => {
        const latestSub = writingDetailTarget.submissions[writingDetailTarget.submissions.length - 1];
        const details = latestSub?.details || [];
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>${writingDetailTarget.studentName} - 구조작문</title>
            <style>
                body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 24px; }
                .meta { margin-bottom: 30px; color: #666; font-size: 13px; }
                .item { margin-bottom: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
                .q { font-size: 13px; color: #64748b; margin-bottom: 6px; }
                .korean { font-size: 15px; font-weight: bold; margin-bottom: 8px; }
                .answer { font-size: 14px; color: #334155; }
                @media print { body { padding: 20px; } }
            </style>
        </head><body>
            <h1>구조작문 - ${writingDetailTarget.studentName}</h1>
            <div class="meta">
                <strong>제출일:</strong> ${latestSub ? new Date(latestSub.submittedAt).toLocaleString() : '-'}<br>
                <strong>점수:</strong> ${latestSub?.score ?? '-'}점
            </div>
            ${details.map((r: any, i: number) => `
                <div class="item">
                    <div class="q">Q${i + 1}</div>
                    <div class="korean">${r.korean}</div>
                    <div class="answer">→ ${r.studentAnswer}</div>
                </div>
            `).join('')}
        </body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">{writingDetailTarget.studentName}</h3>
                        <span className="text-xs text-slate-400 font-bold">구조작문 결과 · {writingDetailTarget.submissions.length}회 제출</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                        >
                            🖨️ 인쇄
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {writingDetailTarget.submissions.map((sub: any, subIdx: number) => {
                        const details = sub.details || [];
                        return (
                            <div key={subIdx} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-500">{subIdx + 1}회차 제출</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${sub.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{sub.score}점</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sub.score >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {sub.score >= 90 ? '완료' : '미완료'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400">{new Date(sub.submittedAt).toLocaleString()}</div>
                                {details.map((r: any, i: number) => (
                                    <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400">Q{i + 1}</span>
                                            <span className={`text-xs font-bold ${r.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.score}점</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">{r.korean}</p>
                                        <div className="pt-1 border-t border-slate-200">
                                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 mr-1">내 답:</span>{r.studentAnswer}</p>
                                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 mr-1">정답:</span>{r.correctAnswer}</p>
                                        </div>
                                        {r.feedback && (
                                            <div className="mt-1 px-3 py-2 bg-white rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-blue-500">피드백:</span>
                                                <p className="text-xs text-slate-600 mt-0.5">{r.feedback}</p>
                                            </div>
                                        )}
                                        {r.grammarNotes && (
                                            <p className="text-[10px] text-slate-400"><span className="font-bold">📝 </span>{r.grammarNotes}</p>
                                        )}
                                    </div>
                                ))}
                                {subIdx < writingDetailTarget.submissions.length - 1 && <hr className="border-slate-200" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
