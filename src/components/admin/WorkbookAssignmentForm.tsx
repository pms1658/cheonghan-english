'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkbookLevelType, WorkbookConfig } from '@/types';
import { splitSentences } from '@/utils/textUtils';
import { dbService } from '@/services/db';
import ClassSelector from './ClassSelector';
import { toast } from 'sonner';

interface WorkbookAssignmentFormProps {
    selectedClass: any;
    onBack: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
}

export default function WorkbookAssignmentForm({
    selectedClass,
    onBack,
    onSave,
    initialData
}: WorkbookAssignmentFormProps) {
    const [passage, setPassage] = useState(initialData?.content || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [targetGrade, setTargetGrade] = useState<'e4' | 'e5' | 'e6' | 'm1' | 'm2' | 'm3' | '1' | '2' | '3'>(initialData?.targetGrade || '3');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPdfParsing, setIsPdfParsing] = useState(false);
    const [workbookConfig, setWorkbookConfig] = useState<WorkbookConfig | null>(initialData?.workbookConfig || null);
    const [pdfConfig, setPdfConfig] = useState({
        startPage: 1,
        endPage: 5
    });

    // UI steps: 1: Passage, 2: Config/Review
    const [step, setStep] = useState<1 | 2>(initialData?.workbookConfig ? 2 : 1);

    const isMounted = useRef(true);
    useEffect(() => { return () => { isMounted.current = false; }; }, []);

    // Classes for distribution
    const [availableClasses, setAvailableClasses] = useState<{id: string; name: string}[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(selectedClass ? [selectedClass.id] : (initialData?.classIds || []));

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const cls = await dbService.getClasses();
                setAvailableClasses(cls.map(c => ({ id: c.id, name: c.name })));
            } catch (e) { console.error(e); }
        };
        loadClasses();
    }, []);

    const allGrades = [
        { v: 'e4', l: '초4' }, { v: 'e5', l: '초5' }, { v: 'e6', l: '초6' },
        { v: 'm1', l: '중1' }, { v: 'm2', l: '중2' }, { v: 'm3', l: '중3' },
        { v: '1', l: '고1' }, { v: '2', l: '고2' }, { v: '3', l: '고3/수능' }
    ];


    // Title Suggestions
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

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
                    if (a.title && !seen.has(a.title)) { seen.add(a.title); titles.push(a.title); }
                });
                setTitleSuggestions(titles);
            } catch (e) { console.error(e); }
        };
        fetchTitles();
        return () => { alive = false; };
    }, []);

    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedPdfFile(file);
    };

    const handleTriggerPdfParsing = async () => {
        if (!selectedPdfFile) return;

        setIsPdfParsing(true);
        const dataPayload = new FormData();
        dataPayload.append('file', selectedPdfFile);
        dataPayload.append('startPage', pdfConfig.startPage.toString());
        dataPayload.append('endPage', pdfConfig.endPage.toString());

        try {
            const res = await fetch('/api/parse-pdf', {
                method: 'POST',
                body: dataPayload
            });

            if (!res.ok) throw new Error('PDF Upload Failed');

            const data = await res.json();
            if (data.text) {
                setPassage(data.text);
            }
        } catch (err) {
            toast.error("PDF 파싱 실패! 텍스트를 직접 복사해주세요.");
            console.error(err);
        } finally {
            setIsPdfParsing(false);
        }
    };

    const generateWorkbook = async () => {
        if (!passage.trim()) {
            toast.warning('지문을 입력해주세요.');

            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/generate-workbook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    passage: passage.trim(),
                    targetGrade
                })
            });

            if (!res.ok) throw new Error('워크북 생성에 실패했습니다.');
            if (!isMounted.current) return;

            const data = await res.json();
            setWorkbookConfig({
                passage: passage.trim(),
                levels: data.levels
            });
            setStep(2);
        } catch (error: any) {
            toast.error(`오류: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !workbookConfig) {
            toast.warning("제목과 워크북 내용을 확인해주세요.");
            return;
        }

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const defaultDeadline = nextWeek.toISOString().split('T')[0];

        const assignmentData = {
            title,
            deadline: defaultDeadline,
            category: 'midterm' as const,
            type: 'workbook' as const,
            content: passage,
            targetGrade,
            sentences: splitSentences(passage),
            classIds: selectedClassIds,
            workbookConfig,
            createdAt: Date.now()
        };

        await onSave(assignmentData);
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white rounded-xl transition text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">새 워크북 만들기</h2>
                        <p className="text-sm text-slate-500">지문 하나로 어휘, 어법, Mastery(구문)까지 한 번에</p>
                    </div>
                </div>
            </div>


            <div className="p-8">
                {step === 1 ? (
                    <div className="space-y-6">
                        {/* Title & Grade */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">과제 제목</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => { setTitle(e.target.value); setShowTitleSuggestions(true); }}
                                        onFocus={() => setShowTitleSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                        placeholder="예: 2024년 3월 고1 모의고사 21번 워크북"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#1e3a5f] transition outline-none font-medium"
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
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">난이도 (학년)</label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {allGrades.map(g => (
                                        <button
                                            key={g.v}
                                            onClick={() => setTargetGrade(g.v as any)}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all ${targetGrade === g.v
                                                ? 'bg-[#1e3a5f] text-white shadow-md'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {g.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Class Selector */}
                        <ClassSelector
                            classes={availableClasses}
                            selectedClassIds={selectedClassIds}
                            onChange={setSelectedClassIds}
                        />

                        {/* Passage Input */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                                <label className="block text-sm font-bold text-slate-700">지문 입력</label>

                                {/* PDF Tools */}
                                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 ${selectedPdfFile ? 'bg-[#1e3a5f]/10 text-[#2a4d75] border-[#1e3a5f]/30' : 'bg-white text-slate-600 border-slate-200'} rounded-lg shadow-sm border transition-all text-xs font-bold`}>
                                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileSelect} />
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                                            {selectedPdfFile ? selectedPdfFile.name : 'PDF 파일 선택'}
                                        </label>

                                        {selectedPdfFile && (
                                            <>
                                                <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                                    <span className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-tight">Range:</span>
                                                    <input
                                                        type="number" className="w-10 px-0.5 py-0 text-center text-xs border-none bg-transparent focus:ring-0 outline-none"
                                                        value={pdfConfig.startPage}
                                                        onChange={e => setPdfConfig({ ...pdfConfig, startPage: parseInt(e.target.value) || 1 })}
                                                    />
                                                    <span className="text-slate-300 text-[10px]">~</span>
                                                    <input
                                                        type="number" className="w-10 px-0.5 py-0 text-center text-xs border-none bg-transparent focus:ring-0 outline-none"
                                                        value={pdfConfig.endPage}
                                                        onChange={e => setPdfConfig({ ...pdfConfig, endPage: parseInt(e.target.value) || 5 })}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleTriggerPdfParsing}
                                                    disabled={isPdfParsing}
                                                    className={`px-3 py-1.5 ${isPdfParsing ? 'bg-slate-300 text-slate-500' : 'bg-[#1e3a5f] text-white hover:bg-[#2a4d75] shadow-sm'} rounded-lg transition-all text-xs font-bold flex items-center gap-1.5`}
                                                >
                                                    {isPdfParsing ? (
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                    )}
                                                    {isPdfParsing ? '추출 중...' : '추출실행'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="relative group">
                                <textarea
                                    value={passage}
                                    onChange={(e) => setPassage(e.target.value)}
                                    onBlur={() => {
                                        const normalized = passage
                                            .replace(/\s+/g, ' ') // Collapse all whitespace/newlines
                                            .trim();
                                        setPassage(normalized);
                                    }}
                                    placeholder="학습할 영어 지문을 붙여넣으세요..."
                                    className="w-full h-80 px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-[#1e3a5f] transition outline-none font-medium resize-none leading-relaxed"
                                />
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => {
                                            const cleaned = passage
                                                .replace(/\s+/g, ' ')
                                                .replace(/(\.|\?|\!) /g, '$1\n\n') // Pretty breaks
                                                .trim();
                                            setPassage(cleaned);
                                        }}
                                        className="px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 rounded-lg text-xs font-bold text-[#1e3a5f] hover:bg-white shadow-sm transition-all"
                                    >
                                        🧹 줄바꿈 정리
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={generateWorkbook}
                                disabled={isGenerating || !passage.trim()}
                                className="px-8 py-4 bg-[#1e3a5f] text-white rounded-2xl font-bold shadow-lg shadow-[#1e3a5f]/20 flex items-center gap-3 hover:bg-[#2a4d75] disabled:opacity-50 transition-all hover:-translate-y-1 active:translate-y-0"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>AI가 워크북 만드는 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        <span>3단계 워크북 일괄 생성하기</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary View */}
                        <div className="bg-[#1e3a5f]/10 rounded-2xl p-6 border border-[#1e3a5f]/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1.5 h-6 bg-[#1e3a5f] rounded-full"></div>
                                <h3 className="font-bold text-[#1e3a5f]">생성된 워크북 단계</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {workbookConfig?.levels.map((level, idx) => (
                                    <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-[#1e3a5f]/20 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-[#1e3a5f]/70">Level {idx + 1}</p>
                                            <p className="font-bold text-slate-700">
                                                {level.type === 'vocab' ? '어휘 선택' :
                                                    level.type === 'grammar' ? '어법 선택' :
                                                        level.type === 'unscramble' ? '어순 배열' : '영작 프레임'}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition"
                            >
                                지문 수정하기
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-10 py-4 bg-[#1e3a5f] text-white rounded-2xl font-bold shadow-xl shadow-[#1e3a5f]/20 hover:bg-[#2a4d75] transition-all hover:scale-105 active:scale-95"
                            >
                                워크북 배부하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
