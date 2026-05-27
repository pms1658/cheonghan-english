import { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/services/db';
import { Assignment, Post } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export type FilterType = 'all' | 'in_progress' | 'completed' | 'guide';
export type CategoryFilter = 'all' | 'sat' | 'midterm';

export interface StudentDashboardData {
    assignments: (Assignment & { status: string; masteryLevel?: number; selectedWordCount?: number })[];
    notices: Post[];
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    studentName: string;
    showPasswordModal: boolean;
    setShowPasswordModal: (show: boolean) => void;
    passwordForm: { current: string; new: string; confirm: string };
    setPasswordForm: (form: { current: string; new: string; confirm: string }) => void;
    handlePasswordChange: () => Promise<void>;
    filteredAssignments: (Assignment & { status: string; masteryLevel?: number; selectedWordCount?: number })[];
    logout: () => void;
    installPrompt: any;
    handleInstallClick: () => void;
    studentId: string;
    myClasses: { id: string, name: string }[];
    categoryFilter: CategoryFilter;
    setCategoryFilter: (category: CategoryFilter) => void;
    loading: boolean;
}

export function useStudentDashboard(): StudentDashboardData {
    const [assignments, setAssignments] = useState<(Assignment & { status: string; masteryLevel?: number; selectedWordCount?: number })[]>([]);
    const [notices, setNotices] = useState<Post[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [studentName, setStudentName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [myClasses, setMyClasses] = useState<{ id: string, name: string }[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [dataLoading, setDataLoading] = useState(true);

    const loadData = useCallback(async (student: any) => {
        setDataLoading(true);
        try {
            // Optimized: Fetch only necessary data. Skip getStudents() as we trust the 'student' object passed.
            const [allAssignments, allNotices, allClasses] = await Promise.all([
                dbService.getAssignments(),
                dbService.getPosts('notice'),
                dbService.getClasses()
            ]);

            const currentStudent = student;
            // No need to check !currentStudent as it is guaranteed by caller

            // Notices
            setNotices(allNotices);

            // Filter assignments for this student's classes
            const studentClassIds = currentStudent.classIds || [];
            const validAssignments = allAssignments.filter(a => {
                if (a.studentIds && a.studentIds.length > 0) {
                    return a.studentIds.includes(currentStudent.id);
                }
                return (a.classIds || []).some(cid => studentClassIds.includes(cid));
            });

            // Set My Classes
            const enrolledClasses = allClasses.filter(c => studentClassIds.includes(c.id));
            setMyClasses(enrolledClasses.map(c => ({ id: c.id, name: c.name })));

            // Fetch History Optimized (Fetch ALL student submissions once)
            const allSubmissions = await dbService.getStudentSubmissions(student.id);

            const mapped = validAssignments.map(a => {
                // Filter submissions for this assignment in memory
                const history = allSubmissions.filter(s => s.assignmentId === a.id)
                    .sort((x, y) => x.attempt - y.attempt);

                const sub = history.length > 0 ? { history } : undefined;
                const isCompleted = (() => {
                    if (!sub || sub.history.length === 0) return false;
                    
                    // 구조독해/분석: 80점 이상 통과 또는 선생님 피드백 또는 관리자 PASS
                    if (a.type === 'structure' || a.type === 'analysis') {
                        return sub.history.some(h => h.score >= 80 || h.isFeedbackGiven || (h as any).manualPass === true);
                    }
                    
                    // 구조작문: 90점 이상 통과
                    if (a.type === 'writing') {
                        return sub.history.some(h => h.score >= 90);
                    }
                    
                    // 워크북: 100점 (2단계까지 완료 = score 100 or status 'passed')
                    if (a.type === 'workbook') {
                        return sub.history.some(h => h.score >= 100 || (h as any).status === 'passed');
                    }
                    
                    // 단어선택: 승인만으로는 완료X, 분할된 자식 과제가 모두 100점이어야 완료
                    if (a.type === 'selection') {
                        // Check if child assignments exist and ALL are completed
                        const childAssignments = allSubmissions.filter(s => {
                            // Find submissions for child assignments of this selection
                            const childAss = validAssignments.find(va => va.parentAssignmentId === a.id && va.parentStudentId === student.id);
                            return childAss && s.assignmentId === childAss.id;
                        });
                        // If there are child (split) assignments, check those instead
                        const children = validAssignments.filter(va => va.parentAssignmentId === a.id && va.parentStudentId === student.id);
                        if (children.length > 0) {
                            return children.every(child => {
                                const childSubs = allSubmissions.filter(s => s.assignmentId === child.id);
                                return childSubs.some(s => s.score >= 100);
                            });
                        }
                        // No children yet = not completed (just submitted/approved)
                        return sub.history.some(h => h.score >= 100);
                    }

                    // 단어학습/변형문제: 100점 통과
                    if (a.type === 'vocabulary' || a.type === 'transform') {
                        return sub.history.some(h => h.score >= 100);
                    }
                    
                    // Default fallback
                    return sub.history.some(h => h.score >= 80 || h.isFeedbackGiven || (h as any).manualPass === true);
                })();

                let selectedWordCount = undefined;
                if (a.type === 'selection') {
                    const selectionSub = sub?.history.find(h => h.status === 'approved' || h.status === 'pending_review');
                    if (selectionSub && selectionSub.details && selectionSub.details.length > 0 && selectionSub.details[0]?.selectedIndices) {
                        selectedWordCount = selectionSub.details[0].selectedIndices.length;
                    }
                }

                const masteryLevel = sub && sub.history.length > 0
                    ? Math.max(...sub.history.map(h => (h as any).masteryLevel || 0))
                    : undefined;

                // Track latest activity timestamp for sorting
                const latestActivity = history.length > 0
                    ? Math.max(...history.map(h => (h as any).timestamp || 0))
                    : 0;

                return {
                    ...a,
                    status: (isCompleted ? 'completed' : 'assigned') as 'assigned' | 'completed',
                    masteryLevel,
                    selectedWordCount,
                    _latestActivity: latestActivity
                };
            });

            // Sort by latest activity (most recently worked on first)
            mapped.sort((a, b) => {
                const aTime = (a as any)._latestActivity || (a as any).createdAt || 0;
                const bTime = (b as any)._latestActivity || (b as any).createdAt || 0;
                return bTime - aTime;
            });

            // Group child assignments under parent
            const childMap = new Map<string, typeof mapped>();
            const parentIds = new Set(mapped.filter(a => a.parentAssignmentId).map(a => a.parentAssignmentId!));
            
            mapped.forEach(a => {
                if (a.parentAssignmentId) {
                    const existing = childMap.get(a.parentAssignmentId) || [];
                    existing.push(a);
                    childMap.set(a.parentAssignmentId, existing);
                }
            });

            // Filter out child assignments from main list and attach to parents
            const grouped = mapped
                .filter(a => !a.parentAssignmentId) // Exclude child assignments from main list
                .map(a => ({
                    ...a,
                    childAssignments: childMap.get(a.id) || []
                }));

            setAssignments(grouped as any);
        } catch (e) {
            console.error("Failed to load dashboard data", e);
        } finally {
            setDataLoading(false);
        }
    }, []);

    const { user, loading } = useAuth(); // Consume Context

    useEffect(() => {
        if (loading) return; // Wait for auth init

        if (!user && !localStorage.getItem('CHEONGHAN_STUDENT')) {
            window.location.href = '/';
            return;
        }

        const student = user || JSON.parse(localStorage.getItem('CHEONGHAN_STUDENT') || '{}');
        if (student && student.id) {
            setStudentName(student.name);
            setStudentId(student.id);
            loadData(student); // ✅ Pass entire student object, not just student.id
        } else {
            setDataLoading(false);
        }
    }, [user, loading, loadData]);

    // PWA Install Prompt
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };

    const filteredAssignments = assignments.filter(a => {
        if (filter === 'all') return a.status !== 'completed'; // Hide completed from default view
        if (filter === 'completed') return a.status === 'completed';
        if (filter === 'in_progress') return a.status !== 'completed';
        return false;
    });

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

    const handlePasswordChange = async () => {
        if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
            toast.warning('모든 필드를 입력해주세요.');
            return;
        }
        if (passwordForm.new !== passwordForm.confirm) {
            toast.warning('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        const stored = localStorage.getItem('CHEONGHAN_STUDENT');
        if (!stored) return;
        const student = JSON.parse(stored);

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userType: 'student',
                    userId: student.id,
                    currentPassword: passwordForm.current,
                    newPassword: passwordForm.new,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                toast.error(result.error || '비밀번호 변경에 실패했습니다.');
                return;
            }

            toast.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('CHEONGHAN_STUDENT');
            localStorage.removeItem('CHEONGHAN_AUTO_LOGIN');
            window.location.href = '/';
        } catch (e) {
            console.error('Password change failed:', e);
            toast.error('비밀번호 변경 중 오류가 발생했습니다.');
        }
    };

    const logout = () => {
        window.location.href = '/';
    };

    return {
        assignments,
        notices,
        filter,
        setFilter,
        studentName,
        showPasswordModal,
        setShowPasswordModal,
        passwordForm,
        setPasswordForm,
        handlePasswordChange,
        filteredAssignments,
        logout,
        installPrompt,
        handleInstallClick,
        studentId,
        myClasses,
        categoryFilter,
        setCategoryFilter,
        loading: loading || dataLoading
    };
}
