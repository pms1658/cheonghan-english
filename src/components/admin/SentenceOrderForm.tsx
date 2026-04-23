'use client';

import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import ClassSelector from './ClassSelector';
import { cleanPassageMarkers, splitSentences } from '@/utils/textUtils';
import { toast } from 'sonner';

interface SentenceOrderFormProps {
    selectedClass: any;
    onBack: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
}

export default function SentenceOrderForm({
    selectedClass,
    onBack,
    onSave,
    initialData
}: SentenceOrderFormProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [passage, setPassage] = useState(initialData?.content || '');
    const [sentences, setSentences] = useState<string[]>(initialData?.sentenceOrderConfig?.originalSentences || []);

    // Classes
    const [availableClasses, setAvailableClasses] = useState<{id: string; name: string}[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
        selectedClass ? [selectedClass.id] : (initialData?.classIds || [])
    );

    // Title suggestions
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const cls = await dbService.getClasses();
                setAvailableClasses(cls.map(c => ({ id: c.id, name: c.name })));
            } catch (e) { console.error(e); }
        };
        loadClasses();
    }, []);

    useEffect(() => {
        let alive = true;
        const fetchTitles = async () => {
            try {
                const assignments = await dbService.getAssignments();
                if (!alive) return;
                const getTime = (val: any): number => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    if (val instanceof Date) return val.getTime();
                    if (typeof val.toMillis === 'function') return val.toMillis();
                    if (typeof val.toDate === 'function') return val.toDate().getTime();
                    if (typeof val.seconds === 'number') return val.seconds * 1000;
                    return 0;
                };
                assignments.sort((a, b) => {
                    const ta = getTime((a as any).createdAt);
                    const tb = getTime((b as any).createdAt);
                    return tb - ta;
                });
                const titles: string[] = [];
                const seen = new Set<string>();
                assignments.forEach(a => {
                    if (a.title && !seen.has(a.title)) {
                        seen.add(a.title);
                        titles.push(a.title);
                    }
                });
                setTitleSuggestions(titles);
            } catch (e) {
                console.error('Failed to fetch title suggestions', e);
            }
        };
        fetchTitles();
        return () => { alive = false; };
    }, []);

    const handleParsePassage = () => {
        if (!passage.trim()) {
            toast.warning('지문을 입력해주세요.');
            return;
        }
        const cleaned = cleanPassageMarkers(passage);
        const parsed = splitSentences(cleaned);
        if (parsed.length === 0) {
            toast.warning('문장을 분리할 수 없습니다. 지문을 확인해주세요.');
            return;
        }
        setSentences(parsed);
        toast.success(`${parsed.length}개 문장으로 분리되었습니다.`);
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.warning('제목을 입력해주세요.');
        if (sentences.length < 2) return toast.warning('최소 2개 이상의 문장이 필요합니다.');
        if (selectedClassIds.length === 0) return toast.warning('반을 선택해주세요.');

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        await onSave({
            title,
            deadline: nextWeek.toISOString().split('T')[0],
            category: 'sat',
            type: 'sentence_order',
            content: passage,
            sentences: [],
            classIds: selectedClassIds,
            sentenceOrderConfig: {
                originalSentences: sentences
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-700 text-white text-[10px] font-bold rounded">세부순서</span>
                            <h1 className="text-lg font-bold text-slate-900">세부순서 과제 생성</h1>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={sentences.length < 2}
                        className="px-4 py-1.5 bg-[#0A0E27] text-white rounded-lg text-sm font-bold shadow-lg hover:bg-[#1e2548] disabled:opacity-50 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Title */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">과제 제목</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setShowTitleSuggestions(true); }}
                                onFocus={() => setShowTitleSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                placeholder="e.g., 2024 March Mock Test #21"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#0A0E27] outline-none"
                            />
                            {showTitleSuggestions && titleSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[320px] overflow-y-auto">
                                    {titleSuggestions
                                        .filter(t => t.toLowerCase().includes(title.toLowerCase()))
                                        .map((t, i) => (
                                            <div
                                                key={i}
                                                onMouseDown={() => { setTitle(t); setShowTitleSuggestions(false); }}
                                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0 transition-colors"
                                            >
                                                {t}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Class Selector */}
                    <ClassSelector
                        classes={availableClasses}
                        selectedClassIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                    />

                    {/* Passage Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">지문 입력</label>
                            <span className="text-[10px] text-slate-400">숫자, 기호, 괄호 등은 자동 제거됩니다</span>
                        </div>
                        <textarea
                            value={passage}
                            onChange={(e) => setPassage(e.target.value)}
                            placeholder="영어 지문을 붙여넣으세요. 문장 부호(마침표, 물음표, 느낌표) 기준으로 자동 분리됩니다."
                            className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#0A0E27] outline-none resize-none"
                        />
                        <button
                            onClick={handleParsePassage}
                            disabled={!passage.trim()}
                            className="w-full py-3 bg-[#0A0E27] text-white rounded-xl font-bold shadow-md hover:bg-[#1e2548] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                            문장 분리하기
                        </button>
                    </div>
                </div>

                {/* Parsed Sentences Preview */}
                {sentences.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">분리된 문장</h2>
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                {sentences.length}문장
                            </span>
                        </div>

                        <p className="text-xs text-slate-400 -mt-2">
                            이 순서가 정답 순서입니다. 학생에게는 랜덤으로 섞여서 출제됩니다.
                        </p>

                        <div className="space-y-2">
                            {sentences.map((s, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors">
                                    <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[#0A0E27] text-white rounded-lg text-xs font-bold shadow-sm">
                                        {idx + 1}
                                    </span>
                                    <p className="text-sm text-slate-700 leading-relaxed flex-1 pt-0.5">{s}</p>
                                    <button
                                        onClick={() => {
                                            setSentences(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="문장 삭제"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
