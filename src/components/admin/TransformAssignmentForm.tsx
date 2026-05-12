'use client';

import { useState, useRef, useEffect } from 'react';
import { VariantProblemType, VariantProblem } from '@/types';
import { dbService } from '@/services/db';
import ClassSelector from './ClassSelector';
import { toast } from 'sonner';

interface TransformAssignmentFormProps {
    selectedClass: any;
    onBack: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
}

export default function TransformAssignmentForm({
    selectedClass,
    onBack,
    onSave,
    initialData
}: TransformAssignmentFormProps) {
    // --- State ---
    const [passage, setPassage] = useState(initialData?.content || '');
    const [title, setTitle] = useState(initialData?.title || '');

    // Config
    const [targetGrade, setTargetGrade] = useState<'e4' | 'e5' | 'e6' | 'm1' | 'm2' | 'm3' | '1' | '2' | '3' | 'adv'>(initialData?.targetGrade || '3');
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual' | 'special'>(initialData?.variantConfig?.problemTypes?.length > 0 ? 'manual' : 'auto');
    const [rewrittenPassage, setRewrittenPassage] = useState<string | null>(null);
    const [changesSummary, setChangesSummary] = useState<string | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<VariantProblemType[]>(initialData?.variantConfig?.problemTypes || []);
    const [includeWorkbook, setIncludeWorkbook] = useState(false);
    // Classes for distribution
    const [availableClasses, setAvailableClasses] = useState<{id: string; name: string}[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(selectedClass ? [selectedClass.id] : (initialData?.classIds || []));

    // Results
    const [generatedProblems, setGeneratedProblems] = useState<VariantProblem[]>(initialData?.variantProblems || []);
    const [generatedWorkbookConfig, setGeneratedWorkbookConfig] = useState<any>(initialData?.workbookConfig || null);

    // Status
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPdfParsing, setIsPdfParsing] = useState(false);

    // PDF
    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
    const [pdfStartPage, setPdfStartPage] = useState(1);
    const [pdfEndPage, setPdfEndPage] = useState(1);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // Load classes for ClassSelector
    useEffect(() => {
        const loadClasses = async () => {
            try {
                const cls = await dbService.getClasses();
                setAvailableClasses(cls.map(c => ({ id: c.id, name: c.name })));
            } catch (e) { console.error(e); }
        };
        loadClasses();
    }, []);

    // [Shared] Title Suggestions
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
                    if (typeof val._seconds === 'number') return val._seconds * 1000;
                    return 0;
                };
                assignments.sort((a, b) => {
                    const ta = getTime((a as any).createdAt);
                    const tb = getTime((b as any).createdAt);
                    if (ta || tb) return tb - ta;
                    return ((b as any).docId || b.id || '').localeCompare((a as any).docId || a.id || '');
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

    // --- Data ---
    const problemTypes: { value: VariantProblemType; label: string; desc?: string }[] = [
        { value: 'topic', label: '주제', desc: 'Main Idea' },
        { value: 'title', label: '제목', desc: 'Title' },
        { value: 'claim', label: '주장/요지', desc: 'Claim' },
        { value: 'vocabulary', label: '어휘', desc: 'Vocab' },
        { value: 'blank', label: '빈칸 추론', desc: 'Blank' },
        { value: 'grammar', label: '어법', desc: 'Grammar' },
        { value: 'order', label: '글의 순서', desc: 'Order' },
        { value: 'insertion', label: '문장 삽입', desc: 'Insertion' },
        { value: 'flow', label: '무관한 문장', desc: 'Flow' },
        { value: 'summary', label: '요약문', desc: 'Summary' },
        { value: 'meaning', label: '함축 의미', desc: 'Meaning' },
        { value: 'mismatch', label: '내용 불일치', desc: '26~28번' },
    ];

    const allGrades = [
        { v: 'e4', l: 'E4' }, { v: 'e5', l: 'E5' }, { v: 'e6', l: 'E6' },
        { v: 'm1', l: 'M1' }, { v: 'm2', l: 'M2' }, { v: 'm3', l: 'M3' },
        { v: '1', l: 'H1' }, { v: '2', l: 'H2' }, { v: '3', l: 'H3' },
        { v: 'adv', l: 'ADV' }
    ];

    // --- Logic ---
    const toggleType = (type: VariantProblemType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const cleanPassage = () => {
        const cleaned = passage
            .replace(/\s+/g, ' ')
            .replace(/(\.|\\?|\\!) /g, '$1\n\n')
            .trim();
        setPassage(cleaned);
    };

    const applyFormatting = (tag: 'i' | 'u') => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const selectedText = passage.substring(start, end);
        if (!selectedText) return;
        const newText = passage.substring(0, start) + `<${tag}>${selectedText}</${tag}>` + passage.substring(end);
        setPassage(newText);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start, end + (tag.length * 2 + 5));
            }
        }, 0);
    };

    const handleGenerate = async () => {
        if (!passage.trim()) return toast.warning('지문을 입력해주세요.');
        if (generationMode === 'manual' && selectedTypes.length === 0) return toast.warning("유형을 선택해주세요.");

        setIsGenerating(true);
        setGeneratedProblems([]);
        setRewrittenPassage(null);
        setChangesSummary(null);
        try {
            const isSpecial = generationMode === 'special';
            const apiEndpoint = includeWorkbook ? '/api/generate-full-set' : '/api/generate-variant-problems';
            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    passage: passage.trim(),
                    problemTypes: generationMode === 'manual' ? selectedTypes : [],
                    autoGenerate: generationMode === 'auto' || isSpecial,
                    targetGrade,
                    isSpecialLevel: isSpecial
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || '생성 실패');
            }

            const data = await res.json();
            if (data.rewrittenPassage) {
                setRewrittenPassage(data.rewrittenPassage);
                setChangesSummary(data.changesSummary || null);
            }
            if (includeWorkbook) {
                setGeneratedProblems(data.variantProblems || []);
                setGeneratedWorkbookConfig(data.workbookConfig || null);
            } else {
                setGeneratedProblems(data.problems || []);
            }
        } catch (error: any) {
            toast.error("Error: ${error.message}");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || generatedProblems.length === 0) return toast.warning("제목과 문제를 확인해주세요.");

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        await onSave({
            title,
            deadline: nextWeek.toISOString().split('T')[0],
            category: 'sat',
            type: 'transform',
            content: passage,
            targetGrade,
            sentences: [],
            classIds: selectedClassIds,
            variantConfig: { problemTypes: selectedTypes, totalProblems: generatedProblems.length },
            variantProblems: generatedProblems,
            workbookConfig: generatedWorkbookConfig
        });
    };

    // PDF Parsing
    const handlePdfParse = async () => {
        if (!selectedPdfFile) return;
        setIsPdfParsing(true);
        const formData = new FormData();
        formData.append('file', selectedPdfFile);
        formData.append('startPage', pdfStartPage.toString());
        formData.append('endPage', pdfEndPage.toString());

        try {
            const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('PDF Error');
            const data = await res.json();
            setPassage(data.text || '');
        } catch (e) {
            toast.error("PDF 파싱 실패");
        } finally {
            setIsPdfParsing(false);
        }
    };


    const formatQuestionText = (text: string) => {
        if (!text) return '';
        return text
            // Normalize line endings
            .replace(/\r/g, '')
            // Strip stray markdown code fences
            .replace(/```(?:json)?\s*/gi, '')
            // Convert markdown bold **text** → plain text
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            // Convert markdown italic *text* → <i>text</i>
            .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>')
            // Normalize inconsistent blank markers
            .replace(/_{3,}/g, '__________')
            // Remove stray "Question:" / "Passage:" headers
            .replace(/^\s*(?:Question|Passage|Text)\s*:\s*\n?/i, '')
            // Process structural markers
            .replace(/\[\[BOX\]\]\s*\n?/gi, "<div class='box-sentence'>")
            .replace(/\n?\s*\[\[\/BOX\]\]\n?/gi, "</div>")
            .replace(/\[\[TARGET\]\]\s*\n?/gi, "<div class='target-sentence'>")
            .replace(/\n?\s*\[\[\/TARGET\]\]\n?/gi, "</div>")
            .replace(/\[\[U\]\]/gi, "<u>")
            .replace(/\[\[\/U\]\]/gi, "</u>")
            .replace(/\[\[BR\]\]/gi, "<br/>")
            // Collapse excessive blank lines
            .replace(/\n{3,}/g, '\n\n');
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
                            <span className="px-2 py-0.5 bg-[#1e3a5f] text-white text-[10px] font-bold rounded">변형객관</span>
                            <h1 className="text-lg font-bold text-slate-900">객관식 문제 생성</h1>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={generatedProblems.length === 0}
                        className="px-4 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-bold shadow-lg hover:bg-[#2a4d75] disabled:opacity-50 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4 space-y-6">

                {/* 1. Input Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Exam Title</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setShowTitleSuggestions(true); }}
                                onFocus={() => setShowTitleSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                placeholder="e.g., 2024 March Mock Test #21"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#1e3a5f] outline-none"
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Target Grade</label>
                            <select
                                value={targetGrade}
                                onChange={(e) => setTargetGrade(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm"
                            >
                                {allGrades.map(g => <option key={g.v} value={g.v}>{g.l} ({g.v})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Workbook</label>
                            <button
                                onClick={() => setIncludeWorkbook(!includeWorkbook)}
                                className={`w-full px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${includeWorkbook ? 'bg-[#1e3a5f]/10 border-[#1e3a5f] text-[#1e3a5f]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                                {includeWorkbook ? 'Include Workbook' : 'No Workbook'}
                            </button>
                        </div>
                    </div>

                    {/* Class Selector */}
                    <ClassSelector
                        classes={availableClasses}
                        selectedClassIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                    />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Source Text</label>
                            <div className="flex gap-2">
                                <label className="text-xs font-bold text-[#1e3a5f] cursor-pointer hover:underline">
                                    + Import PDF
                                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>

                        {selectedPdfFile && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-xs">
                                <span className="font-bold text-blue-700 truncate flex-1">{selectedPdfFile.name}</span>
                                <input type="number" className="w-10 p-1 rounded border border-blue-200" value={pdfStartPage} onChange={e => setPdfStartPage(+e.target.value)} />
                                <span>-</span>
                                <input type="number" className="w-10 p-1 rounded border border-blue-200" value={pdfEndPage} onChange={e => setPdfEndPage(+e.target.value)} />
                                <button onClick={handlePdfParse} className="px-2 py-1 bg-[#1e3a5f] text-white rounded font-bold">Go</button>
                            </div>
                        )}

                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={passage}
                                onChange={(e) => setPassage(e.target.value)}
                                placeholder="Paste English text here..."
                                className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
                            />
                            <div className="absolute bottom-2 right-2 flex gap-1">
                                <button onClick={() => applyFormatting('i')} className="p-1.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 font-serif italic text-xs">I</button>
                                <button onClick={() => applyFormatting('u')} className="p-1.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 font-serif underline text-xs">U</button>
                                <button onClick={cleanPassage} className="p-1.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-xs">Cleanup</button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setGenerationMode('auto')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${generationMode === 'auto' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                Auto
                            </button>
                            <button
                                onClick={() => setGenerationMode('manual')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${generationMode === 'manual' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => setGenerationMode('special')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${generationMode === 'special' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                            >
                                ✨ SL
                            </button>
                        </div>

                        {generationMode === 'special' && (
                            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                                <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1">✨ Special Level (지문 변형)</div>
                                <p className="text-[11px] text-amber-600 leading-relaxed">
                                    AI가 원문의 핵심 내용은 유지하면서 어휘와 문장 구조를 선택한 난이도({targetGrade === 'adv' ? 'ADV(상위)' : targetGrade === '3' ? '고3/수능' : targetGrade === '2' ? '고2' : targetGrade === '1' ? '고1' : targetGrade})로 변형합니다.
                                    변형된 지문으로 6개 문제가 자동 생성됩니다.
                                </p>
                            </div>
                        )}

                        {generationMode === 'manual' && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                                {problemTypes.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => toggleType(t.value)}
                                        className={`px-2 py-2 rounded text-xs font-bold border transition-colors ${selectedTypes.includes(t.value) ? 'bg-[#1e3a5f]/10 border-[#1e3a5f] text-[#1e3a5f]' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !passage.trim()}
                            className={`w-full py-3.5 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                generationMode === 'special' 
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                                    : 'bg-[#1e3a5f] hover:bg-[#2a4d75]'
                            }`}
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    {generationMode === 'special' ? '✨ 지문 변형 + 문제 생성 중...' : 'Creating Exams...'}
                                </>
                            ) : (
                                generationMode === 'special' ? '✨ SL 변형문제 생성' : 'Generate Problems'
                            )}
                        </button>
                    </div>
                </div>

                {/* SL: Rewritten Passage Display */}
                {rewrittenPassage && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">✨</span>
                            <h2 className="text-sm font-bold text-amber-800">SL 변형 지문</h2>
                            <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">{targetGrade === 'adv' ? 'ADV(상위)' : targetGrade === '3' ? '고3/수능' : targetGrade === '2' ? '고2' : targetGrade === '1' ? '고1' : targetGrade} 수준</span>
                        </div>
                        {changesSummary && (
                            <p className="text-[11px] text-amber-600 mb-3 p-2 bg-amber-100/50 rounded-lg">📝 {changesSummary}</p>
                        )}
                        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap bg-white p-4 rounded-xl border border-amber-100">
                            {rewrittenPassage}
                        </div>
                    </div>
                )}

                {/* 2. Results List */}
                {generatedProblems.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-bold text-slate-800">Generated Problems</h2>
                            <span className="text-xs font-bold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2.5 py-1 rounded-full">{generatedProblems.length} Items</span>
                        </div>

                        {generatedProblems.map((problem, idx) => (
                            <div key={idx} className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
                                {/* Problem Header */}
                                <div className="bg-[#f5f5f7] border-b border-black/[0.04] px-5 py-3 flex justify-between items-center">
                                    <span className="text-[13px] font-semibold text-[#1d1d1f]">#{idx + 1} {problemTypes.find(t => t.value === problem.type)?.label}</span>
                                </div>

                                <div className="p-5 md:p-6">
                                    {/* Question Text */}
                                    <div
                                        className="text-[15px] leading-relaxed font-sans text-[#1d1d1f] mb-6 whitespace-pre-wrap tracking-[-0.01em]"
                                        dangerouslySetInnerHTML={{ __html: formatQuestionText(problem.question) }}
                                    />

                                    {/* Choices */}
                                    <div className="space-y-2 mb-6">
                                        {problem.choices.map((c, cIdx) => (
                                            <div key={cIdx} className={`flex gap-3 text-[14px] ${cIdx === problem.correctAnswer ? 'font-semibold text-[#1e3a5f]' : 'text-[#1d1d1f]'}`}>
                                                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold ${cIdx === problem.correctAnswer ? 'bg-[#1e3a5f] text-white' : 'bg-[#e5e5ea] text-[#86868b]'}`}>{cIdx + 1}</span>
                                                <span className="flex-1">{c}</span>
                                                {cIdx === problem.correctAnswer && <span className="text-[10px] bg-[#1e3a5f]/10 text-[#1e3a5f] px-1.5 py-0.5 rounded font-bold self-start mt-0.5">Correct</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Explanation Box */}
                                    <div className="pt-4 border-t border-black/[0.04]">
                                        <div className="text-[11px] font-bold text-[#1e3a5f] uppercase mb-2">Analysis</div>
                                        <div className="text-[13px] leading-relaxed text-[#424245] bg-[#1e3a5f]/5 p-3 rounded-xl">{problem.explanation}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .target-sentence { border: 1.5px solid #d2d2d7; padding: 12px; margin-bottom: 12px; font-family: inherit; border-radius: 8px; background: #f5f5f7; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                .box-sentence { border: 1.5px solid #d2d2d7; padding: 12px; margin-bottom: 12px; font-family: inherit; border-radius: 8px; background: #f5f5f7; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                u { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; text-decoration-color: #1d1d1f; }
            `}</style>
        </div>
    );
}
