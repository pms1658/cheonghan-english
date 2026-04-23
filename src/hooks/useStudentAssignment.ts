
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { dbService } from '@/services/db';
import { Assignment } from '@/types';
import { useSearchParams } from 'next/navigation';
import { Mark, tokenize } from '@/components/student/StructureEditor';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Answer {
    marks: Mark[];
    translation: string;
    selectedForms?: string[];
}

export interface GradingResult {
    totalScore: number;
    feedback?: string;
    correctStructure?: string;
    details: {
        score: number;
        feedback: string;
        correctStructure: string;
        correctForms?: string[];
        directTranslation?: string;
        vocabFeedback?: string[];
    }[];
}

export interface StudentAssignmentData {
    assignment: Assignment | null;
    loading: boolean;
    answers: Record<number, Answer>;
    submissionResult: GradingResult | null;
    targetIndices: number[];
    currentTargetIndexPtr: number;
    setCurrentTargetIndexPtr: (index: number) => void;
    isRetryMode: boolean;
    handleMarksChange: (marks: Mark[], index?: number) => void;
    handleTranslationChange: (text: string, index?: number) => void;
    handleFormsChange: (forms: string[], index?: number) => void;
    handleSubmit: () => Promise<void>;
    handleRetry: () => Promise<void>;
    debugLog: string[];
    student: { id: string, name: string, classId: string } | null;
    currentActualIndex: number;
    isFirst: boolean;
    isLast: boolean;
    completedCount: number;
    totalSentences: number;
    attemptsCount: number;
}

export function useStudentAssignment(assignmentId: string): StudentAssignmentData {
    const router = useRouter();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<number, Answer>>({});
    const [submissionResult, setSubmissionResult] = useState<GradingResult | null>(null);

    // Navigation State
    const [targetIndices, setTargetIndices] = useState<number[]>([]);
    const [currentTargetIndexPtr, setCurrentTargetIndexPtr] = useState(0);

    const searchParams = useSearchParams();
    const mode = searchParams.get('mode'); // 'practice', 'preview'
    const viewAttempt = searchParams.get('viewAttempt'); // '1', '2'...
    const targetStudentId = searchParams.get('studentId'); // For admin viewing student results
    const [isRetryMode, setIsRetryMode] = useState(false);
    const [student, setStudent] = useState<{ id: string, name: string, classId: string } | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg} `]);

    const { user } = useAuth();

    useEffect(() => {
        if (user && (user as any).role === 'admin' && targetStudentId) {
            dbService.getStudent(targetStudentId).then(s => {
                if (s) {
                    setStudent({
                        id: s.id,
                        name: s.name,
                        classId: s.classIds?.[0] || 'admin_view'
                    });
                }
            });
            return;
        }

        if (user && (user as any).role === 'admin') {
            setStudent({
                id: user.uid,
                name: user.displayName || '관리자',
                classId: 'admin_test'
            });
            return;
        }

        const stored = localStorage.getItem('CHEONGHAN_STUDENT');
        if (stored) {
            setStudent(JSON.parse(stored));
        }
    }, [mode, user, targetStudentId]);

    const [attemptsCount, setAttemptsCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            if (!assignmentId) return;
            const data = await dbService.getAssignmentById(assignmentId);
            if (data) {
                setAssignment(data);
                setTargetIndices(data.sentences?.map((_, i) => i) || []);

                if (student) {
                    if (mode === 'preview') {
                        setAttemptsCount(0);
                        setLoading(false);
                        return;
                    }

                    const history = await dbService.getSubmissionHistory(student.id, assignmentId);
                    setAttemptsCount(history ? history.length : 0);

                    if (!history) {
                        setLoading(false);
                        return;
                    }

                    if (viewAttempt) {
                        const targetSub = history.find(h => h.attempt === Number(viewAttempt));
                        if (targetSub) {
                            if (targetSub.answers && Array.isArray(targetSub.answers)) {
                                const restoredAnswers: Record<number, Answer> = {};
                                targetSub.answers.forEach((item: any) => {
                                    if (item && typeof item.index === 'number' && item.value) {
                                        restoredAnswers[item.index] = item.value;
                                    }
                                });
                                setAnswers(restoredAnswers);
                            }
                            setSubmissionResult({
                                totalScore: targetSub.score,
                                details: targetSub.details || [],
                                feedback: (targetSub as any).feedback,
                                correctStructure: (targetSub as any).correctStructure
                            });
                            setIsRetryMode(false);
                            setLoading(false);
                            return;
                        }
                    }

                    if (mode === 'practice') {
                        setAnswers({});
                        setSubmissionResult(null);
                        setIsRetryMode(true);
                        setLoading(false);
                        return;
                    }

                    setIsRetryMode(false);
                    if (history.length > 0) {
                        const lastSub = history[history.length - 1];
                        if (lastSub.answers && Array.isArray(lastSub.answers)) {
                            const restoredAnswers: Record<number, Answer> = {};
                            lastSub.answers.forEach((item: any) => {
                                if (item && typeof item.index === 'number' && item.value) {
                                    restoredAnswers[item.index] = item.value;
                                }
                            });
                            setAnswers(restoredAnswers);
                        }

                        setSubmissionResult({
                            totalScore: lastSub.score,
                            details: lastSub.details || [],
                            feedback: (lastSub as any).feedback,
                            correctStructure: (lastSub as any).correctStructure
                        });

                    } else {
                        const draftKey = `CHEONGHAN_DRAFT_${assignmentId}_${student.id}`;
                        const draft = localStorage.getItem(draftKey);
                        if (draft) {
                            try {
                                const parsedDraft = JSON.parse(draft);
                                if (parsedDraft && Object.keys(parsedDraft).length > 0) {
                                    setAnswers(parsedDraft);
                                    addLog('Loaded draft from local storage');
                                    const count = Object.keys(parsedDraft).length;
                                    toast.info(`📝 이전 작업 ${count}개 문장이 복원되었습니다.`, { duration: 4000 });
                                }
                            } catch (e) {
                                console.error('Failed to parse draft', e);
                            }
                        }
                    }
                }
            }
            setLoading(false);
        };
        if (student) load();
    }, [assignmentId, student, mode, viewAttempt]);

    const currentActualIndex = targetIndices[currentTargetIndexPtr] || 0;

    const handleMarksChange = (marks: Mark[], index?: number) => {
        const actualIndex = index !== undefined ? index : targetIndices[currentTargetIndexPtr];
        setAnswers(prev => ({
            ...prev,
            [actualIndex]: {
                ...(prev[actualIndex] || { translation: '' }),
                marks
            }
        }));
    };

    const handleTranslationChange = (text: string, index?: number) => {
        const actualIndex = index !== undefined ? index : targetIndices[currentTargetIndexPtr];
        setAnswers(prev => ({
            ...prev,
            [actualIndex]: {
                ...(prev[actualIndex] || { marks: [], selectedForms: [] }),
                translation: text
            }
        }));
    };

    const handleFormsChange = (forms: string[], index?: number) => {
        const actualIndex = index !== undefined ? index : targetIndices[currentTargetIndexPtr];
        setAnswers(prev => ({
            ...prev,
            [actualIndex]: {
                ...(prev[actualIndex] || { marks: [], translation: '' }),
                selectedForms: forms
            }
        }));
    };

    const convertMarksToString = (text: string, marks: Mark[]) => {
        const tokens = tokenize(text);
        let result = '';

        for (let i = 0; i < tokens.length; i++) {
            // 1. Coordinators (Prefix)
            const coord = marks.find(m => m.type === 'coordinator' && m.start === i);
            if (coord) result += '[△] ';

            // 2. Openers (Subordinator <, Nominal /, Modifier ()
            // Order: Outer first (Longest range). Since we iterate i, if multiple start here, outer ones end later.
            // Sort by end index descending.
            const openers = marks
                .filter(m => m.start === i && ['subordinator', 'nominal', 'modifier'].includes(m.type))
                .sort((a, b) => b.end - a.end);

            openers.forEach(m => {
                if (m.type === 'subordinator') result += '< ';
                else if (m.type === 'nominal') result += '/ ';
                else if (m.type === 'modifier') result += '( ';
            });

            // 3. Connectives (Start) - Pill shape logic usually spans, but text format is [word](O) or [O] word?
            // Prompt says: [O] word OR [phrase](O). Let's use [O] for single word or [phrase](O) for visual consistency?
            // StructureEditor uses border/pill.
            // Let's check prompt rule: "Syntax: Single word: [However](O) or [O] However".
            // Let's use [ ](O) for consistency with Verbs if it spans.
            // But wait, user prompt example 4: "[O] word OR [phrase](O)".
            // Let's check if the generic "Verb" style [ ... ](V) works for Connectives.
            // The prompt says "Verbs: [ ](V)".
            // Let's wrap Verbs and Connectives in brackets if they start here.

            const verb = marks.find(m => m.type === 'verb' && m.start === i);
            const conn = marks.find(m => m.type === 'connector' && m.start === i);

            if (verb) result += '[';
            if (conn) result += '[';

            // 4. Token Text
            result += tokens[i].text;

            // 5. Closers for Verb/Conn
            // Check if any mark ends here
            const verbEnd = marks.find(m => m.type === 'verb' && m.end === i);
            const connEnd = marks.find(m => m.type === 'connector' && m.end === i);

            if (verbEnd) result += '](V)';
            if (connEnd) result += '](O)';

            // 6. Closers for Sub/Nom/Mod
            // Order: Inner first (Shortest range). Starts later or starts here but ends earlier?
            // Since we are at `i`, we look for marks ending at `i`.
            // Sort by start index descending (Latest start = Inner).
            const closers = marks
                .filter(m => m.end === i && ['subordinator', 'nominal', 'modifier'].includes(m.type))
                .sort((a, b) => a.start - b.start); // Latest start (higher index) first? No, a.start - b.start is Ascending.
            // We want Inner (closest start) to Outer (earliest start).
            // Inner marks start *later* (closer to i). So Descending order of start.
            // Example: ( / ... / ) -> Outer starts 0, Inner starts 2. End at 5.
            // At 5: Close Inner (/), then Outer ()).
            // Inner has higher start index. So sort b.start - a.start.

            marks
                .filter(m => m.end === i && ['subordinator', 'nominal', 'modifier'].includes(m.type))
                .sort((a, b) => b.start - a.start)
                .forEach(m => {
                    if (m.type === 'subordinator') result += ' >';
                    else if (m.type === 'nominal') result += ' /';
                    else if (m.type === 'modifier') result += ' )';
                });

            // Space between tokens
            if (i < tokens.length - 1) result += ' ';
        }

        return result.replace(/\s+/g, ' ').trim();
    };

    const handleSubmit = async () => {
        if (!student) {
            toast.error('학생 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
            router.push('/');
            return;
        }
        if (!assignment) {
            toast.error('과제 정보를 불러오지 못했습니다.');
            return;
        }
        setLoading(true);
        addLog('Submit clicked. Starting process...');

        try {
            const answersToSave = targetIndices.map(idx => ({
                index: idx,
                value: answers[idx]
            })).filter(item => item.value);

            if (answersToSave.length === 0) {
                toast.warning('제출할 답안이 없습니다. 문제를 풀고 제출해주세요.');
                setLoading(false);
                return;
            }

            const payload = targetIndices.map(idx => {
                const ans = answers[idx] || { marks: [], translation: '', selectedForms: [] };
                const rawSent = assignment.sentences?.[idx] || '';
                const sentenceText = typeof rawSent === 'string' ? rawSent : rawSent.original;

                return {
                    sentence: sentenceText,
                    analysisString: convertMarksToString(sentenceText, ans.marks),
                    translation: ans.translation,
                    selectedForms: ans.selectedForms || []
                };
            });

            const res = await fetch('/api/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignments: payload })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Grading failed: ${text} `);
            }

            localStorage.removeItem(`CHEONGHAN_DRAFT_${assignmentId}_${student.id}`);

            const data = await res.json();
            addLog(`API Response received: ${data.results ? data.results.length : 0} items`);

            let finalDetails = submissionResult ? [...submissionResult.details] : new Array((assignment.sentences?.length || 0)).fill(null);

            if (Array.isArray(data.results)) {
                data.results.forEach((result: any, i: number) => {
                    const originalIdx = targetIndices[i];
                    if (originalIdx !== undefined) {
                        finalDetails[originalIdx] = result;
                    }
                });
            } else {
                console.error('Unexpected grading response format:', data);
                throw new Error('채점 결과 형식이 올바르지 않습니다.');
            }

            const validScores = finalDetails.filter(d => d).map(d => d.score);
            const totalScore = validScores.length ? Math.floor(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length) : 0;

            if (mode === 'preview') {
                setSubmissionResult({
                    totalScore,
                    details: finalDetails
                });
                toast.info('[관리자 미리보기] 채점이 완료되었습니다. 데이터베이스에는 저장되지 않습니다.');
                setLoading(false);
                return;
            }

            const history = await dbService.getSubmissionHistory(student.id, assignmentId);
            const currentAttempt = history.length + 1;

            if (currentAttempt > 3 && mode !== 'practice') {
                // Limit removed per user request: "3회채점 없애기... 무제한 응시 가능하되"
                // Just log or do nothing
                // toast("이미 3회 제출하였습니다. 오답 학습 모드를 이용해주세요.");
                // setLoading(false);
                // return;
            }

            await dbService.addSubmission({
                studentId: student.id,
                studentName: student.name,
                classId: student.classId || (Array.isArray((student as any).classIds) ? (student as any).classIds[0] : undefined) || assignment.classIds?.[0] || 'unknown',
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                attempt: currentAttempt,
                score: totalScore,
                details: finalDetails,
                answers: answersToSave
            } as any);

            setSubmissionResult({
                totalScore,
                details: finalDetails
            });
            setAttemptsCount(currentAttempt);
            setIsRetryMode(false);

        } catch (e: any) {
            console.error(e);
            toast.error(`채점 오류: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Auto-draft save: localStorage + visibilitychange/pagehide ---
    const answersRef = useRef(answers);
    answersRef.current = answers;

    // Save draft to localStorage
    const saveDraft = useCallback(() => {
        if (!student || !assignmentId || Object.keys(answersRef.current).length === 0) return;
        try {
            localStorage.setItem(
                `CHEONGHAN_DRAFT_${assignmentId}_${student.id}`,
                JSON.stringify(answersRef.current)
            );
        } catch { /* quota exceeded — ignore */ }
    }, [assignmentId, student]);

    // Save on every answers change (debounced by React batching)
    useEffect(() => {
        if (!student || !assignmentId || loading || Object.keys(answers).length === 0) return;
        saveDraft();
    }, [answers, assignmentId, student, loading, saveDraft]);

    // Save immediately when app goes to background (PWA minimize, tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveDraft();
            }
        };
        // pagehide fires more reliably on iOS Safari/PWA
        const handlePageHide = () => {
            saveDraft();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        // Also save on beforeunload (desktop/Android Chrome)
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
        };
    }, [saveDraft]);


    const handleRetry = async () => {
        if (!submissionResult || !student) return;

        const attemptsDone = attemptsCount;
        if (attemptsDone < 1) {
            toast.info('최소 1회 제출 후에 오답 학습이 가능합니다.');
            return;
        }

        const failIndices = submissionResult.details
            .map((d, i) => (d && d.score < 80) ? i : -1)
            .filter(i => i !== -1);

        if (failIndices.length === 0) {
            toast.success('모든 문장이 80점 이상입니다! 훌륭해요.');
            return;
        }

        if (!confirm(`현재 ${attemptsDone}회차 완료했습니다.\n오답 학습(${failIndices.length}문장)을 시작하시겠습니까 ? `)) return;

        setTargetIndices(failIndices);
        setCurrentTargetIndexPtr(0);
        setSubmissionResult(null);
        setIsRetryMode(true);
        setDebugLog([]);
    };

    const completedCount = Object.keys(answers).filter(k => {
        const ans = answers[Number(k)];
        if (!ans) return false;
        const hasMarks = Array.isArray(ans.marks) && ans.marks.length > 0;
        const hasTranslation = typeof ans.translation === 'string' && ans.translation.trim().length > 0;
        return hasMarks || hasTranslation;
    }).length;

    const totalSentences = assignment?.sentences?.length || 0;
    const isFirst = currentTargetIndexPtr === 0;
    const isLast = currentTargetIndexPtr === targetIndices.length - 1;

    return {
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
    };
}
