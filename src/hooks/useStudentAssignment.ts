
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
    /** 채점 진행률 (null이면 채점 중 아님) */
    gradingProgress: { current: number; total: number } | null;
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
    const [gradingProgress, setGradingProgress] = useState<{ current: number; total: number } | null>(null);

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

            // 각 문장에 대한 payload 생성
            const payloadItems = targetIndices.map(idx => {
                const ans = answers[idx] || { marks: [], translation: '', selectedForms: [] };
                const rawSent = assignment.sentences?.[idx] || '';
                const sentenceText = (typeof rawSent === 'string' ? rawSent : (rawSent.original || '')) || '';
                const safeMarks = Array.isArray(ans.marks) ? ans.marks : [];

                return {
                    sentence: sentenceText,
                    analysisString: convertMarksToString(sentenceText, safeMarks),
                    translation: ans.translation || '',
                    selectedForms: ans.selectedForms || []
                };
            });

            // ═══ 순차 채점: 1문장씩 API 호출 (Hobby 10초 제한 대응) ═══
            const allResults: any[] = new Array(payloadItems.length).fill(null);
            setGradingProgress({ current: 0, total: payloadItems.length });

            for (let i = 0; i < payloadItems.length; i++) {
                setGradingProgress({ current: i + 1, total: payloadItems.length });
                addLog(`Grading sentence ${i + 1}/${payloadItems.length}...`);

                let result: any = null;
                let retries = 0;
                const maxRetries = 2; // 실패 시 최대 2회 재시도

                while (retries <= maxRetries) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45초 타임아웃 (스트리밍 응답)

                        const res = await fetch('/api/grade', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assignments: [payloadItems[i]] }),
                            signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        if (!res.ok) {
                            const text = await res.text().catch(() => '(응답 읽기 실패)');
                            addLog(`Sentence ${i + 1}: HTTP ${res.status} - ${text.substring(0, 200)}`);
                            throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
                        }

                        // 스트리밍 응답 파싱: RESULT_START 마커 이후의 JSON 추출
                        const responseText = await res.text();
                        const markerIdx = responseText.indexOf('RESULT_START');
                        let data: any;
                        if (markerIdx >= 0) {
                            const jsonStr = responseText.substring(markerIdx + 'RESULT_START'.length).trim();
                            data = JSON.parse(jsonStr);
                        } else {
                            // 폴백: 일반 JSON 응답 (비스트리밍 호환)
                            data = JSON.parse(responseText.trim());
                        }

                        if (data.results?.[0]) {
                            result = data.results[0];
                            break; // 성공
                        } else {
                            throw new Error('Empty result');
                        }
                    } catch (err: any) {
                        retries++;
                        const isTimeout = err?.name === 'AbortError';
                        const errMsg = isTimeout ? '서버 응답 지연' : (err?.message || 'Unknown');
                        addLog(`Sentence ${i + 1} attempt ${retries} failed: ${errMsg}`);

                        if (retries <= maxRetries) {
                            // 짧은 대기 후 재시도
                            await new Promise(r => setTimeout(r, 500 * retries));
                        } else {
                            // 최종 실패
                            result = {
                                score: 0,
                                feedback: `채점 실패: ${errMsg}. 제출 후 해당 문장만 재채점됩니다.`,
                                _error: true
                            };
                        }
                    }
                }

                allResults[i] = result;
            }

            setGradingProgress(null);
            addLog(`All grading complete. ${allResults.filter(r => r && !r._error).length}/${allResults.length} succeeded.`);

            localStorage.removeItem(`CHEONGHAN_DRAFT_${assignmentId}_${student.id}`);

            // ═══ 결과 병합 ═══
            const totalSentenceCount = assignment.sentences?.length || 0;
            let finalDetails = submissionResult
                ? [...submissionResult.details]
                : new Array(totalSentenceCount).fill(null);

            // finalDetails 크기가 부족하면 확장
            while (finalDetails.length < totalSentenceCount) {
                finalDetails.push(null);
            }

            let failedCount = 0;
            allResults.forEach((result: any, i: number) => {
                const originalIdx = targetIndices[i];
                if (originalIdx !== undefined && result) {
                    finalDetails[originalIdx] = result;
                    if (result._error) failedCount++;
                }
            });

            if (failedCount > 0) {
                if (failedCount >= allResults.length) {
                    // 전부 실패 → 전체 실패 처리 (저장 안 함)
                    toast.error(`${failedCount}/${allResults.length}개 문장 채점 실패. 네트워크를 확인하고 다시 제출해주세요.`, { duration: 8000 });
                    setLoading(false);
                    return;
                }
                toast.warning(`${failedCount}개 문장 채점 실패. 성공한 문장만 반영됩니다. 재제출하면 실패 문장이 다시 채점됩니다.`, { duration: 6000 });
            }

            // 점수 계산: 실패 문장(_error)은 제외하고 평균
            const validDetails = finalDetails.filter(d => d && !d._error);
            const validScores = validDetails.map(d => d.score);
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
            setGradingProgress(null);
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
        attemptsCount,
        gradingProgress
    };
}
