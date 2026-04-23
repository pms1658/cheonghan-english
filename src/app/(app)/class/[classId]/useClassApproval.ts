'use client';

import { Assignment } from '@/types';
import { AssignmentWithStats } from './useClassRoom';
import { dbService } from '@/services/db';
import { toast } from 'sonner';

/**
 * Approval & submission-related handlers extracted from useClassRoom.
 */
export function useClassApproval({
    assignments,
    allSubmissions, setAllSubmissions,
    allAssignmentsRaw,
    approvalModal, setApprovalModal,
    splitWordsPerChunk, setSplitWordsPerChunk,
    resetTargetAssignment, resetSelectedStudents,
    setIsResetModalOpen,
    loadData,
}: {
    assignments: AssignmentWithStats[];
    allSubmissions: any[];
    setAllSubmissions: (v: any[]) => void;
    allAssignmentsRaw: any[];
    approvalModal: {
        submissionId: string;
        studentName: string;
        assignmentId: string;
        assignmentTitle: string;
        selectedWords: { term: string; meaning: string; contextSentence?: string }[];
        selectedIndices: number[];
    } | null;
    setApprovalModal: (v: any) => void;
    splitWordsPerChunk: number | string;
    setSplitWordsPerChunk: (v: number | string) => void;
    resetTargetAssignment: Assignment | null;
    resetSelectedStudents: Set<string>;
    setIsResetModalOpen: (v: boolean) => void;
    loadData: () => Promise<void>;
}) {
    const openApprovalModal = (submissionId: string, studentName: string, assignmentId: string) => {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return;

        const submission = allSubmissions.find(s => s.id === submissionId);
        if (!submission) return;

        const indices: number[] = submission.details?.[0]?.selectedIndices || [];
        const allWords = assignment.words || [];
        const selectedWords = indices.map(i => allWords[i]).filter(Boolean);

        setApprovalModal({
            submissionId,
            studentName,
            assignmentId,
            assignmentTitle: assignment.title,
            selectedWords,
            selectedIndices: indices
        });
        setSplitWordsPerChunk('');
    };

    const handleApproveSubmission = async (submissionId: string) => {
        const submissionObj = allSubmissions.find(s => s.id === submissionId);
        const firestoreId = submissionObj?.docId || submissionId;

        const previousSubmissions = [...allSubmissions];
        const updatedSubmissions = allSubmissions.map(sub =>
            sub.id === submissionId ? { ...sub, status: 'approved' } : sub
        );
        setAllSubmissions(updatedSubmissions);

        try {
            await dbService.updateSubmissionStatus(firestoreId, 'approved');
            setApprovalModal(null);
            toast.success("승인되었습니다.");
            await loadData();
        } catch (e) {
            console.error(e);
            toast.success("승인 처리 중 오류 발생");
            setAllSubmissions(previousSubmissions);
        }
    };

    const handleApproveWithSplit = async () => {
        if (!approvalModal) return;
        const { submissionId, assignmentId, assignmentTitle, selectedWords, selectedIndices } = approvalModal;

        const submission = allSubmissions.find(s => s.id === submissionId);
        if (!submission) return;

        const studentId = submission.studentId;
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return;

        const chunkSize = Math.max(5, Number(splitWordsPerChunk) || 30);
        const chunks: typeof selectedWords[] = [];
        for (let i = 0; i < selectedWords.length; i += chunkSize) {
            chunks.push(selectedWords.slice(i, i + chunkSize));
        }

        if (chunks.length <= 1) {
            await handleApproveSubmission(submissionId);
            return;
        }

        try {
            const firestoreId = submission.docId || submissionId;
            await dbService.updateSubmissionStatus(firestoreId, 'approved');

            for (let i = 0; i < chunks.length; i++) {
                const newAssignment = {
                    title: `${assignmentTitle} (${i + 1}/${chunks.length})`,
                    type: 'vocabulary' as const,
                    words: chunks[i],
                    classIds: [],
                    studentIds: [studentId],
                    deadline: assignment.deadline || '',
                    category: assignment.category || 'sat',
                    sentences: [],
                    vocabConfig: assignment.vocabConfig || { studyMode: 'selection', failMode: 'accumulate', testMode: 'default' },
                    status: 'assigned' as const,
                    createdAt: new Date().toISOString(),
                    parentAssignmentId: assignmentId,
                    parentStudentId: studentId,
                    order: i
                };
                await dbService.addAssignment(newAssignment as any);
            }

            setApprovalModal(null);
            toast.success(`승인 완료! ${selectedWords.length}개 단어를 ${chunks.length}개 과제로 분할했습니다.`);
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error('분할 승인 중 오류가 발생했습니다.');
        }
    };

    const handleRejectSubmission = async (submissionId: string) => {
        if (!confirm('이 학생의 단어 선택을 반려하시겠습니까? 기존 제출 기록이 삭제됩니다.')) return;

        try {
            const subObj = allSubmissions.find(s => s.id === submissionId);
            const firestoreId = subObj?.docId || submissionId;
            await dbService.deleteSubmission(firestoreId);
            setApprovalModal(null);
            toast("반려 및 기록이 삭제되었습니다. 학생이 다시 선택할 수 있습니다.");
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error("반려 처리 중 오류 발생");
        }
    };

    const handleConvertAssignmentType = async (assignment: Assignment) => {
        const isSelection = assignment.type === 'selection';
        const newType = isSelection ? 'vocabulary' : 'selection';
        const newLabel = isSelection ? '단어학습' : '단어선택';
        const oldLabel = isSelection ? '단어선택' : '단어학습';

        const existingSubs = allSubmissions.filter(s => s.assignmentId === assignment.id);
        if (existingSubs.length > 0) {
            const confirmMsg = `이 과제에 ${existingSubs.length}개의 제출 기록이 있습니다.\n\n${oldLabel} → ${newLabel}로 변환하면 기존 제출 기록과 충돌할 수 있습니다.\n\n계속하시겠습니까?`;
            if (!confirm(confirmMsg)) return;
        } else {
            if (!confirm(`"${assignment.title}"을(를)\n${oldLabel} → ${newLabel}로 변환하시겠습니까?`)) return;
        }

        try {
            await dbService.updateAssignment(assignment.id, { type: newType as any });
            toast.success(`${oldLabel} → ${newLabel} 변환 완료`);
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error("변환 중 오류가 발생했습니다.");
        }
    };

    const handleToggleGuidance = async (submissionId: string, currentStatus: boolean, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        const previousSubmissions = [...allSubmissions];
        const updatedSubmissions = allSubmissions.map(sub =>
            sub.id === submissionId ? { ...sub, guidanceCompleted: !currentStatus } : sub
        );
        setAllSubmissions(updatedSubmissions);

        try {
            await dbService.updateSubmissionGuidance(submissionId, !currentStatus);
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error("상태 변경 중 오류가 발생했습니다.");
            setAllSubmissions(previousSubmissions);
        }
    };

    const handleManualPass = async (submissionId: string, currentManualPass: boolean, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newValue = !currentManualPass;
        if (!confirm(newValue ? '이 학생을 PASS 처리하시겠습니까?' : 'PASS 처리를 취소하시겠습니까?')) return;

        const previousSubmissions = [...allSubmissions];
        const updatedSubmissions = allSubmissions.map(sub =>
            sub.id === submissionId ? { ...sub, manualPass: newValue } : sub
        );
        setAllSubmissions(updatedSubmissions);

        try {
            await dbService.updateSubmissionManualPass(submissionId, newValue);
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error('처리 중 오류가 발생했습니다.');
            setAllSubmissions(previousSubmissions);
        }
    };

    const handleExecuteReset = async () => {
        if (!resetTargetAssignment) return;
        if (resetSelectedStudents.size === 0) {
            toast.warning("초기화할 학생을 선택해주세요.");
            return;
        }

        if (!confirm(`정말 ${resetSelectedStudents.size}명 학생의 학습 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 점수와 제출 기록이 영구히 삭제됩니다.`)) return;

        try {
            const studentArr = Array.from(resetSelectedStudents);
            await dbService.resetAssignmentForStudents(resetTargetAssignment.id, studentArr);

            const childAssignments = allAssignmentsRaw.filter(
                (a: any) => a.parentAssignmentId === resetTargetAssignment.id && studentArr.includes(a.parentStudentId)
            );
            for (const child of childAssignments) {
                await dbService.resetAssignmentForStudents(child.id, studentArr);
                await dbService.deleteAssignment(child.docId || child.id);
            }

            toast("학습 기록이 초기화되었습니다.");
            setIsResetModalOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("초기화 중 오류가 발생했습니다.");
        }
    };

    return {
        openApprovalModal,
        handleApproveSubmission,
        handleApproveWithSplit,
        handleRejectSubmission,
        handleConvertAssignmentType,
        handleToggleGuidance,
        handleManualPass,
        handleExecuteReset,
    };
}
