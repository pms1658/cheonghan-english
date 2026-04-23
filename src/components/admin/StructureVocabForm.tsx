'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Assignment, AnalysisSentence } from '@/types';
import { AnalysisSentenceRenderer } from './AnalysisSentenceRenderer';
import ClassSelector from './ClassSelector';
import AssignmentImportModal from './AssignmentImportModal';
import { splitSentences, cleanPassageMarkers } from '@/utils/textUtils';
import { toast } from 'sonner';

type FormAssignmentType = 'structure' | 'vocabulary' | 'selection' | 'analysis';

interface StructureVocabFormProps {
    assignmentType: FormAssignmentType;
    classes: { id: string; name: string }[];
    initialClassId?: string;
    onBack: () => void;
    onSave: () => void;
    onClose: () => void;
    initialData?: Assignment | null;
}

interface WordItem { term: string; meaning: string; contextSentence: string; }

export default function StructureVocabForm({
    assignmentType,
    classes,
    initialClassId,
    onBack,
    onSave,
    onClose,
    initialData
}: StructureVocabFormProps) {
    const [step, setStep] = useState<1 | 2>(1);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        selectedClassIds: initialClassId ? [initialClassId] : [] as string[],
        analysisNote: ''
    });

    // Vocab Options
    const [vocabOptions, setVocabOptions] = useState({
        studyMode: 'selection' as 'selection' | 'flashcard',
        failMode: 'accumulate' as 'restart' | 'accumulate',
        testMode: 'default' as 'default' | 'reverse' | 'typing' | 'typing-ko'
    });

    // Sentences (structure/analysis)
    const [parsedSentences, setParsedSentences] = useState<(string | AnalysisSentence)[]>([]);

    // Words (vocabulary/selection)
    const [wordList, setWordList] = useState<WordItem[]>([{ term: '', meaning: '', contextSentence: '' }]);

    // Smart Paste
    const [showSmartPaste, setShowSmartPaste] = useState(false);
    const [pasteContent, setPasteContent] = useState('');

    // PDF & Analysis
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfPageRange, setPdfPageRange] = useState('');
    const [isPdfExtracting, setIsPdfExtracting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisExtras, setAnalysisExtras] = useState<any>(null);

    // Import Modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Title Suggestions
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Theme
    const getThemeColor = () => {
        if (assignmentType === 'selection') return 'emerald';
        if (assignmentType === 'vocabulary') return 'indigo';
        if (assignmentType === 'analysis') return 'lime';
        return 'blue'; // structure
    };
    const themeColor = getThemeColor();

    // Initialize from edit data
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                content: initialData.content || '',
                selectedClassIds: initialData.classIds || (initialData.classId ? [initialData.classId] : []),
                analysisNote: initialData.analysisNote || ''
            });
            if (initialData.type === 'vocabulary' || initialData.type === 'selection') {
                setVocabOptions((initialData as any).vocabConfig || vocabOptions);
            }
            const rawSentences = initialData.sentences || [];
            setParsedSentences(rawSentences);
            if (initialData.words && initialData.words.length > 0) {
                setWordList(initialData.words.map(w => ({
                    term: w.term,
                    meaning: w.meaning,
                    contextSentence: w.contextSentence || ''
                })));
            }
        } else if (initialClassId) {
            setFormData(prev => ({ ...prev, selectedClassIds: [initialClassId] }));
        }
    }, [initialData, initialClassId]);

    // Fetch title suggestions
    useEffect(() => {
        let isMounted = true;
        const fetchSuggestions = async () => {
            try {
                const assignments = await dbService.getAssignments();
                if (!isMounted) return;
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
                    // Fallback: Firestore doc IDs are roughly chronological
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
                console.error("Failed to fetch title suggestions", e);
            }
        };
        fetchSuggestions();
        return () => { isMounted = false; };
    }, []);

    // Handlers
    const handleSmartPaste = () => {
        if (!pasteContent.trim()) return;

        // Helper: 한글 포함 여부 체크
        const hasKorean = (str: string) => /[\uAC00-\uD7AF\u3130-\u318F]/.test(str);
        // Helper: 영어 포함 여부 체크
        const hasEnglish = (str: string) => /[a-zA-Z]/.test(str);
        // Helper: 순수 영어만 (한글 미포함)
        const isPureEnglish = (str: string) => hasEnglish(str) && !hasKorean(str);
        // Helper: 순수 한글만 (영어 미포함)
        const isPureKorean = (str: string) => hasKorean(str) && !hasEnglish(str);

        const lines = pasteContent.trim().split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
        const newWords: WordItem[] = [];

        // ===== 0순위: 교대 줄 패턴 감지 (한글표 복사) =====
        // "apple\n사과\nbanana\n바나나" 형태 자동 감지
        // 조건: 2줄 이상 && 순수영어/순수한글 줄이 교대로 나타남
        if (lines.length >= 2) {
            // 각 줄의 언어 분류
            const lineTypes = lines.map(l => {
                if (l.includes('\t')) return 'tab'; // 탭 있으면 탭 형식
                if (isPureEnglish(l)) return 'eng';
                if (isPureKorean(l)) return 'kor';
                if (hasEnglish(l) && hasKorean(l)) return 'mixed';
                return 'other';
            });

            // 교대 패턴 체크: eng→kor→eng→kor... 또는 kor→eng→kor→eng...
            const pureCount = lineTypes.filter(t => t === 'eng' || t === 'kor').length;
            const isAlternating = pureCount >= lines.length * 0.7 && lines.length >= 2;

            if (isAlternating) {
                // 교대 패턴: 연속된 eng+kor 또는 kor+eng 쌍으로 묶기
                let i = 0;
                while (i < lines.length) {
                    const curType = lineTypes[i];
                    const nextType = i + 1 < lines.length ? lineTypes[i + 1] : null;

                    // 영어→한글 쌍
                    if (curType === 'eng' && nextType === 'kor') {
                        newWords.push({ term: lines[i].trim(), meaning: lines[i + 1].trim(), contextSentence: '' });
                        i += 2;
                        continue;
                    }
                    // 한글→영어 쌍
                    if (curType === 'kor' && nextType === 'eng') {
                        newWords.push({ term: lines[i + 1].trim(), meaning: lines[i].trim(), contextSentence: '' });
                        i += 2;
                        continue;
                    }
                    // 짝이 안 맞는 줄은 단독으로 넣기
                    if (curType === 'eng') {
                        newWords.push({ term: lines[i].trim(), meaning: '', contextSentence: '' });
                    } else if (curType === 'kor') {
                        newWords.push({ term: lines[i].trim(), meaning: '', contextSentence: '' });
                    } else {
                        // mixed나 tab이면 원래 로직으로 처리
                        newWords.push({ term: lines[i].trim(), meaning: '', contextSentence: '' });
                    }
                    i++;
                }

                // 교대 패턴으로 처리 완료 → 바로 결과 적용
                const cleanWords = newWords.filter(w => w.term);
                if (cleanWords.length > 0) {
                    if (wordList.length === 1 && !wordList[0].term) {
                        setWordList(cleanWords);
                    } else {
                        setWordList([...wordList, ...cleanWords]);
                    }
                    setShowSmartPaste(false);
                    setPasteContent('');
                    toast.success(`${cleanWords.length}개 단어가 추가되었습니다.`);
                }
                return; // 교대 패턴이면 여기서 종료
            }
        }

        // ===== 이하 기존 줄별 파싱 로직 =====
        for (const line of lines) {
            let term = '';
            let meaning = '';

            // 1순위: 탭 구분자 (엑셀)
            if (line.includes('\t')) {
                const parts = line.split(/\t/);
                term = parts[0]?.trim() || '';
                meaning = parts.slice(1).join(' ').trim();
            }
            // 2순위: 영어↔한글 혼합 라인 자동 분리
            else if (hasKorean(line) && hasEnglish(line)) {
                // 구분자 패턴: 콜론, 하이픈대시, 파이프 등
                const separatorMatch = line.match(/^(.+?)\s*[:\-–—|]\s*(.+)$/);
                if (separatorMatch) {
                    const left = separatorMatch[1].trim();
                    const right = separatorMatch[2].trim();
                    if (hasEnglish(left) && !hasKorean(left)) {
                        term = left; meaning = right;
                    } else if (hasEnglish(right) && !hasKorean(right)) {
                        term = right; meaning = left;
                    } else {
                        term = left; meaning = right;
                    }
                } else {
                    // 구분자 없으면 영어/한글 경계에서 자동 분리
                    const tokens = line.split(/\s+/);
                    const engTokens: string[] = [];
                    const korTokens: string[] = [];
                    let hitKorean = false;
                    
                    const startsWithEnglish = hasEnglish(tokens[0]) && !hasKorean(tokens[0]);
                    
                    if (startsWithEnglish) {
                        for (const token of tokens) {
                            if (!hitKorean && !hasKorean(token)) {
                                engTokens.push(token);
                            } else {
                                hitKorean = true;
                                korTokens.push(token);
                            }
                        }
                        term = engTokens.join(' ');
                        meaning = korTokens.join(' ');
                    } else {
                        let hitEnglish = false;
                        for (const token of tokens) {
                            if (!hitEnglish && !hasEnglish(token)) {
                                korTokens.push(token);
                            } else {
                                hitEnglish = true;
                                engTokens.push(token);
                            }
                        }
                        term = engTokens.join(' ');
                        meaning = korTokens.join(' ');
                    }
                }
            }
            // 3순위: 순수 한줄 (영어만 or 한글만) → term에 넣기
            else {
                term = line;
                meaning = '';
            }

            if (term.trim()) {
                newWords.push({ term: term.trim(), meaning: meaning.trim(), contextSentence: '' });
            }
        }

        const cleanWords = newWords.filter(w => w.term);
        if (cleanWords.length > 0) {
            if (wordList.length === 1 && !wordList[0].term) {
                setWordList(cleanWords);
            } else {
                setWordList([...wordList, ...cleanWords]);
            }
            setShowSmartPaste(false);
            setPasteContent('');
            toast.success(`${cleanWords.length}개 단어가 추가되었습니다.`);
        }
    };

    const handleAIGenerate = async () => {
        const isLoading = document.getElementById('ai-loading-svf');
        if (isLoading) isLoading.classList.remove('hidden');
        try {
            if (!formData.content.trim()) {
                toast.warning("본문(Context)을 먼저 입력해주세요! AI가 문맥에 맞는 뜻을 찾아줍니다.");
                if (isLoading) isLoading.classList.add('hidden');
                return;
            }
            const res = await fetch('/api/extract-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sentences: [formData.content],
                    providedWords: wordList.filter(w => w.term.trim()).map(w => w.term)
                })
            });
            if (!res.ok) throw new Error('AI Generation Failed');
            const data = await res.json();
            if (data.words) {
                setWordList(data.words.map((w: any) => ({
                    term: w.term,
                    meaning: w.meaning,
                    contextSentence: w.contextSentence || ''
                })));
            }
        } catch (err) {
            toast.error("AI 생성 실패. 잠시 후 다시 시도해주세요.");
            console.error(err);
        } finally {
            if (isLoading) isLoading.classList.add('hidden');
        }
    };

    const handleAnalyzeContent = () => {
        if (!formData.content.trim()) return;
        const cleaned = cleanPassageMarkers(formData.content);
        const sentences = splitSentences(cleaned);
        setParsedSentences(sentences);
        setStep(2);
    };

    const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPdfFile(e.target.files[0]);
        }
    };

    const handlePdfExtract = async () => {
        if (!pdfFile) return;
        setIsPdfExtracting(true);
        try {
            const fd = new FormData();
            fd.append('file', pdfFile);
            let start = 1, end = 9999;
            if (pdfPageRange.trim()) {
                const parts = pdfPageRange.split('-');
                if (parts.length === 2) {
                    start = parseInt(parts[0]) || 1;
                    end = parseInt(parts[1]) || 9999;
                } else {
                    start = parseInt(parts[0]) || 1;
                    end = start;
                }
            }
            fd.append('startPage', start.toString());
            fd.append('endPage', end.toString());
            const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('PDF Extract Failed');
            const data = await res.json();
            setFormData(prev => ({ ...prev, content: (prev.content + '\n' + data.text).trim() }));
        } catch (e) {
            console.error(e);
            toast.error("PDF 추출 실패 (서버 로그 확인 필요)");
        } finally {
            setIsPdfExtracting(false);
        }
    };

    const handleDeepAnalysis = async () => {
        if (!formData.content.trim()) {
            toast.warning("분석할 본문을 먼저 입력해주세요.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/generate-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sentences: [formData.content] })
            });
            if (!res.ok) throw new Error('Analysis Failed');
            const data = await res.json();

            // New format: { title, sentences: [...], structure, keyGrammar, ... }
            if (data.sentences && Array.isArray(data.sentences)) {
                setParsedSentences(data.sentences);
                // Store extended analysis data for saving later
                // NOTE: Do NOT include AI 'title' here — it would overwrite user's title via spread in handleCreateFinal
                setAnalysisExtras({
                    aiTitle: data.title, // stored separately so it doesn't overwrite formData.title
                    summaryEn: data.summaryEn,
                    summaryKr: data.summaryKr,
                    topic: data.topic,
                    claim: data.claim,
                    structure: data.structure,
                    keyGrammar: data.keyGrammar,
                    vocabSummary: data.vocabSummary,
                    examPrediction: data.examPrediction,
                    tfCheck: data.tfCheck,
                    topicSentenceId: data.topicSentenceId,
                });
                // Auto-fill title only if user hasn't entered one
                if (!formData.title && data.title) {
                    setFormData(prev => ({ ...prev, title: data.title }));
                }
                if (data.summaryKr) {
                    setFormData(prev => ({ ...prev, analysisNote: data.summaryKr }));
                }
                setStep(2);
                toast.success('AI 심층 분석 완료!');
            } else if (Array.isArray(data)) {
                // Legacy format fallback
                setParsedSentences(data);
                setStep(2);
            } else {
                console.warn("Unknown AI Response format:", data);
                toast.success("AI 분석 완료 (결과 형식이 예상과 다릅니다)");
            }
        } catch (e) {
            console.error(e);
            toast.error("AI 분석 실패. 잠시 후 다시 시도해주세요.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImportSelect = (imported: Assignment) => {
        if (!confirm(`'${imported.title}' 과제의 내용을 불러오시겠습니까? 현재 작성 중인 내용은 덮어씌워집니다.`)) return;
        setFormData(prev => ({
            ...prev,
            title: `[복사본] ${imported.title}`,
            content: imported.content || '',
        }));
        if (imported.sentences) setParsedSentences(imported.sentences);
        if (imported.words) {
            setWordList(imported.words.map(w => ({
                term: w.term, meaning: w.meaning, contextSentence: w.contextSentence || ''
            })));
        }
        if ((imported as any).vocabConfig) setVocabOptions((imported as any).vocabConfig);
        setIsImportModalOpen(false);
        setStep(1);
    };

    const handleCreateFinal = async () => {
        if (formData.selectedClassIds.length === 0) {
            toast.error('오류: 클래스가 선택되지 않았습니다.');
            return;
        }
        if ((assignmentType === 'structure' || assignmentType === 'analysis') && parsedSentences.length === 0) {
            toast.error('오류: 문장이 분석되지 않았습니다. [문장 나누기]를 먼저 클릭해주세요.');
            return;
        }
        if ((assignmentType === 'vocabulary' || assignmentType === 'selection') && wordList.filter(w => w.term && w.term.trim()).length === 0) {
            toast.error('오류: 단어가 입력되지 않았습니다. 최소 1개 이상의 단어를 등록해주세요.');
            return;
        }
        try {
            // Deep-clean data for Firestore (rejects undefined at any depth)
            const cleanForFirestore = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) return obj.map(cleanForFirestore);
                if (typeof obj === 'object' && obj !== null) {
                    const cleaned: any = {};
                    for (const [k, v] of Object.entries(obj)) {
                        if (v !== undefined) cleaned[k] = cleanForFirestore(v);
                    }
                    return cleaned;
                }
                return obj;
            };

            const fullTitle = formData.title || `${assignmentType === 'selection' ? '단어 선택' : '단어장'} 과제`;
            const commonData: any = cleanForFirestore({
                title: fullTitle,
                content: formData.content,
                sentences: parsedSentences,
                deadline: '',
                studentIds: [],
                type: assignmentType,
                ...(assignmentType === 'vocabulary' || assignmentType === 'selection' ? {
                    vocabConfig: vocabOptions,
                    words: wordList.filter(w => w.term && w.term.trim() !== ''),
                } : {}),
                analysisNote: formData.analysisNote || '',
                // Extended deep analysis fields
                ...((analysisExtras && assignmentType === 'analysis')
                    ? Object.fromEntries(Object.entries(analysisExtras).filter(([, v]) => v !== undefined))
                    : {}),
            });
            if (initialData?.id) {
                await dbService.updateAssignment(initialData.id, {
                    ...commonData,
                    classIds: formData.selectedClassIds
                } as any);
            } else {
                const promises = formData.selectedClassIds.map(clsId =>
                    dbService.addAssignment({
                        ...commonData,
                        classIds: [clsId],
                        status: 'assigned'
                    } as any)
                );
                await Promise.all(promises);
            }
            toast.success("과제가 성공적으로 저장되었습니다.");
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Create Assignment Error:', error);
            toast.error(`과제 저장 중 오류가 발생했습니다: ${error.message || error}`);
        }
    };

    const isVocab = assignmentType === 'vocabulary' || assignmentType === 'selection';
    const isStructureType = assignmentType === 'structure' || assignmentType === 'analysis';

    const typeLabels: Record<string, string> = {
        structure: 'STRUCTURE',
        vocabulary: 'VOCABULARY',
        selection: 'SELECTION',
        analysis: 'ANALYSIS'
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="px-8 py-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (initialData) onClose();
                            else onBack();
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {initialData ? '과제 수정' : '새 과제 만들기'}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-${themeColor}-100 text-${themeColor}-700`}>
                                {typeLabels[assignmentType]}
                            </span>
                        </h2>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!initialData && (
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="mr-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 text-sm flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                            불러오기
                        </button>
                    )}

                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 text-sm">
                            이전
                        </button>
                    )}

                    {(step === 1 && isStructureType) ? (
                        <button onClick={handleAnalyzeContent} className={`px-4 py-2 bg-${themeColor}-600 text-white font-bold rounded-lg hover:brightness-110 text-sm`}>
                            다음: 문장 분석
                        </button>
                    ) : (
                        <button onClick={handleCreateFinal} className={`px-4 py-2 bg-${themeColor}-600 text-white font-bold rounded-lg hover:brightness-90 text-sm`}>
                            저장 완료
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    {step === 1 ? (
                        <div className="space-y-8">
                            {/* Class Selection */}
                            <ClassSelector
                                classes={classes.map(c => ({ id: c.id, name: c.name }))}
                                selectedClassIds={formData.selectedClassIds}
                                onChange={(ids: string[]) => setFormData({ ...formData, selectedClassIds: ids })}
                            />

                            {/* Title Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">과제 제목</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => {
                                            setFormData({ ...formData, title: e.target.value });
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
                                        placeholder="예) 3/14 수업 단어, 올림포스 1강"
                                    />
                                    {showSuggestions && titleSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[320px] overflow-y-auto">
                                            {titleSuggestions
                                                .filter(t => t.toLowerCase().includes(formData.title.toLowerCase()))
                                                .map((title, i) => (
                                                    <div
                                                        key={i}
                                                        onMouseDown={() => {
                                                            setFormData(prev => ({ ...prev, title }));
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        {title}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vocab Options */}
                            {isVocab && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={vocabOptions.failMode === 'accumulate'}
                                                onChange={e => setVocabOptions({ ...vocabOptions, failMode: e.target.checked ? 'accumulate' : 'restart' })}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="font-bold">오답 복습 (틀린 문제만 재시험, 100점 목표)</span>
                                        </label>
                                    </div>

                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <label className="block text-sm font-bold text-slate-700 mb-3">시험 모드 설정</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {([
                                                { key: 'default', label: '객관식 (뜻 찾기)', sub: 'English → Korean', icon: '📝' },
                                                { key: 'reverse', label: '리버스 (단어 찾기)', sub: 'Korean → English', icon: '🔄' },
                                                { key: 'typing', label: '타이핑 (스펠링)', sub: 'Type English Word', icon: '⌨️' },
                                                { key: 'typing-ko', label: '뜻 쓰기 (AI 채점)', sub: 'English → 한글 주관식', icon: '🤖' },
                                            ] as const).map(mode => (
                                                <button
                                                    key={mode.key}
                                                    onClick={() => setVocabOptions({ ...vocabOptions, testMode: mode.key })}
                                                    className={`p-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-center gap-1 ${vocabOptions.testMode === mode.key
                                                        ? `bg-${themeColor}-50 border-${themeColor}-500 text-${themeColor}-700 ring-1 ring-${themeColor}-500`
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <span className="text-lg">{mode.icon}</span>
                                                    <span>{mode.label}</span>
                                                    <span className="text-[10px] font-normal opacity-70">{mode.sub}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Analysis Note (analysis type only) */}
                            {assignmentType === 'analysis' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        지문 전체 해설 / 요약
                                        <span className="text-xs font-normal text-slate-400 ml-2">AI 분석 시 자동 생성됩니다.</span>
                                    </label>
                                    <textarea
                                        value={formData.analysisNote}
                                        onChange={e => setFormData({ ...formData, analysisNote: e.target.value })}
                                        placeholder="지문의 전체적인 내용 요약이나 해설을 입력하세요."
                                        className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 leading-relaxed resize-none"
                                    />
                                </div>
                            )}

                            {/* Content & PDF */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                    <label className="block text-sm font-bold text-slate-700">본문 데이터 입력</label>
                                    <div className="flex gap-2 mb-2 items-center flex-wrap">
                                        <input type="file" accept=".pdf" onChange={handlePdfFileChange}
                                            className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                        <input type="text" placeholder="페이지 (예: 1-3)" value={pdfPageRange}
                                            onChange={(e) => setPdfPageRange(e.target.value)}
                                            className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <button onClick={handlePdfExtract} disabled={!pdfFile || isPdfExtracting}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
                                            {isPdfExtracting ? '추출 중...' : 'PDF 텍스트 추출'}
                                        </button>
                                        {isStructureType && (
                                            <button onClick={handleDeepAnalysis} disabled={!formData.content.trim() || isAnalyzing}
                                                className="ml-auto px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 transition-colors shadow-sm">
                                                {isAnalyzing ? (
                                                    <><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>분석 중...</>
                                                ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>AI Deep Analysis</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-48 px-4 py-4 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-serif text-base leading-relaxed resize-none"
                                    placeholder={isStructureType ? "구문 분석할 지문을 입력하세요." : "단어가 포함된 지문(Context)을 입력하세요. AI가 이 문맥을 보고 뜻을 생성합니다."}
                                />
                            </div>

                            {/* Vocab Word List */}
                            {isVocab && (
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-end">
                                        <label className="block text-lg font-bold text-slate-800">단어 목록</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowSmartPaste(!showSmartPaste)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 font-bold rounded-lg hover:bg-green-100 text-xs transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                                스마트 복사
                                            </button>
                                            <button onClick={handleAIGenerate}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 text-xs transition-colors border border-indigo-100">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                AI 뜻/예문 생성
                                            </button>
                                            <div id="ai-loading-svf" className="hidden text-xs text-indigo-500 font-bold animate-pulse flex items-center">생성 중...</div>
                                        </div>
                                    </div>

                                    {showSmartPaste && (
                                        <div className="p-4 bg-green-50 rounded-xl border border-green-100 animate-fadeIn">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-bold text-green-700">엑셀/한글/워드 표, 또는 영어+한글 형식의 단어 목록을 붙여넣으세요</span>
                                                <button onClick={() => setShowSmartPaste(false)} className="text-xs text-green-500">닫기</button>
                                            </div>
                                            <textarea className="w-full h-32 p-3 rounded-lg border border-green-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                placeholder={`apple\t사과\nbanana\t바나나\n또는\napple 사과\na lot of 많은\n사과 apple`}
                                                value={pasteContent} onChange={e => setPasteContent(e.target.value)} />
                                            <button onClick={handleSmartPaste} className="mt-2 w-full py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm">
                                                목록에 추가하기
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {wordList.map((word, idx) => (
                                            <div key={idx} className="flex gap-2 group">
                                                <div className="grid grid-cols-12 gap-2 flex-1">
                                                    <input placeholder="단어 (Term)" value={word.term}
                                                        onChange={e => { const newL = [...wordList]; newL[idx].term = e.target.value; setWordList(newL); }}
                                                        className="col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:bg-white transition-colors" />
                                                    <input placeholder="의미 (Meaning)" value={word.meaning}
                                                        onChange={e => { const newL = [...wordList]; newL[idx].meaning = e.target.value; setWordList(newL); }}
                                                        className="col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white transition-colors" />
                                                    <input placeholder="예문 (Context Sentence - AI가 문맥에서 추출)" value={word.contextSentence}
                                                        onChange={e => { const newL = [...wordList]; newL[idx].contextSentence = e.target.value; setWordList(newL); }}
                                                        className="col-span-6 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-serif italic text-slate-600 focus:bg-white transition-colors" />
                                                </div>
                                                <button onClick={() => setWordList(wordList.filter((_, i) => i !== idx))}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={() => setWordList([...wordList, { term: '', meaning: '', contextSentence: '' }])}
                                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                            단어 추가하기
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Step 2: Sentence review */
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">문장 분석 확인</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    {parsedSentences.map((sen, idx) => {
                                        if (typeof sen === 'string') {
                                            return (
                                                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="flex gap-4">
                                                        <span className="text-slate-400 font-bold w-6">{idx + 1}</span>
                                                        <p className="flex-1 text-slate-800 leading-relaxed">{sen}</p>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-3">
                                                        <span className="text-teal-600 font-bold font-mono">#{idx + 1}</span>
                                                        <div className="flex-1">
                                                            <div className="text-slate-800 font-medium text-lg leading-relaxed mb-1">
                                                                <AnalysisSentenceRenderer text={sen.analyzed || sen.original} />
                                                            </div>
                                                            <p className="text-slate-500 text-sm italic">{sen.translation}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                                        <div className="p-3">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Grammar Points</span>
                                                            <ul className="list-disc list-inside space-y-1">
                                                                {sen.grammar?.map((g, i) => (
                                                                    <li key={i} className="text-xs text-slate-600 leading-snug">{g}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="p-3">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Vocabulary</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {sen.vocab?.map((v, i) => (
                                                                    <span key={i} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                                                                        <b>{v.word}</b>: {v.meaning}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {isImportModalOpen && (
                <AssignmentImportModal
                    onClose={() => setIsImportModalOpen(false)}
                    onSelect={handleImportSelect}
                    classes={classes}
                />
            )}
        </div>
    );
}
