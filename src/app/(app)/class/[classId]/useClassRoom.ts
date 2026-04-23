'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dbService } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import { Class, Assignment } from '@/types';
import { DragEndEvent, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useClassPrint } from './useClassPrint';
import { useClassApproval } from './useClassApproval';

// Extended type for display
export interface AssignmentWithStats extends Assignment {
    submissionCount?: number;
    progressRate?: number;
    totalStudents?: number;
}

// Helper: normalize various timestamp formats to epoch ms
export const getTime = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (val instanceof Date) return val.getTime();
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
    if (typeof val._seconds === 'number') return val._seconds * 1000;
    if (typeof val === 'string') { const t = Date.parse(val); if (!isNaN(t)) return t; }
    return 0;
};

export function useClassRoom() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const { user } = useAuth();
    const isAdmin = (user as any)?.role === 'admin';

    // Data States
    const [classData, setClassData] = useState<Class | null>(null);
    const [assignments, setAssignments] = useState<AssignmentWithStats[]>([]);
    const [allClasses, setAllClasses] = useState<Class[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [allAssignmentsRaw, setAllAssignmentsRaw] = useState<any[]>([]);
    const [expandedSelections, setExpandedSelections] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);

    // Modal States
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false); // Toggle form

    // Student Selection States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    // Class Settings States
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingClassName, setEditingClassName] = useState('');

    // Reset Assignment States
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetTargetAssignment, setResetTargetAssignment] = useState<Assignment | null>(null);
    const [resetSelectedStudents, setResetSelectedStudents] = useState<Set<string>>(new Set());

    // Dashboard Summary States
    const [approvalNeededCount, setApprovalNeededCount] = useState(0);
    const [guidanceNeededCount, setGuidanceNeededCount] = useState(0);

    // Sorting State
    const [sortMode, setSortMode] = useState<'date' | 'name' | 'custom'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isReordering, setIsReordering] = useState(false);
    const [originalOrder, setOriginalOrder] = useState<string[]>([]); // To revert cancellation

    // Merge/Split States
    const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [splitTarget, setSplitTarget] = useState<Assignment | null>(null);
    const [splitOptions, setSplitOptions] = useState({ wordsPerChunk: 30, handleRemainder: 'last' });

    // Print States
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printTitle, setPrintTitle] = useState('');
    const [printStudentId, setPrintStudentId] = useState<string>('all');
    const [isStructurePrintOpen, setIsStructurePrintOpen] = useState(false);
    const [structurePrintStudentId, setStructurePrintStudentId] = useState<string>('');
    const [structurePrintStudentName, setStructurePrintStudentName] = useState<string>('');
    const [writingDetailTarget, setWritingDetailTarget] = useState<{ studentName: string; submissions: any[] } | null>(null);

    // Selection Approval Modal States
    const [approvalModal, setApprovalModal] = useState<{
        submissionId: string;
        studentName: string;
        assignmentId: string;
        assignmentTitle: string;
        selectedWords: { term: string; meaning: string; contextSentence?: string }[];
        selectedIndices: number[];
    } | null>(null);
    const [splitWordsPerChunk, setSplitWordsPerChunk] = useState<number | string>('');

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const toggleAssignmentSelection = (assignmentId: string) => {
        const newSet = new Set(selectedAssignments);
        if (newSet.has(assignmentId)) {
            newSet.delete(assignmentId);
        } else {
            newSet.add(assignmentId);
        }
        setSelectedAssignments(newSet);
    };

    const handleMergeAssignments = async () => {
        if (selectedAssignments.size < 2) {
            toast.warning("합칠 과제를 2개 이상 선택해주세요.");
            return;
        }

        const assignmentsToMerge = assignments.filter(a => selectedAssignments.has(a.id));

        // Ensure all are vocabulary or selection type
        if (!assignmentsToMerge.every(a => a.type === 'vocabulary' || a.type === 'selection')) {
            toast("단어장 또는 단어 선택 과제만 합칠 수 있습니다.");
            return;
        }

        let mergedWordsMap = new Map();
        assignmentsToMerge.forEach(assignment => {
            if (assignment.words) {
                assignment.words.forEach(word => {
                    if (word.term && !mergedWordsMap.has(word.term)) {
                        mergedWordsMap.set(word.term, word);
                    }
                });
            }
        });

        const newWords = Array.from(mergedWordsMap.values());

        if (newWords.length === 0) {
            toast.error("합칠 단어가 없습니다.");
            return;
        }

        const newTitle = prompt('새로운 합쳐진 과제의 이름을 입력하세요:', `${assignmentsToMerge[0].title} 통합본`);
        if (!newTitle) return;

        try {
            const baseType = assignmentsToMerge[0].type;
            const newAssignment = {
                title: newTitle,
                type: baseType,
                words: newWords,
                classIds: classData ? [classData.id] : [],
                deadline: assignmentsToMerge.map(a => a.deadline).filter(Boolean).sort().reverse()[0] || '',
                category: assignmentsToMerge[0].category,
                yearMonth: assignmentsToMerge[0].yearMonth,
                content: assignmentsToMerge.map(a => a.content).filter(Boolean).join('\n\n---\n\n'),
                vocabConfig: assignmentsToMerge[0].vocabConfig,
                status: 'assigned',
                createdAt: new Date().toISOString()
            };

            await dbService.addAssignment(newAssignment as any);
            toast.success("성공적으로 합쳐졌습니다. (총 ${newWords.length} 단어)");
            setSelectedAssignments(new Set());
            loadData();
        } catch (error: any) {
            console.error('Merge Error:', error);
            toast.error("합치기 중 오류가 발생했습니다: ${error.message || error}");
        }
    };

    const handleSplitAssignment = async () => {
        if (!splitTarget || !splitTarget.words || splitTarget.words.length === 0) return;
        const totalWords = splitTarget.words;
        const chunkSize = splitOptions.wordsPerChunk;

        if (chunkSize <= 0) {
            toast.warning("올바른 개수를 입력하세요 (1개 이상).");
            return;
        }

        const newAssignments = [];
        const baseTitle = splitTarget.title;

        let currentIndex = 0;
        let chunkIndex = 1;

        while (currentIndex < totalWords.length) {
            let chunk = totalWords.slice(currentIndex, currentIndex + chunkSize);
            currentIndex += chunkSize;

            // Handle remainder
            if (currentIndex >= totalWords.length && chunk.length > 0 && chunk.length < chunkSize && splitOptions.handleRemainder === 'last') {
                if (newAssignments.length > 0) {
                    newAssignments[newAssignments.length - 1].words.push(...chunk);
                    break;
                }
            }

            if (chunk.length > 0) {
                const newAssign = {
                    title: `${baseTitle}(${chunkIndex})`,
                    type: splitTarget.type,
                    words: chunk,
                    classIds: splitTarget.classIds || (classData ? [classData.id] : []),
                    deadline: splitTarget.deadline || '',
                    category: splitTarget.category || '고1 모의고사',
                    yearMonth: splitTarget.yearMonth || '',
                    content: splitTarget.content || '',
                    vocabConfig: splitTarget.vocabConfig || null,
                    status: 'assigned',
                    createdAt: new Date().toISOString()
                };
                newAssignments.push(newAssign);
                chunkIndex++;
            }
        }

        try {
            await Promise.all(newAssignments.map(a => dbService.addAssignment(a as any)));
            toast.success("과제가 성공적으로 ${newAssignments.length}개로 분할되었습니다.");

            setIsSplitModalOpen(false);
            setSplitTarget(null);

            loadData();
        } catch (error: any) {
            console.error('Split Error:', error);
            toast.error("분할 중 오류가 발생했습니다: ${error.message || error}");
        }
    };

    const loadData = async () => {
        try {
            // 1. Fetch Class Info and Helpers
            const [classes, students, allAssignments, submissionsData] = await Promise.all([
                dbService.getClasses(),
                dbService.getStudents(),
                dbService.getAssignments(),
                dbService.getSubmissions()
            ]);

            setAllClasses(classes);
            setAllStudents(students);
            setAllSubmissions(submissionsData);
            setAllAssignmentsRaw(allAssignments);

            const currentClass = classes.find(c => c.id === classId);
            setClassData(currentClass || null);

            if (!currentClass) {
                setLoading(false);
                return;
            }

            // 2. Filter Assignments logic
            const classStudentIds = students
                .filter(s => (s.classIds || []).includes(classId))
                .map(s => s.id);
            const classStudentCount = classStudentIds.length;

            const classAssignments = allAssignments
                .filter(a => {
                    // Strict Mode: Assignment MUST explicitly belong to this class.
                    // Individual Assignment should have been saved with this class context.
                    if ((a.classIds || []).includes(classId)) return true;
                    // Legacy Support (Optional): If assignment has NO classIds, maybe we show it?
                    // But for now, enforce strict context to solve "Bleed Over".
                    return false;
                })
                .map(assignment => {
                    const submittedUniqueStudents = new Set(
                        submissionsData
                            .filter(s => s.assignmentId === assignment.id && classStudentIds.includes(s.studentId))
                            .map(s => s.studentId)
                    );
                    const submissionCount = submittedUniqueStudents.size;
                    const totalStudents = classStudentCount;
                    const progressRate = totalStudents > 0
                        ? Math.round((submissionCount / totalStudents) * 100)
                        : 0;

                    return { ...assignment, submissionCount, progressRate, totalStudents };
                });

            // Initial Sort Application based on saved orders or default
            let sorted = [...classAssignments];

            // Check if any have order field (indicating a custom sort was saved)
            // We ignore if all are 0 or undefined, but handleSaveOrder assigns indices 0..N
            const hasCustomOrder = sorted.some(a => typeof a.order === 'number');

            if (hasCustomOrder) {
                // sort by order, with createdAt as tiebreaker for unordered items
                sorted.sort((a, b) => {
                    const oa = a.order ?? 9999;
                    const ob = b.order ?? 9999;
                    if (oa !== ob) return oa - ob;
                    // Same order (both unordered) → sort by createdAt asc
                    return getTime(a.createdAt) - getTime(b.createdAt);
                });
                setSortMode('custom');
            } else {
                // default to date asc (oldest at top, newest at bottom)
                sorted.sort((a, b) => {
                    const ta = getTime(a.createdAt);
                    const tb = getTime(b.createdAt);
                    if (ta || tb) return ta - tb;
                    return ((a as any).docId || a.id || '').localeCompare((b as any).docId || b.id || '');
                });
                setSortMode('date');
            }

            setAssignments(sorted);

            // 3. Calculate Dashboard Statistics
            let approvalCount = 0;
            let guidanceCount = 0;

            classAssignments.forEach(ass => {
                // Iterate all students in this class
                const relevantStudents = students.filter(s => (s.classIds || []).includes(classId));

                relevantStudents.forEach(std => {
                    // Get submisisons for this student & assignment
                    const stdSubs = submissionsData
                        .filter(sub => sub.assignmentId === ass.id && sub.studentId === std.id);

                    const latest = stdSubs.sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0)).at(-1);

                    // Approval Needed: Selection Type AND status is 'pending_review'
                    if (ass.type === 'selection') {
                        if (latest && latest.status === 'pending_review') {
                            approvalCount++;
                        }
                    }

                    // Guidance Needed: Structure Type AND attempts >= 3 AND max score < 80
                    if (ass.type === 'structure') {
                        const attemptsFn = stdSubs.length;
                        const maxScoreFn = Math.max(...stdSubs.map(s => s.score || 0), 0);
                        if (attemptsFn >= 3 && maxScoreFn < 80) {
                            guidanceCount++;
                        }
                    }
                });
            });

            setApprovalNeededCount(approvalCount);
            setGuidanceNeededCount(guidanceCount);

        } catch (error) {
            console.error("Error loading class room:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!classId) return;
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

    // Navigation Interceptor for Modal
    useEffect(() => {
        if (isEditorOpen) {
            // Push a dummy state to history so "Back" doesn't immediately leave the page
            window.history.pushState({ modalOpen: true }, '');

            const handlePopState = (e: PopStateEvent) => {
                // If the user hit back, close the modal instead of navigating
                setIsEditorOpen(false);
                setEditingAssignment(null);
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                // Clean up history if we closed the modal manually
                if (window.history.state?.modalOpen) {
                    window.history.back();
                }
            };
        }
    }, [isEditorOpen]);

    const handleCreateClick = () => {

        setEditingAssignment(null); // Clear for new
        setIsEditorOpen(true);
    };

    const handleEditClick = (assignment: Assignment, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingAssignment(assignment);
        setIsEditorOpen(true);
    };

    const handleDeleteClick = async (assignmentId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 과제를 삭제하시겠습니까? 관련 제출 기록도 모두 삭제될 수 있습니다.")) return;

        try {
            await dbService.deleteAssignment(assignmentId);
            loadData(); // Reload
        } catch (err) {
            toast.error("삭제 중 오류가 발생했습니다.");
            console.error(err);
        }
    };

    const handleResetClick = (assignment: Assignment, e: React.MouseEvent, targetStudentId?: string) => {
        e.stopPropagation();
        setResetTargetAssignment(assignment);

        if (targetStudentId) {
            setResetSelectedStudents(new Set([targetStudentId]));
        } else {
            setResetSelectedStudents(new Set()); // Start empty for full modal selection
        }

        setIsResetModalOpen(true);
    };



    const toggleResetStudentSelection = (studentId: string) => {
        const newSet = new Set(resetSelectedStudents);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setResetSelectedStudents(newSet);
    };

    const handleAddSelectedStudents = async () => {
        if (selectedStudentIds.size === 0) {
            toast.warning("학생을 선택해주세요.");
            return;
        }

        try {
            const updates = Array.from(selectedStudentIds).map(studentId => {
                const student = allStudents.find(s => s.id === studentId);
                if (!student) return Promise.resolve();
                // Add classId to student
                const newClassIds = [...(student.classIds || []), classId];
                // Unique check just in case
                const uniqueIds = Array.from(new Set(newClassIds));
                return dbService.updateStudent(student.docId, { classIds: uniqueIds });
            });

            await Promise.all(updates);

            toast("${selectedStudentIds.size}명의 학생을 추가했습니다.");

            // Reset
            setSearchTerm('');
            setSelectedStudentIds(new Set());
            setIsAddingStudent(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("학생 추가 중 오류가 발생했습니다.");
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    const handleSortChange = (mode: 'date' | 'name' | 'custom', dir?: 'asc' | 'desc') => {
        const direction = dir || (mode === sortMode ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
        setSortMode(mode);
        setSortDirection(direction);
        let sorted = [...assignments];
        if (mode === 'date') {
            sorted.sort((a, b) => {
                const ta = getTime(a.createdAt);
                const tb = getTime(b.createdAt);
                if (ta || tb) return direction === 'desc' ? tb - ta : ta - tb;
                return direction === 'desc'
                    ? ((b as any).docId || b.id || '').localeCompare((a as any).docId || a.id || '')
                    : ((a as any).docId || a.id || '').localeCompare((b as any).docId || b.id || '');
            });
            setIsReordering(false);
        } else if (mode === 'name') {
            sorted.sort((a, b) => direction === 'asc'
                ? a.title.localeCompare(b.title)
                : b.title.localeCompare(a.title));
            setIsReordering(false);
        } else if (mode === 'custom') {
            sorted.sort((a, b) => {
                const oa = a.order ?? 9999;
                const ob = b.order ?? 9999;
                if (oa !== ob) return oa - ob;
                return getTime(a.createdAt) - getTime(b.createdAt);
            });
        }
        setAssignments(sorted);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setAssignments((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        if (!confirm("현재 순서를 저장하시겠습니까? 학생들에게도 이 순서대로 보여집니다.")) return;
        try {
            // Update all items with their new index
            const updates = assignments.map((assignment, index) =>
                dbService.updateAssignmentOrder(assignment.id, index)
            );
            await Promise.all(updates);
            toast.success("순서가 저장되었습니다.");
            setIsReordering(false); // Do not exit custom mode, just exit 'edit' state? 
            // Wait, isReordering just enables drag handles. 
            // Let's toggle it off.
        } catch (e) {
            console.error(e);
            toast.error("순서 저장 중 오류가 발생했습니다.");
        }
    };

    const handleToggleReorder = () => {
        if (isReordering) {
            // Cancel - Revert? 
            // For now just toggle off. If they want to revert they can reload or we store prev state.
            setIsReordering(false);
        } else {
            setSortMode('custom'); // Switch to custom automatically
            setIsReordering(true);
        }
    };

    const handleUpdateClass = async () => {
        if (!editingClassName.trim()) return;
        try {
            await dbService.updateClass(classId, { name: editingClassName });
            toast.success("클래스 이름이 수정되었습니다.");
            setIsSettingsModalOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("수정 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteClass = async () => {
        if (!window.confirm("정말 이 클래스를 삭제하시겠습니까? (복구 불가)")) return;
        try {
            await dbService.deleteClass(classId);
            toast.success("클래스가 삭제되었습니다.");
            router.push('/dashboard');
        } catch (e) {
            console.error(e);
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    // Approval/submission handlers (extracted to useClassApproval)
    const {
        openApprovalModal, handleApproveSubmission, handleApproveWithSplit,
        handleRejectSubmission, handleConvertAssignmentType,
        handleToggleGuidance, handleManualPass, handleExecuteReset,
    } = useClassApproval({
        assignments, allSubmissions, setAllSubmissions, allAssignmentsRaw,
        approvalModal, setApprovalModal, splitWordsPerChunk, setSplitWordsPerChunk,
        resetTargetAssignment, resetSelectedStudents, setIsResetModalOpen,
        loadData,
    });

    // Print handlers (extracted to useClassPrint)
    const { handlePrint, handleDirectPrint } = useClassPrint({
        assignments,
        selectedAssignments,
        allSubmissions,
        isPrintModalOpen, setIsPrintModalOpen,
        printTitle, setPrintTitle,
        printStudentId, setPrintStudentId,
    });

    return {
        // Router & Auth
        router, classId, user, isAdmin,
        // Data
        classData, assignments, setAssignments, allClasses, allStudents, allSubmissions, allAssignmentsRaw, expandedSelections, setExpandedSelections,
        loading,
        // Modal States
        isEditorOpen, setIsEditorOpen, isStudentModalOpen, setIsStudentModalOpen,
        isAddingStudent, setIsAddingStudent,
        editingAssignment, setEditingAssignment,
        isSettingsModalOpen, setIsSettingsModalOpen, editingClassName, setEditingClassName,
        isResetModalOpen, setIsResetModalOpen, resetTargetAssignment, resetSelectedStudents,
        approvalNeededCount, guidanceNeededCount,
        sortMode, sortDirection, isReordering, setIsReordering, originalOrder, setOriginalOrder,
        selectedAssignments, setSelectedAssignments,
        isSplitModalOpen, setIsSplitModalOpen, splitTarget, setSplitTarget, splitOptions, setSplitOptions,
        isPrintModalOpen, setIsPrintModalOpen, printTitle, setPrintTitle, printStudentId, setPrintStudentId,
        isStructurePrintOpen, setIsStructurePrintOpen, structurePrintStudentId, setStructurePrintStudentId, structurePrintStudentName, setStructurePrintStudentName,
        writingDetailTarget, setWritingDetailTarget,
        approvalModal, setApprovalModal, splitWordsPerChunk, setSplitWordsPerChunk,
        searchTerm, setSearchTerm, selectedStudentIds, setSelectedStudentIds,
        sensors,
        // Handlers
        toggleAssignmentSelection, handleMergeAssignments, handleSplitAssignment,
        loadData, handleCreateClick, handleEditClick, handleDeleteClick, handleResetClick,
        handleExecuteReset, toggleResetStudentSelection, handleAddSelectedStudents, toggleStudentSelection,
        handleSortChange, handleDragEnd, handleSaveOrder, handleToggleReorder,
        handleUpdateClass, handleDeleteClass,
        handleApproveSubmission, handleApproveWithSplit, handleRejectSubmission, handleConvertAssignmentType,
        handleToggleGuidance, handleManualPass, handlePrint, handleDirectPrint,
    };
}
