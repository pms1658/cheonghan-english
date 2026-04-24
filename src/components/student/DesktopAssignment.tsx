import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StructureEditor, { parseAnalysisString, MARK_STYLES } from './StructureEditor';
import Logo from '@/components/common/Logo';
import { StudentAssignmentData } from '@/hooks/useStudentAssignment';
import VocabularyAssignment from './VocabularyAssignment';
import TransformAssignment from './transform/TransformAssignment';
import SubjectiveAssignment from './subjective/SubjectiveAssignment';
import WorkbookAssignmentView from './WorkbookAssignmentView';
import WritingAssignment from './WritingAssignment';
import AnalysisAssignment from './AnalysisAssignment';
import ListeningSetAssignment from './ListeningSetAssignment';
import SentenceOrderAssignment from './SentenceOrderAssignment';
import FinalPassageView from './FinalPassageView';
import { motion, AnimatePresence } from 'framer-motion';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { dbService } from '@/services/db';
import { SkeletonFullPage } from '@/components/common/Skeleton';

/** Resolve student data from props or localStorage fallback (single source of truth) */
const getStudentData = (student: any) =>
    student || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('CHEONGHAN_STUDENT') || '{}') : {});

export default function DesktopAssignment({
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
    student,
    currentActualIndex,
    isFirst,
    isLast,
    completedCount,
    totalSentences,
    attemptsCount
}: StudentAssignmentData) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClassId = searchParams.get('classId');

    const SENTENCE_FORM_OPTIONS = [
        "1형식", "2형식", "3형식", "4형식", "5형식",
        "3형식 수동태", "4형식 수동태", "5형식 수동태"
    ];

    const [isFormDropdownOpen, setIsFormDropdownOpen] = useState(false);
    const [showPassageView, setShowPassageView] = useState(false);
    const prevIndexRef = useRef(currentActualIndex);
    const direction = currentActualIndex > prevIndexRef.current ? 1 : -1;
    // Update ref after calculating direction
    if (prevIndexRef.current !== currentActualIndex) {
        prevIndexRef.current = currentActualIndex;
    }

    const getAttemptLabel = () => {
        const currentAttempt = attemptsCount + 1;
        if (currentAttempt === 1) return '1차 시도 (본시험)';
        if (currentAttempt === 2) return '2차 시도 (재시 1 - 오답 집중)';
        if (currentAttempt === 3) return '3차 시도 (재시 2 - 마지막 기회)';
        return `${currentAttempt}차 시도 (추가)`;
    };

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
        return <SkeletonFullPage message="학습을 불러오는 중입니다..." />;
    }

    if (!assignment) return <div className="flex-1 flex items-center justify-center min-h-[60vh]">Assignment not found</div>;

    // Vocabulary Assignment Routing
    if (assignment && (assignment.type === 'vocabulary' || assignment.type === 'selection')) {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
                <ErrorBoundary>
                    <VocabularyAssignment
                        assignment={assignment as any}
                        student={{
                            id: studentData.id,
                            name: studentData.name || 'Anonymous',
                            classId: studentData.classId || (Array.isArray((studentData as any).classIds) ? (studentData as any).classIds[0] : '')
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

    // Listening Set Assignment Routing
    if (assignment && assignment.type === 'listening_set') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
                <ErrorBoundary>
                    <ListeningSetAssignment
                        assignment={assignment as any}
                        onSubmit={(answers) => {
                            // Don't navigate — let the child show its own results screen
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

    // Sentence Order Assignment Routing
    if (assignment && assignment.type === 'sentence_order') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
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

    // Transform Assignment Routing
    if (assignment && assignment.type === 'transform') {
        const studentData = getStudentData(student);
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
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
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
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
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found.</div>;

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
            // Extended deep analysis fields
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
            <div className="bg-slate-50">
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
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
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
        if (!studentData.id) return <div className="flex-1 flex items-center justify-center min-h-[40vh]">Student session not found. Please log in again.</div>;

        return (
            <div className="bg-slate-50">
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
        const passageSentences = assignment.sentences?.map((s: any) => typeof s === 'string' ? s : s.original) || [];

        return (
            <div className="bg-slate-100 dark:bg-slate-950 py-10 px-4 flex justify-center items-start overflow-y-auto font-sans">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-4xl w-full overflow-hidden print:hidden">
                    <div className="relative bg-[#0A0E27] p-6 text-white text-center">
                        <div className="relative z-10">
                            <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] mb-3 border border-white/10">RESULT REPORT</div>
                            <h1 className="text-xl font-bold mb-4 text-white">{assignment.title}</h1>
                            <div className="flex justify-center items-baseline gap-2">
                                <span className="text-5xl font-black text-yellow-400 tracking-tighter">{submissionResult.totalScore}</span>
                                <span className="text-lg text-slate-400 font-medium">/ 100</span>
                            </div>
                        </div>
                    </div>

                    {/* View Toggle Buttons */}
                    <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 border-b border-slate-100">
                        <button
                            onClick={() => setShowPassageView(false)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                                !showPassageView
                                    ? 'bg-[#0A0E27] text-white shadow-lg'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            📋 문장별 상세
                        </button>
                        <button
                            onClick={() => setShowPassageView(true)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                                showPassageView
                                    ? 'bg-[#0A0E27] text-white shadow-lg'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            📖 지문 보기 (최종 성적표)
                        </button>
                    </div>

                    {showPassageView ? (
                        <div className="p-8">
                            <FinalPassageView
                                sentences={passageSentences}
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
                    <div className="p-4 space-y-3">
                        {assignment.sentences?.map((sentenceItem, idx) => {
                            const sentence = typeof sentenceItem === 'string' ? sentenceItem : sentenceItem.original;
                            const result = submissionResult.details[idx];
                            if (!result) return null;
                            return (
                                <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs shadow-inner">
                                                {idx + 1}
                                            </span>
                                            Sentence {idx + 1}
                                        </h3>
                                        <span className={`font-bold text-lg ${result.score >= 80 ? 'text-green-600 drop-shadow-sm' : 'text-red-500 drop-shadow-sm'}`}>
                                            {result.score}점
                                        </span>
                                    </div>

                                    <div className="flex gap-4 mb-2">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">내 분석 (My Analysis)</div>
                                                <div className="flex gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                    {Object.values(MARK_STYLES).map(s => (
                                                        <div key={s.name} className="flex items-center gap-1">
                                                            <div className={`w-2 h-2 rounded-full ${s.bg}`}></div>
                                                            {s.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="pointer-events-none rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 overflow-hidden pb-2">
                                                <div className="mb-[-4%]" style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '138.9%' }}>
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
                                        </div>
                                    </div>

                                    {result.correctStructure && (
                                        <div className="bg-green-50/50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800 mb-2">
                                            <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">AI 구조 분석 (Correct Structure)</div>
                                            <div className="pointer-events-none mb-2 bg-white/60 dark:bg-slate-700/50 rounded-lg border border-green-100/50 dark:border-green-800/50 overflow-hidden pb-2">
                                                <div className="mb-[-4%]" style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '138.9%' }}>
                                                    <StructureEditor
                                                        text={sentence}
                                                        initialMarks={parseAnalysisString(sentence, result.correctStructure)}
                                                        readOnly={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">문장 형식 (Sentence Form)</div>
                                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                                            <div className="flex items-center gap-1.5 pr-3">
                                                <span className="text-[10px] font-bold text-slate-400">내 선택:</span>
                                                {(answers[idx]?.selectedForms && answers[idx]?.selectedForms.length > 0) ? answers[idx].selectedForms.map((f: string) => (
                                                    <span key={f} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${(result.correctForms || []).includes(f)
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
                                                        }`}>{f}</span>
                                                )) : <span className="text-[10px] text-slate-400">미선택</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 pl-3">
                                                <span className="text-[10px] font-bold text-green-600">정답:</span>
                                                {(result.correctForms || []).map((f: string) => (
                                                    <span key={f} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">{f}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">내 해석 (My Translation)</div>
                                        <p className="text-slate-800 dark:text-slate-200 text-[13px] whitespace-pre-wrap leading-relaxed">
                                            {answers[idx]?.translation || '(해석을 입력하지 않았습니다)'}
                                        </p>
                                    </div>

                                    {result.directTranslation && (
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-2">
                                            <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">직독직해 (Direct Translation)</div>
                                            <p className="text-indigo-900 dark:text-indigo-200 text-[13px] font-medium leading-relaxed">
                                                {result.directTranslation.split('/').map((chunk, i) => (
                                                    <span key={i} className="inline-block mr-1">
                                                        {chunk.trim()} <span className="text-indigo-300 mx-0.5">/</span>
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                    )}

                                    {(result as any).vocabFeedback && (result as any).vocabFeedback.length > 0 && (
                                        <div className="bg-orange-50/50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800 mb-2">
                                            <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                단어 체크 (Vocabulary)
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                                                {(result as any).vocabFeedback.map((v: string, vIdx: number) => (
                                                    <div key={vIdx} className="text-orange-900 dark:text-orange-200 text-[13px] font-medium flex items-start gap-1.5">
                                                        <span className="text-orange-400">•</span>
                                                        {v}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <div className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1">AI 총평</div>
                                        <p className="text-blue-900 dark:text-blue-200 text-[13px] whitespace-pre-wrap leading-relaxed">{result.feedback}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}

                    <div className="p-8 bg-slate-50/50 backdrop-blur-xl border-t border-slate-200/50 flex justify-center gap-4 relative z-20">
                        <button
                            onClick={handleRetry}
                            className="group relative px-8 py-3.5 bg-white/80 backdrop-blur-md border border-white/60 text-slate-600 font-bold rounded-2xl shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-200/30 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-[0.98] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-blue-50/0 translate-x-[-100%] group-hover:animate-shine transition-none"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                오답 다시 학습하기
                                <span className="bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 px-2 py-0.5 rounded-full text-xs transition-colors">
                                    {submissionResult.details ? submissionResult.details.filter(d => d && d.score < 80).length : 0}
                                </span>
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                const finalClassId = queryClassId || student?.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                                router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                            }}
                            className="group relative px-10 py-3.5 bg-gradient-to-br from-[#0A0E27] to-[#1e2548] text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                나가기
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Assignment View
    const rawSentence = assignment.sentences?.[currentActualIndex] || '';
    const currentSentence = typeof rawSentence === 'string' ? rawSentence : rawSentence.original;
    const currentAnswer = answers[currentActualIndex] || { marks: [], translation: '' };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-200 selection:bg-blue-600/20">
            {/* Navy Header — Unified Design */}
            <div className="sticky top-0 z-40 bg-[#0A0E27] px-4 py-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                <div className="max-w-5xl mx-auto relative z-10">
                    {/* Row 1: Badge + Title + Progress + Exit */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-blue-400/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                                    Structure
                                </span>
                                <span className={`flex-shrink-0 font-bold border px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide
                                    ${attemptsCount === 0 ? 'text-blue-300 bg-blue-400/10 border-blue-400/20' :
                                        attemptsCount === 1 ? 'text-amber-300 bg-amber-400/10 border-amber-400/20' :
                                            'text-red-300 bg-red-400/10 border-red-400/20'
                                    }`}>
                                    {attemptsCount === 0 ? '1차' : `${attemptsCount + 1}차`}
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-white truncate">{assignment.title}</h2>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-300">{Math.round((completedCount / totalSentences) * 100)}%</span>
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${(completedCount / totalSentences) * 100}%` }} />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const std = getStudentData(student);
                                    const finalClassId = queryClassId || std.classId || (assignment?.classIds && assignment.classIds[0]) || '';
                                    router.push(finalClassId ? `/class/${finalClassId}` : '/dashboard');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                            >
                                나가기
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </button>
                        </div>
                    </div>
                    {/* Row 2: Sentence Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
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
                                    }}
                                    className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-all relative
                                        ${isActive
                                            ? 'bg-white text-[#0A0E27] shadow-sm'
                                            : hasAnswer
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/20'
                                                : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                                        }`}
                                >
                                    {idx + 1}
                                    {hasAnswer && !isActive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="flex-1 p-4 lg:p-8 flex flex-col max-w-5xl mx-auto w-full relative pb-32">
                <header className="mb-6 flex items-center gap-3">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        Sentence <span className="text-blue-600">#{currentActualIndex + 1}</span>
                    </h1>
                    {isRetryMode && (
                        <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                            Review Required
                        </span>
                    )}
                </header>


                <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`sentence-${currentActualIndex}`}
                    initial={{ opacity: 0, x: direction * 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -30 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                <section className="mb-8 relative z-30">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            Structure Analysis
                        </h3>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-visible shadow-xl border border-slate-200 dark:border-white/10 relative">
                        <StructureEditor
                            key={`editor-${currentActualIndex}`}
                            text={currentSentence}
                            initialMarks={currentAnswer.marks}
                            onChange={(marks) => handleMarksChange(marks, currentActualIndex)}
                        />
                    </div>

                </section>

                <section className="mb-8 relative z-30 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                            Sentence Form (형식 선택)
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">* 복수 선택 가능</span>
                    </div>

                    <div className="space-y-3">
                        {/* Selected Tags Area */}
                        <div className="flex flex-wrap gap-2">
                            {(currentAnswer.selectedForms || []).map((form, idx) => (
                                <div key={`${form}-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-bold shadow-sm animate-fadeIn">
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 rounded-full text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 transition-all active:scale-95 shadow-sm"
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
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 p-2 z-50 animate-fadeIn max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                            {SENTENCE_FORM_OPTIONS.map((form) => (
                                                <button
                                                    key={form}
                                                    onClick={() => {
                                                        const current = currentAnswer.selectedForms || [];
                                                        handleFormsChange([...current, form], currentActualIndex);
                                                        setIsFormDropdownOpen(false); // Close after selection
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors flex items-center justify-between group"
                                                >
                                                    {form}
                                                    <span className="opacity-0 group-hover:opacity-100 text-blue-500">+</span>
                                                </button>
                                            ))}
                                            {/* Empty state removed since we always show options */}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>


                <section className="flex-1 flex flex-col animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
                            단어별 해석
                        </h3>
                    </div>
                    <div className="relative group">
                        <textarea
                            value={currentAnswer.translation}
                            onChange={(e) => handleTranslationChange(e.target.value, currentActualIndex)}
                            placeholder="이 문장의 해석을 자유롭게 적어보세요..."
                            className="w-full p-8 text-base lg:text-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all resize-none min-h-[200px] leading-relaxed"
                            spellCheck={false}
                        />
                        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-500 pointer-events-none group-focus-within:text-blue-600 transition-colors">KOREAN</div>
                    </div>
                </section>
                </motion.div>
                </AnimatePresence>

                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-2 pl-3 pr-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] z-40 min-w-[360px] justify-between">
                    <button
                        onClick={() => setCurrentTargetIndexPtr(Math.max(0, currentTargetIndexPtr - 1))}
                        disabled={isFirst}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-100 transition-all border border-slate-200/50 dark:border-white/10 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Sentence</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-bold text-slate-900 dark:text-white">{currentActualIndex + 1}</span>
                            <span className="text-sm font-medium text-slate-500">/ {totalSentences}</span>
                        </div>
                    </div>
                    {isLast ? (
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-500/40 hover:scale-105 transition-all flex items-center gap-2 group"
                        >
                            <span>{isRetryMode ? '재채점' : '제출하기'}</span>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentTargetIndexPtr(Math.min(targetIndices.length - 1, currentTargetIndexPtr + 1))}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 transition-all flex items-center gap-2 group"
                        >
                            <span>다음</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    )}
                </div>
            </main>


        </div>
    );
}
