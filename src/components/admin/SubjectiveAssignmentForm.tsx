'use client';

import { useState, useRef, useEffect } from 'react';
import { SubjectiveProblemType, SubjectiveProblem } from '@/types';
import { dbService } from '@/services/db';
import ClassSelector from './ClassSelector';
import { toast } from 'sonner';

interface SubjectiveAssignmentFormProps {
    selectedClass: any;
    onBack: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
}

const PROBLEM_TYPE_LABELS: { value: SubjectiveProblemType; label: string; desc: string }[] = [
    { value: 'eng_composition', label: '영작', desc: '한글 뜻 + 문법 조건 → 영작' },
    { value: 'sentence_interpretation', label: '해석 서술', desc: '문장 해석 및 의미 서술' },
    { value: 'grammar_correction', label: '어법 교정', desc: '6개 중 틀린 3개 + 이유' },
    { value: 'blank_fill', label: '빈칸 서술', desc: '빈칸에 직접 단어 작성' },
    { value: 'pronoun_reference', label: '지칭 추론', desc: '대명사 가리키는 대상 서술' },
    { value: 'summary_completion', label: '요약문 완성', desc: '요약문 빈칸 직접 작성' },
    { value: 'sentence_transform', label: '문장 전환', desc: '능동↔수동, 분사구문 등' },
];

const ALL_GRADES = [
    { v: 'e4', l: 'E4' }, { v: 'e5', l: 'E5' }, { v: 'e6', l: 'E6' },
    { v: 'm1', l: 'M1' }, { v: 'm2', l: 'M2' }, { v: 'm3', l: 'M3' },
    { v: '1', l: 'H1' }, { v: '2', l: 'H2' }, { v: '3', l: 'H3' },
    { v: 'adv', l: 'ADV' }
];

export default function SubjectiveAssignmentForm({
    selectedClass,
    onBack,
    onSave,
    initialData
}: SubjectiveAssignmentFormProps) {
    const [passage, setPassage] = useState(initialData?.content || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [targetGrade, setTargetGrade] = useState<string>(initialData?.targetGrade || '3');
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>(
        initialData?.subjectiveConfig?.problemTypes?.length > 0 ? 'manual' : 'auto'
    );
    const [selectedTypes, setSelectedTypes] = useState<SubjectiveProblemType[]>(
        initialData?.subjectiveConfig?.problemTypes || []
    );
    const [generatedProblems, setGeneratedProblems] = useState<SubjectiveProblem[]>(
        initialData?.subjectiveProblems || []
    );
    const [modifiedPassage, setModifiedPassage] = useState<string>(initialData?.modifiedPassage || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPdfParsing, setIsPdfParsing] = useState(false);
    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
    const [pdfStartPage, setPdfStartPage] = useState(1);
    const [pdfEndPage, setPdfEndPage] = useState(1);

    // Classes
    const [availableClasses, setAvailableClasses] = useState<{id: string; name: string}[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
        selectedClass ? [selectedClass.id] : (initialData?.classIds || [])
    );

    // Title suggestions
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                    if (a.title && !seen.has(a.title)) { seen.add(a.title); titles.push(a.title); }
                });
                setTitleSuggestions(titles);
            } catch (e) { console.error(e); }
        };
        fetchTitles();
        return () => { alive = false; };
    }, []);

    const toggleType = (type: SubjectiveProblemType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleGenerate = async () => {
        if (!passage.trim()) return toast.warning('지문을 입력해주세요.');
        if (generationMode === 'manual' && selectedTypes.length === 0) return toast.warning('유형을 선택해주세요.');

        setIsGenerating(true);
        setGeneratedProblems([]);
        try {
            const res = await fetch('/api/generate-subjective-problems', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    passage: passage.trim(),
                    targetGrade,
                    mode: generationMode,
                    problemTypes: generationMode === 'manual' ? selectedTypes : [],
                    source: 'transform'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '생성 실패');
            }

            const data = await res.json();
            setGeneratedProblems(data.problems || []);
            setModifiedPassage(data.modifiedPassage || '');
            toast.success(`${(data.problems || []).length}개 문제가 생성되었습니다.`);
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || generatedProblems.length === 0) return toast.warning('제목과 문제를 확인해주세요.');

        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        await onSave({
            title,
            deadline: nextWeek.toISOString().split('T')[0],
            category: 'sat',
            type: 'transform_subjective',
            content: passage,
            targetGrade,
            sentences: [],
            classIds: selectedClassIds,
            subjectiveConfig: {
                problemTypes: generatedProblems.map(p => p.type),
                totalProblems: generatedProblems.length
            },
            subjectiveProblems: generatedProblems,
            modifiedPassage: modifiedPassage
        });
    };

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
            toast.error('PDF 파싱 실패');
        } finally {
            setIsPdfParsing(false);
        }
    };

    const getTypeLabel = (type: string) => PROBLEM_TYPE_LABELS.find(t => t.value === type)?.label || type;

    const formatPassageHtml = (text: string) => {
        if (!text) return '';
        return text
            .replace(/\[\[UL:\(([a-f])\)\]\]/gi, '<u class="grammar-underline" data-label="$1"><span class="grammar-label">($1)</span> ')
            .replace(/\[\[\/UL\]\]/gi, '</u>');
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
                            <span className="px-2 py-0.5 bg-[#1e3a5f] text-white text-[10px] font-bold rounded">변형주관</span>
                            <h1 className="text-lg font-bold text-slate-900">주관식 문제 생성</h1>
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
                                placeholder="e.g., 2024 1학기 중간고사 서술형"
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
                                onChange={(e) => setTargetGrade(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm"
                            >
                                {ALL_GRADES.map(g => <option key={g.v} value={g.v}>{g.l} ({g.v})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">문제 수</label>
                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm text-slate-500">
                                {generationMode === 'auto' ? '7문제 (전체)' : `${selectedTypes.length}문제 선택`}
                            </div>
                        </div>
                    </div>

                    <ClassSelector
                        classes={availableClasses}
                        selectedClassIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                    />

                    {/* Source Text */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Source Text</label>
                            <label className="text-xs font-bold text-[#1e3a5f] cursor-pointer hover:underline">
                                + Import PDF
                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)} />
                            </label>
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

                        <textarea
                            ref={textareaRef}
                            value={passage}
                            onChange={(e) => setPassage(e.target.value)}
                            placeholder="Paste English text here..."
                            className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
                        />
                    </div>

                    {/* Generation Mode */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setGenerationMode('auto')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${generationMode === 'auto' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                Auto (7문제)
                            </button>
                            <button
                                onClick={() => setGenerationMode('manual')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${generationMode === 'manual' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                Manual (유형 선택)
                            </button>
                        </div>

                        {generationMode === 'manual' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                {PROBLEM_TYPE_LABELS.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => toggleType(t.value)}
                                        className={`px-2 py-2.5 rounded-lg text-xs font-bold border transition-colors text-left ${selectedTypes.includes(t.value) ? 'bg-[#1e3a5f]/10 border-[#1e3a5f] text-[#1e3a5f]' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        <div>{t.label}</div>
                                        <div className="text-[10px] font-medium opacity-70 mt-0.5">{t.desc}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !passage.trim()}
                            className="w-full py-3.5 bg-[#1e3a5f] text-white rounded-xl font-bold shadow-md hover:bg-[#2a4d75] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    서술형 문제 생성 중...
                                </>
                            ) : (
                                '✏️ 서술형 문제 생성'
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. Generated Problems Preview */}
                {generatedProblems.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-bold text-slate-800">생성된 문제</h2>
                            <span className="text-xs font-bold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2.5 py-1 rounded-full">{generatedProblems.length} Items</span>
                        </div>

                        {generatedProblems.map((problem, idx) => (
                            <div key={idx} className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
                                <div className="bg-[#f5f5f7] border-b border-black/[0.04] px-5 py-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-[#1e3a5f] text-white rounded-md flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                        <span className="text-[13px] font-semibold text-[#1d1d1f]">{getTypeLabel(problem.type)}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400">{problem.points}점</span>
                                </div>
                                <div className="p-5 md:p-6 space-y-3">
                                    <p className="text-[13px] font-bold text-slate-700">{problem.instruction}</p>

                                    {/* Type-specific previews */}
                                    {problem.type === 'eng_composition' && (
                                        <div className="space-y-2">
                                            <div className="bg-blue-50 p-3 rounded-xl text-sm text-blue-900">{problem.koreanMeaning}</div>
                                            {problem.grammarCondition && (
                                                <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">📌 조건: {problem.grammarCondition}</div>
                                            )}
                                            {problem.hintWords && problem.hintWords.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {problem.hintWords.map((w, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{w}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="text-xs text-slate-400">원문: {problem.originalSentence}</div>
                                        </div>
                                    )}

                                    {problem.type === 'sentence_interpretation' && (
                                        <div className="space-y-2">
                                            <div className="bg-slate-50 p-3 rounded-xl text-[15px] leading-relaxed italic text-slate-800">{problem.targetSentence}</div>
                                            <div className="text-xs text-slate-400">모범답안: {problem.modelAnswer}</div>
                                        </div>
                                    )}

                                    {problem.type === 'grammar_correction' && (
                                        <div className="space-y-2">
                                            <div
                                                className="bg-slate-50 p-3 rounded-xl text-sm leading-relaxed text-slate-800"
                                                dangerouslySetInnerHTML={{ __html: formatPassageHtml(problem.passageWithUnderlines || '') }}
                                            />
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {problem.grammarItems?.map((item, gi) => (
                                                    <div key={gi} className={`text-[11px] px-2 py-1 rounded ${item.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {item.label} {item.underlinedText} → {item.isCorrect ? '✓' : `✗ ${item.correctForm}`}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {problem.type === 'blank_fill' && (
                                        <div className="space-y-2">
                                            <div className="bg-slate-50 p-3 rounded-xl text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{problem.passageWithBlank}</div>
                                            <div className="text-xs text-slate-400">정답: {problem.blankAnswer}</div>
                                        </div>
                                    )}

                                    {problem.type === 'pronoun_reference' && (
                                        <div className="space-y-2">
                                            <div className="bg-slate-50 p-3 rounded-xl text-sm leading-relaxed text-slate-800">{problem.pronounSentence}</div>
                                            <div className="text-xs text-slate-400">밑줄: {problem.underlinedPronoun} → 정답: {problem.referenceAnswer}</div>
                                        </div>
                                    )}

                                    {problem.type === 'summary_completion' && (
                                        <div className="space-y-2">
                                            <div className="bg-slate-50 p-3 rounded-xl text-sm leading-relaxed text-slate-800">{problem.summaryText}</div>
                                            <div className="text-xs text-slate-400">
                                                {problem.blankAnswers?.map(b => `(${b.label}): ${b.answer}`).join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {problem.type === 'sentence_transform' && (
                                        <div className="space-y-2">
                                            <div className="bg-slate-50 p-3 rounded-xl text-sm leading-relaxed text-slate-800 italic">{problem.originalForTransform || (problem as any).originalSentence}</div>
                                            {problem.transformCondition && (
                                                <div className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg">📌 조건: {problem.transformCondition}</div>
                                            )}
                                            <div className="text-xs text-slate-400">모범답안: {problem.transformedAnswer}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .grammar-underline { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; text-decoration-color: #1e3a5f; }
                .grammar-label { font-weight: 700; color: #1e3a5f; font-size: 12px; margin-right: 2px; }
            `}</style>
        </div>
    );
}
