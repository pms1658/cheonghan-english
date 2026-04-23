
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/common/Logo';
import StructureEditor, { parseAnalysisString, MARK_STYLES } from '@/components/student/StructureEditor';
import { StudentAssignmentData } from '@/hooks/useStudentAssignment';
import VocabularyAssignment from './VocabularyAssignment';
import TransformAssignment from './transform/TransformAssignment';
import SubjectiveAssignment from './subjective/SubjectiveAssignment';
import AnalysisAssignment from './AnalysisAssignment';
import WorkbookAssignmentView from './WorkbookAssignmentView';
import WritingAssignment from './WritingAssignment';
import ListeningSetAssignment from './ListeningSetAssignment';
import SentenceOrderAssignment from './SentenceOrderAssignment';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import FinalPassageView from './FinalPassageView';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonFullPage } from '@/components/common/Skeleton';

/** Resolve student data from props or localStorage fallback (single source of truth) */
const getStudentData = (student: any) =>
    student || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('CHEONGHAN_STUDENT') || '{}') : {});

export default function MobileAssignment({
    assignment,
    loading,
    answers,
    submissionResult,
    targetIndices,
    currentTargetIndexPtr,
    setCurrentTargetIndexPtr,
    isRetryMode,
    handleMarksChange,
    handleTranslationChange,
    handleFormsChange,
    handleSubmit,
    handleRetry,
    debugLog,
    currentActualIndex,
    isFirst,
    isLast,
    completedCount,
    totalSentences,
    student
}: StudentAssignmentData) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClassId = searchParams.get('classId');

    const SENTENCE_FORM_OPTIONS = [
        "1형식", "2형식", "3형식", "4형식", "5형식",
        "3형식 수동태", "4형식 수동태", "5형식 수동태"
    ];

    const [isSentenceDropdownOpen, setIsSentenceDropdownOpen] = useState(false);
    const [isFormDropdownOpen, setIsFormDropdownOpen] = useState(false);
    const [showPassageView, setShowPassageView] = useState(false);
    const prevIndexRef = useRef(currentActualIndex);
    const direction = currentActualIndex > prevIndexRef.current ? 1 : -1;
    if (prevIndexRef.current !== currentActualIndex) {
        prevIndexRef.current = currentActualIndex;
    }

    const attemptsCount = (submissionResult as any)?.attempt || 0;

    if (loading) {
        // Structure reading: show grading UI when assignment is loaded (AI scoring in progress)
        if (assignment) {
            return (
                <div className="fixed inset-0 z-[100] bg-[#0A0E27] flex flex-col items-center justify-center" style={{ top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="w-20 h-20 bg-[#083973] rounded-[1.2rem] flex items-center justify-center p-2 shadow-2xl shadow-blue-900/30 overflow-hidden animate-pulse mb-6">
                        <Logo className="w-full h-full" />
                    </div>
                    <div className="space-y-2 text-center z-10">
                        <h2 className="text-xl font-bold text-white tracking-tight">채점 중...</h2>
                        <p className="text-slate-400 text-xs font-medium leading-relaxed whitespace-pre-line">
                            AI가 정밀하게 분석하고 있습니다.{"\n"}잠시만 기다려주세요!
                        </p>
                    </div>
                    <div className="mt-4 flex justify-center gap-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            );
        }
        // Initial data loading: show skeleton
        return (
            <div className="fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center" style={{ top: 0, left: 0, width: '100vw', height: '100vh' }}>
                <SkeletonFullPage message="학습을 불러오는 중입니다..." />
            </div>
        );
    }

    if (!assignment) return <div className="min-h-screen flex items-center justify-center">N/A</div>;

    // ... (Routing checks for Vocabulary, Transform, Analysis, Workbook remain same) ...
    // Listening Set Assignment Routing
    if (assignment && assignment.type === 'listening_set') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found. Please log in again.</div>;

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <ListeningSetAssignment
                        assignment={assignment as any}
                        onSubmit={(answers) => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Sentence Order Assignment Routing
    if (assignment && assignment.type === 'sentence_order') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found. Please log in again.</div>;

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <SentenceOrderAssignment
                        assignment={assignment as any}
                        studentId={studentData.id}
                        studentName={studentData.name || 'Anonymous'}
                        classId={queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || ''}
                        onComplete={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Vocabulary Assignment Routing
    if (assignment && (assignment.type === 'vocabulary' || assignment.type === 'selection')) {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found. Please log in again.</div>;

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <VocabularyAssignment
                        assignment={assignment as any}
                        student={{
                            id: studentData.id,
                            name: studentData.name || 'Anonymous',
                            classId: studentData.classId || (Array.isArray((studentData as any).classIds) && (studentData as any).classIds.length > 0 ? (studentData as any).classIds[0] : 'individual')
                        }}
                        onExit={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Transform Assignment Routing
    if (assignment && (assignment.type === 'transform' || (assignment as any).type === 'variant_session')) {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found. Please log in again.</div>;

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <TransformAssignment
                        assignment={assignment as any}
                        studentId={studentData.id}
                        studentName={studentData.name || 'Anonymous'}
                        classId={queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || ''}
                        onComplete={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Transform Subjective Assignment Routing
    if (assignment && assignment.type === 'transform_subjective') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found. Please log in again.</div>;

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <SubjectiveAssignment
                        assignment={assignment as any}
                        studentId={studentData.id}
                        studentName={studentData.name || 'Anonymous'}
                        classId={queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || ''}
                        onComplete={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Analysis Assignment Routing
    if (assignment && assignment.type === 'analysis') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found.</div>;

        const analysisData = {
            title: assignment.title,
            passage: assignment.content || '',
            sentences: assignment.sentences.map((s, idx) => {
                if (typeof s === 'string') {
                    return { id: `s-${idx}`, original: s, analyzed: s, translation: '', grammar: [], vocab: [] };
                } else {
                    return { id: (s as any).id || `s-${idx}`, original: s.original, analyzed: s.analyzed, translation: s.translation, grammar: s.grammar, vocab: s.vocab, wordByWord: (s as any).wordByWord, grammarNotes: (s as any).grammarNotes };
                }
            }),
            summaryEn: (assignment as any).summaryEn,
            summaryKr: (assignment as any).summaryKr,
            topic: (assignment as any).topic,
            claim: (assignment as any).claim,
            structure: (assignment as any).structure,
            keyGrammar: (assignment as any).keyGrammar,
            vocabSummary: (assignment as any).vocabSummary,
            examPrediction: (assignment as any).examPrediction,
            tfCheck: (assignment as any).tfCheck,
        };

        return (
            <div className="min-h-screen bg-slate-50">
                <ErrorBoundary>
                    <AnalysisAssignment
                        assignmentId={assignment.id}
                        data={analysisData}
                        studentId={studentData.id}
                        onExit={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Workbook Assignment Routing
    if (assignment && assignment.type === 'workbook') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found.</div>;

        return (
            <div className="min-h-screen bg-slate-50 overflow-y-auto">
                <ErrorBoundary>
                    <WorkbookAssignmentView
                        assignment={assignment as any}
                        studentId={studentData.id}
                        studentName={studentData.name || 'Anonymous'}
                        onComplete={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    // Writing Assignment Routing
    if (assignment && assignment.type === 'writing') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="min-h-screen flex items-center justify-center">Student session not found.</div>;

        return (
            <div className="min-h-screen bg-slate-50 overflow-y-auto">
                <ErrorBoundary>
                    <WritingAssignment
                        assignment={assignment as any}
                        studentId={studentData.id}
                        studentName={studentData.name || 'Anonymous'}
                        classId={queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || ''}
                        onComplete={() => {
                            const finalClassId = queryClassId || studentData.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                    />
                </ErrorBoundary>
            </div>
        );
    }

    if (submissionResult) {
        // ... (Submission Result View remains same) ...
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-40">
                {/* ... Header and Content ... */}
                <header className="relative bg-gradient-to-br from-[#0A0E27] via-[#111827] to-[#0A0E27] p-8 text-white rounded-b-[2rem] shadow-xl overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute top-[-50%] left-[20%] w-[200px] h-[200px] bg-blue-500/20 rounded-full blur-[60px]"></div>
                        <div className="absolute bottom-[-50%] right-[20%] w-[200px] h-[200px] bg-purple-500/20 rounded-full blur-[60px]"></div>
                    </div>
                    <div className="relative z-10 text-center">
                        <div className="text-xs font-bold bg-white/10 backdrop-blur-md text-blue-100 inline-block px-3 py-1 rounded-full mb-3 border border-white/10 shadow-lg tracking-wider">RESULT REPORT</div>
                        <h1 className="text-xl font-bold mb-4">{assignment.title}</h1>
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full transform scale-150"></div>
                            <div className="text-5xl font-black text-yellow-400 flex items-end justify-center gap-1 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                                {submissionResult.totalScore}
                                <span className="text-sm font-bold text-slate-400 pb-2">/100</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-4 space-y-4">
                    {/* View Toggle Buttons */}
                    <div className="flex items-center justify-center gap-2 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-100 shadow-sm">
                        <button
                            onClick={() => setShowPassageView(false)}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                !showPassageView
                                    ? 'bg-[#0A0E27] text-white shadow-md'
                                    : 'bg-transparent text-slate-400'
                            }`}
                        >
                            📋 문장별 상세
                        </button>
                        <button
                            onClick={() => setShowPassageView(true)}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                showPassageView
                                    ? 'bg-[#0A0E27] text-white shadow-md'
                                    : 'bg-transparent text-slate-400'
                            }`}
                        >
                            📖 지문 보기
                        </button>
                    </div>

                    {showPassageView ? (
                        <div className="pb-4">
                            <FinalPassageView
                                sentences={assignment.sentences?.map(s => typeof s === 'string' ? s : s.original) || []}
                                answers={answers}
                                title={assignment.title}
                                studentName={student?.name}
                                studentId={student?.id}
                                assignmentId={assignment.id}
                                score={submissionResult.totalScore}
                                attempt={attemptsCount}
                            />
                        </div>
                    ) : (
                    <>
                    {assignment.sentences?.map((sentenceItem, idx) => {
                        const sentence = typeof sentenceItem === 'string' ? sentenceItem : sentenceItem.original;
                        const result = submissionResult.details[idx];
                        if (!result) return null;
                        return (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                {/* ... Result Content ... */}
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] shadow-inner">
                                            {idx + 1}
                                        </span>
                                        Sentence {idx + 1}
                                    </h3>
                                    <span className={`font-bold ${result.score >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                                        {result.score}점
                                    </span>
                                </div>
                                {/* ... (Rest of result item content) ... */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-end mb-1">
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">내 분석 (My Analysis)</div>
                                        <div className="flex gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                            {Object.values(MARK_STYLES).map(s => (
                                                <div key={s.name} className="flex items-center gap-1">
                                                    <div className={`w-2 h-2 rounded-full ${s.bg}`}></div>
                                                    {s.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pointer-events-none w-full overflow-x-auto text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-700/50 rounded-xl p-2 border border-slate-100 dark:border-slate-600">
                                        <StructureEditor
                                            text={sentence}
                                            initialMarks={answers[idx]?.marks || []}
                                            readOnly={true}
                                            correctMarks={result.correctStructure ? parseAnalysisString(sentence, result.correctStructure) : []}
                                            compareMode={true}
                                            hideLegend={true}
                                        />
                                    </div>
                                </div>


                                {result.correctStructure && (
                                    <div className="bg-green-50/50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 mb-2">
                                        <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">AI 구조 분석</div>
                                        <div className="pointer-events-none bg-white/60 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg p-1 border border-green-100/50 dark:border-green-800/50 mb-1 w-full overflow-x-auto">
                                            <StructureEditor
                                                text={sentence}
                                                initialMarks={parseAnalysisString(sentence, result.correctStructure)}
                                                readOnly={true}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600 mb-2">
                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">문장 형식</div>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-10">내 선택:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(answers[idx]?.selectedForms && answers[idx]?.selectedForms.length > 0) ? answers[idx].selectedForms.map((f: string) => (
                                                    <span key={f} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${(result.correctForms || []).includes(f)
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
                                                        }`}>
                                                        {f}
                                                    </span>
                                                )) : <span className="text-[10px] text-slate-400 dark:text-slate-500">미선택</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-green-600 w-10">정답:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(result.correctForms || []).map((f: string) => (
                                                    <span key={f} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600 mb-2">
                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">내 해석 (My Translation)</div>
                                    <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">
                                        {answers[idx]?.translation || '(해석 미입력)'}
                                    </p>
                                </div>

                                {result.directTranslation && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-2">
                                        <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-1">직독직해 (Direct Translation)</div>
                                        <p className="text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed">
                                            {result.directTranslation.split('/').map((chunk, i) => (
                                                <span key={i} className="inline-block mr-1">
                                                    {chunk.trim()} <span className="text-indigo-300 mx-1">/</span>
                                                </span>
                                            ))}
                                        </p>
                                    </div>
                                )}

                                {(result as any).vocabFeedback && (result as any).vocabFeedback.length > 0 && (
                                    <div className="bg-orange-50/50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800 mb-2">
                                        <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase mb-1">단어 체크</div>
                                        <ul className="space-y-1">
                                            {(result as any).vocabFeedback.map((v: string, vIdx: number) => (
                                                <li key={vIdx} className="text-orange-900 dark:text-orange-200 text-[10px] font-medium">• {v}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase mb-1">AI 총평</div>
                                    <p className="text-blue-900 dark:text-blue-200 text-xs whitespace-pre-wrap leading-relaxed">{result.feedback}</p>
                                </div>
                            </div>
                        );
                    })}
                    </>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl p-4 border-t border-slate-200/50 flex gap-3 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-40 px-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+3.5rem))]">
                    <button
                        onClick={handleRetry}
                        className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl text-sm shadow-sm hover:bg-slate-50 transition-all"
                    >
                        오답 학습 ({submissionResult.details ? submissionResult.details.filter(d => d && d.score < 80).length : 0})
                    </button>
                    <button
                        onClick={() => {
                            const finalClassId = queryClassId || student?.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                            router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                        }}
                        className="flex-1 py-3.5 bg-gradient-to-br from-[#0A0E27] to-[#1e2548] text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-900/20"
                    >
                        나가기
                    </button>
                </div>
            </div>
        );
    }

    const rawSentence = assignment.sentences?.[currentActualIndex] || '';
    const currentSentence = typeof rawSentence === 'string' ? rawSentence : rawSentence.original;
    const currentAnswer = answers[currentActualIndex] || { marks: [], translation: '' };

    return (
        <div className="h-[100dvh] bg-slate-50 font-sans flex flex-col overflow-hidden">
            <header className="fixed top-0 left-0 w-full bg-[#0A0E27] z-50 px-4 py-3 flex items-center justify-between shadow-md h-14">
                <button
                    onClick={() => {
                        const finalClassId = queryClassId || student?.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                        router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                    }}
                    className="text-white/70 p-2 -ml-2"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>

                {/* Sentence Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsSentenceDropdownOpen(!isSentenceDropdownOpen)}
                        className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-white text-sm font-bold border border-white/10 active:bg-white/20 transition-all"
                    >
                        <span>Sentence {currentActualIndex + 1}</span>
                        <svg className={`w-4 h-4 transition-transform ${isSentenceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>

                    {isSentenceDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsSentenceDropdownOpen(false)}></div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-[60vh] overflow-y-auto py-2">
                                {assignment.sentences?.map((_, idx) => {
                                    const isTarget = targetIndices.includes(idx);
                                    if (isRetryMode && !isTarget) return null;
                                    const isActive = idx === currentActualIndex;
                                    const hasAnswer = answers[idx] && (answers[idx].marks.length > 0 || answers[idx].translation.trim().length > 0);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                const ptr = targetIndices.indexOf(idx);
                                                if (ptr !== -1) setCurrentTargetIndexPtr(ptr);
                                                setIsSentenceDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm ${isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span>Sentence {idx + 1}</span>
                                            {hasAnswer && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="w-8"></div> {/* Spacer for centering */}
            </header>



            <div className="pt-16 px-3 bg-slate-50 shrink-0 z-20 pb-2 shadow-sm relative">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">Sentence {currentActualIndex + 1}</span>
                    <div className="flex gap-2">
                        {isRetryMode && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">오답 학습 중</span>}
                        <span className="text-xs text-slate-400 font-medium">{completedCount}/{totalSentences}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto px-3 pb-32 pt-2">
                <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`m-sentence-${currentActualIndex}`}
                    initial={{ opacity: 0, x: direction * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -20 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                >
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0.5 overflow-visible mb-6">
                    <div className="p-1">
                        <StructureEditor
                            key={`editor-${currentActualIndex}`}
                            text={currentSentence}
                            initialMarks={currentAnswer.marks}
                            onChange={(marks) => handleMarksChange(marks, currentActualIndex)}
                        />
                    </div>
                </div>
                <section className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">문장 형식 (다중 선택 가능)</span>
                    </div>

                    <div className="space-y-3">
                        {/* Selected Tags Area */}
                        <div className="flex flex-wrap gap-2">
                            {(currentAnswer.selectedForms || []).map((form, idx) => (
                                <div key={`${form} -${idx} `} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold shadow-sm animate-fadeIn">
                                    <span>{form}</span>
                                    <button
                                        onClick={() => {
                                            const current = currentAnswer.selectedForms || [];
                                            const next = current.filter((_, i) => i !== idx);
                                            handleFormsChange(next, currentActualIndex);
                                        }}
                                        className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center hover:bg-blue-300 transition-colors"
                                    >
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            ))}

                            {/* Add Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsFormDropdownOpen(!isFormDropdownOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-full text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    <span>형식 추가</span>
                                </button>

                                {/* Dropdown List (Scrollable) */}
                                {isFormDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsFormDropdownOpen(false)}
                                        ></div>
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                            {SENTENCE_FORM_OPTIONS.map((form) => (
                                                <button
                                                    key={form}
                                                    onClick={() => {
                                                        const current = currentAnswer.selectedForms || [];
                                                        handleFormsChange([...current, form], currentActualIndex);
                                                        setIsFormDropdownOpen(false); // Close after selection
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group"
                                                >
                                                    {form}
                                                    <span className="opacity-0 group-hover:opacity-100 text-blue-500">+</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <textarea
                        value={currentAnswer.translation}
                        onChange={(e) => handleTranslationChange(e.target.value, currentActualIndex)}
                        placeholder="해석을 입력하세요..."
                        className="w-full p-4 text-sm rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white min-h-[150px] leading-relaxed"
                    />
                </section>
                </motion.div>
                </AnimatePresence>
            </main>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex gap-3 z-[101]">
                <button
                    onClick={() => setCurrentTargetIndexPtr(Math.max(0, currentTargetIndexPtr - 1))}
                    disabled={isFirst}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold disabled:opacity-50"
                >이전</button>
                {isLast ? (
                    <button
                        onClick={handleSubmit}
                        className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold shadow-md shadow-green-200"
                    >{isRetryMode ? '재채점' : '제출하기'}</button>
                ) : (
                    <button
                        onClick={() => setCurrentTargetIndexPtr(Math.min(targetIndices.length - 1, currentTargetIndexPtr + 1))}
                        className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200"
                    >다음</button>
                )}
            </div>
        </div>
    );
}
