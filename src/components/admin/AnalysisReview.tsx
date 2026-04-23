'use client';

import { useState, useEffect } from 'react';
import AnalysisEditor, { Mark } from '@/components/student/AnalysisEditor';
import { parseAnalysisString } from '@/utils/analysisParser';
import { toast } from 'sonner';


interface ReviewItem {
    id: string; // sentence ID or index
    originalText: string;
    analysisData: string; // [S]...[/S] format
    translation?: string;
}

interface AnalysisReviewProps {
    assignmentId?: string;
    onClose?: () => void;
}

export default function AnalysisReview({ assignmentId, onClose }: AnalysisReviewProps) {
    const [items, setItems] = useState<ReviewItem[]>([]);

    // Mock Data Loader (Replace with real fetch)
    useEffect(() => {
        // Mock fetch
        setItems([
            {
                id: 's1',
                originalText: 'The rapid development of AI challenges traditional education.',
                analysisData: '[S]The rapid development[/S] (of AI) [V]challenges[/V] [O]traditional education[/O].',
                translation: 'AI의 급격한 발전은 전통적인 교육에 도전한다.'
            },
            {
                id: 's2',
                originalText: 'Teachers must adapt to these changes quickly.',
                analysisData: '[S]Teachers[/S] [V]must adapt[/V] (to these changes) (quickly).',
                translation: '교사들은 이러한 변화들에 빠르게 적응해야 한다.'
            }
        ]);
    }, [assignmentId]);

    const handleSave = async () => {
        // Mock Save
        toast.success("Analysis Saved & Published to Students!");
        onClose?.();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10 w-full">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Deep Analysis Review</h2>
                    <p className="text-sm text-slate-500">Assignment ID: {assignmentId || 'Mock Mode'}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2a4d75] font-bold shadow-sm transition-colors">
                        Approve & Publish
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 w-full max-w-5xl mx-auto flex flex-col gap-8">
                {items.map((item, idx) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Sentence Header */}
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Sentence #{idx + 1}</span>
                            <span className="text-xs text-slate-400">{item.id}</span>
                        </div>

                        {/* Editor Wrapper */}
                        <div className="p-0">
                            <AnalysisEditor
                                text={item.originalText}
                                initialMarks={parseAnalysisString(item.originalText, item.analysisData)}
                                onChange={(newMarks) => {
                                    // In a real app, we would convert marks back to string logic
                                    // or store marks directly.
                                    console.log(`Sentence ${idx} updated:`, newMarks);
                                }}
                            />
                        </div>

                        {/* Translation Field */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 placeholder:text-slate-300 font-medium"
                                value={item.translation}
                                onChange={(e) => {
                                    const next = [...items];
                                    next[idx].translation = e.target.value;
                                    setItems(next);
                                }}
                                placeholder="Enter Korean Translation..."
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
