import { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/services/db';
import { WorkbookLevelData, Submission, Assignment } from '@/types';
import { toast } from 'sonner';

interface UseWorkbookLogicProps {
    assignment: Assignment;
    levels: WorkbookLevelData[];
    studentId: string;
    studentName: string;
    onComplete: () => void;
}

export const useWorkbookLogic = ({
    assignment,
    levels,
    studentId,
    studentName,
    onComplete
}: UseWorkbookLogicProps) => {
    // Basic State
    const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [completedLevels, setCompletedLevels] = useState<number[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [retryMode, setRetryMode] = useState(false);
    // Per-level failed indices map (key: levelIdx, value: array of problem indices)
    const [failedIndicesMap, setFailedIndicesMap] = useState<Record<number, number[]>>({});

    // Modals
    const [showCelebration, setShowCelebration] = useState(false);
    const [showFailedModal, setShowFailedModal] = useState(false);
    const [failedResult, setFailedResult] = useState<{ correct: number; total: number } | null>(null);
    const [showFlowModal, setShowFlowModal] = useState(false); // After Level 2
    const [showResumeModal, setShowResumeModal] = useState(false); // PASS re-entry choice

    // Complex State for specific levels
    const [writingState, setWritingState] = useState<Record<string, string[]>>({});
    const [unscrambleState, setUnscrambleState] = useState<Record<string, { available: string[], selected: string[] }>>({});
    const [shuffledProblems, setShuffledProblems] = useState<any[]>([]);
    const [levelHints, setLevelHints] = useState<Record<string, string[]>>({});

    const [existingHistory, setExistingHistory] = useState<Submission[]>([]);

    const currentLevel = levels[currentLevelIdx];

    // Helper: get failed indices for the current level
    const failedIndices = failedIndicesMap[currentLevelIdx] || [];

    // Load History Logic
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const history = await dbService.getSubmissions(assignment.id, studentId);
                setExistingHistory(history);

                // Sort by attempt desc
                const sorted = history.sort((a, b) => b.attempt - a.attempt);
                const lastBest = sorted.find(h => (h.completedLevels?.length || 0) > 0);

                if (lastBest && lastBest.completedLevels) {
                    const completed = lastBest.completedLevels;
                    setCompletedLevels(completed);

                    // Resume logic
                    if (completed.includes(4)) {
                        // All done
                        setCurrentLevelIdx(levels.length - 1);
                        setShowCelebration(true);
                    } else if (completed.includes(1) && completed.includes(2)) {
                        // Core done -> Show resume modal to let student choose
                        if (completed.includes(3)) {
                            setCurrentLevelIdx(3);
                        } else {
                            // PASS state: let student choose start from beginning or stage 3
                            setShowResumeModal(true);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [assignment.id, studentId, levels.length]);

    // Submission Logic
    const finalizeSubmission = async (completed: number[], silent = false) => {
        const isCoreDone = completed.includes(1) && completed.includes(2);
        const isMasteryDone = isCoreDone && completed.includes(3);

        // Find next attempt number
        const nextAttempt = existingHistory.length > 0
            ? Math.max(...existingHistory.map(h => h.attempt || 1)) + 1
            : 1;

        setIsSubmitting(true);
        try {
            const submissionData = {
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                studentId,
                studentName,
                classId: assignment.classIds[0],
                attempt: nextAttempt,
                answers: Object.entries(answers).map(([key, choice]) => ({ key, choice })),
                // Score Logic: Core Done = 100, else proportional
                score: isCoreDone ? 100 : Math.round((completed.length / levels.length) * 100),
                // PASS = 1,2단계 완료, completed = 3단계까지 완료
                status: (isMasteryDone ? 'completed' : isCoreDone ? 'passed' : 'pending') as any,
                submittedAt: Date.now(),
                completedLevels: completed,
                masteryLevel: completed.includes(4) ? 2 : completed.includes(3) ? 1 : 0
            };

            await dbService.addSubmission(submissionData);

            if (!silent) {
                toast.success(`학습 내역이 저장되었습니다. (시도: ${nextAttempt}회)`);
            }

            // Update local history
            setExistingHistory(prev => [...prev, { ...submissionData, id: 'temp-' + Date.now(), timestamp: Date.now() } as any]);

        } catch (error) {
            console.error('Submission failed:', error);
            if (!silent) toast.error('저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Scoring Logic
    const checkLevelScore = (idx: number) => {
        let correct = 0;
        const failed: number[] = [];
        const level = levels[idx];
        if (!level) return { correct: 0, total: 0, failed: [] };

        level.problems.forEach((prob: any, pIdx: number) => {
            const problemKey = `${idx}-${pIdx}`;
            const answer = answers[problemKey];

            if (level.type === 'vocab' || level.type === 'grammar') {
                if (answer === prob.answer) correct++;
                else failed.push(pIdx);
            } else {
                // Mastery or Complex types
                const style = level.type === 'mastery' ? prob.style : level.type;

                if (style === 'unscramble') {
                    // Normalize spaces AND punctuation/case for final check (Smart Quotes Handling)
                    const normalize = (str: string) => str
                        .replace(/[\u2018\u2019]/g, "'")
                        .replace(/[\u201C\u201D]/g, '"')
                        .replace(/[^\w\s]|_/g, "")
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase();

                    const userSentence = unscrambleState[problemKey]?.selected.join(' ');
                    const targetSentence = prob.original || prob.answer;

                    if (normalize(userSentence) === normalize(targetSentence)) correct++;
                    else failed.push(pIdx);
                } else if (style === 'writing') {
                    // Strict Grading with Tokenized Answer (Smart Quotes Handling)
                    const targets = prob.tokenizedAnswers || prob.hints || [];
                    // Defense: use skeleton blank count as ground truth
                    const skeletonBlankCount = (prob.skeleton?.match(/\[.*?\]/g) || []).length;
                    const checkCount = Math.min(targets.length, skeletonBlankCount);
                    
                    let allCorrect = true;
                    for (let hIdx = 0; hIdx < checkCount; hIdx++) {
                        const userVal = writingState[problemKey]?.[hIdx] || '';
                        const target = targets[hIdx] || '';

                        const normalize = (str: string) => str
                            .replace(/[\u2018\u2019]/g, "'")
                            .replace(/[\u201C\u201D]/g, '"')
                            .trim()
                            .toLowerCase();

                        if (normalize(userVal) !== normalize(target)) {
                            allCorrect = false;
                            break;
                        }
                    }
                    if (allCorrect && checkCount > 0) correct++;
                    else failed.push(pIdx);
                }
            }
        });
        return { correct, total: level.problems.length, failed };
    };

    // Level Completion Handler — Independent per-level scoring
    const handleLevelComplete = async () => {
        const res = checkLevelScore(currentLevelIdx);
        const isPerfect = res.correct === res.total;

        // --- Level 0 (Vocab) ---
        if (currentLevelIdx === 0) {
            if (!isPerfect) {
                setFailedResult(res);
                setFailedIndicesMap(prev => ({ ...prev, [0]: res.failed }));
                setShowFailedModal(true);
                return;
            }

            // Level 0 passed -> mark level 1 completed, move to level 1 (grammar)
            const newCompleted = [...new Set([...completedLevels, 1])];
            setCompletedLevels(newCompleted);
            setRetryMode(false);
            setFailedIndicesMap(prev => { const next = { ...prev }; delete next[0]; return next; });

            // Save silently (just vocab done, not full core yet)
            await finalizeSubmission(newCompleted, true);

            setCurrentLevelIdx(1);
            window.scrollTo(0, 0);
            return;
        }

        // --- Level 1 (Grammar) ---
        if (currentLevelIdx === 1) {
            if (!isPerfect) {
                setFailedResult(res);
                setFailedIndicesMap(prev => ({ ...prev, [1]: res.failed }));
                setShowFailedModal(true);
                return;
            }

            // Level 1 passed -> Core complete (1+2), show flow modal
            const newCompleted = [...new Set([...completedLevels, 1, 2])];
            setCompletedLevels(newCompleted);
            setRetryMode(false);
            setFailedIndicesMap(prev => { const next = { ...prev }; delete next[1]; return next; });

            setShowFlowModal(true);
            return;
        }

        // --- Standard Logic for other levels (Mastery / Stage 3+) ---
        if (!isPerfect) {
            setFailedResult(res);
            setFailedIndicesMap(prev => ({ ...prev, [currentLevelIdx]: res.failed }));
            setShowFailedModal(true);
            return;
        }

        // Success state update
        const newCompleted = [...new Set([...completedLevels, currentLevelIdx + 1])];
        setCompletedLevels(newCompleted);
        setRetryMode(false);
        setFailedIndicesMap(prev => { const next = { ...prev }; delete next[currentLevelIdx]; return next; });

        await finalizeSubmission(newCompleted);

        if (currentLevelIdx < levels.length - 1) {
            setCurrentLevelIdx(prev => prev + 1);
            window.scrollTo(0, 0);
        } else {
            onComplete();
            setShowCelebration(true);
        }
    };


    // ----------------------------------------------------
    // Helper Handlers (Unscramble & Writing)
    // ----------------------------------------------------

    // Initialize State whenever level changes
    useEffect(() => {
        if (!currentLevel) return;

        if (currentLevel.type === 'vocab' || currentLevel.type === 'grammar') {
            const shuffled = currentLevel.problems.map((p: any) => ({
                ...p,
                shuffledChoices: [...(p.choices || [])].sort(() => Math.random() - 0.5)
            }));
            setShuffledProblems(shuffled);
        } else {
            // Handle Unscramble/Writing/Mastery initialization
            setUnscrambleState(prev => {
                const updates: Record<string, { available: string[], selected: string[] }> = {};
                currentLevel.problems.forEach((p: any, i: number) => {
                    const style = currentLevel.type === 'mastery' ? p.style : currentLevel.type;
                    if (style === 'unscramble') {
                        const problemKey = `${currentLevelIdx}-${i}`;
                        if (!prev[problemKey]) {
                            // FALLBACK: If segments are missing or seem insufficient (e.g. less words than answer parts?), generate them.
                            let availableWords = [...(p.segments || [])];

                            // Check if segments are suspiciously missing or short compared to answer
                            const answerWords = p.answer.split(/\s+/);
                            if (availableWords.length < answerWords.length) {
                                // Simple fallback: Split answer by space, shuffle.
                                availableWords = p.answer.split(' ');
                            }

                            updates[problemKey] = {
                                available: availableWords.sort(() => Math.random() - 0.5),
                                selected: []
                            };
                        }
                    }
                });
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });

            setWritingState(prev => {
                const updates: Record<string, string[]> = {};
                currentLevel.problems.forEach((p: any, i: number) => {
                    const style = currentLevel.type === 'mastery' ? p.style : currentLevel.type;
                    if (style === 'writing') {
                        const problemKey = `${currentLevelIdx}-${i}`;
                        if (!prev[problemKey]) {
                            const blankCount = (p.skeleton.match(/\[.*?\]/g) || []).length;
                            updates[problemKey] = new Array(blankCount).fill('');
                        }
                    }
                });
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });

            setLevelHints(prev => {
                const updates: Record<string, string[]> = {};
                currentLevel.problems.forEach((p: any, i: number) => {
                    const style = currentLevel.type === 'mastery' ? p.style : currentLevel.type;
                    if (style === 'writing') {
                        const problemKey = `${currentLevelIdx}-${i}`;
                        if (!prev[problemKey]) {
                            updates[problemKey] = [...(p.hints || [])].sort(() => Math.random() - 0.5);
                        }
                    }
                });
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });
        }
    }, [currentLevel, currentLevelIdx]);

    const handleWordSelect = (problemKey: string, word: string, wordIdx: number) => {
        if (answers[problemKey]) return; // 이미 제출됨
        setUnscrambleState(prev => {
            const state = prev[problemKey];
            const newAvailable = [...state.available];
            newAvailable.splice(wordIdx, 1);
            return {
                ...prev,
                [problemKey]: { available: newAvailable, selected: [...state.selected, word] }
            };
        });
    };

    const moveToAvailable = (problemKey: string, word: string, wordIdx: number) => {
        if (answers[problemKey]) return;
        setUnscrambleState(prev => {
            const state = prev[problemKey];
            const newSelected = [...state.selected];
            newSelected.splice(wordIdx, 1);
            return {
                ...prev,
                [problemKey]: { available: [...state.available, word], selected: newSelected }
            };
        });
    };

    const moveToSelected = (problemKey: string, word: string, wordIdx: number) => {
        if (answers[problemKey]) return;
        setUnscrambleState(prev => {
            const state = prev[problemKey];
            const newAvailable = [...state.available];
            newAvailable.splice(wordIdx, 1);
            return {
                ...prev,
                [problemKey]: { available: newAvailable, selected: [...state.selected, word] }
            };
        });
    };

    // --- Drag & Drop: Insert a word from available into a specific position in selected ---
    const insertWordAt = (problemKey: string, word: string, wordIdx: number, insertPosition: number) => {
        if (answers[problemKey]) return;
        setUnscrambleState(prev => {
            const state = prev[problemKey];
            if (!state) return prev;
            const newAvailable = [...state.available];
            newAvailable.splice(wordIdx, 1);
            const newSelected = [...state.selected];
            newSelected.splice(insertPosition, 0, word);
            return {
                ...prev,
                [problemKey]: { available: newAvailable, selected: newSelected }
            };
        });
    };

    // --- Drag & Drop: Reorder within selected ---
    const reorderSelected = (problemKey: string, fromIdx: number, toIdx: number) => {
        if (answers[problemKey]) return;
        if (fromIdx === toIdx) return;
        setUnscrambleState(prev => {
            const state = prev[problemKey];
            if (!state) return prev;
            const newSelected = [...state.selected];
            const [moved] = newSelected.splice(fromIdx, 1);
            newSelected.splice(toIdx, 0, moved);
            return {
                ...prev,
                [problemKey]: { available: state.available, selected: newSelected }
            };
        });
    };

    const checkUnscramble = (problemKey: string, prob: any) => {
        const state = unscrambleState[problemKey];
        if (!state) return;

        const normalize = (str: string) => str
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[^\w\s]|_/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        const userSentence = state.selected.join(' ');
        const targetSentence = prob.original || prob.answer;

        if (normalize(userSentence) === normalize(targetSentence)) {
            setAnswers(prev => ({ ...prev, [problemKey]: userSentence })); // Save exact user input for display, but valid
        } else {
            toast.warning('순서가 올바르지 않습니다. 다시 시도해보세요!');
        }
    };

    const handleWritingChange = (problemKey: string, blankIdx: number, value: string) => {
        if (answers[problemKey]) return;
        setWritingState(prev => {
            const newState = { ...prev };
            newState[problemKey] = [...(prev[problemKey] || [])];
            newState[problemKey][blankIdx] = value;
            return newState;
        });
    };


    return {
        // State
        currentLevelIdx, setCurrentLevelIdx,
        answers, setAnswers,
        completedLevels,
        isLoading, isSubmitting,
        retryMode, setRetryMode,
        failedIndices, // derived from failedIndicesMap[currentLevelIdx]
        failedIndicesMap, setFailedIndicesMap,

        // Modals
        showCelebration, setShowCelebration,
        showFailedModal, setShowFailedModal,
        failedResult,
        showFlowModal, setShowFlowModal,
        showResumeModal, setShowResumeModal,

        // Complex Inputs
        writingState, setWritingState,
        unscrambleState, setUnscrambleState,

        // Actions
        handleLevelComplete,
        finalizeSubmission,
        handleWordSelect,
        moveToAvailable,
        moveToSelected,
        insertWordAt,
        reorderSelected,
        checkUnscramble,
        handleWritingChange,

        // Setters (for Reset Logic)
        setCompletedLevels,

        // Data
        currentLevel,
        existingHistory,
        shuffledProblems,
        levelHints
    };
};
