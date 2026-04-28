
import {
    collection, getDocs, addDoc, deleteDoc, doc, getDoc,
    query, where, orderBy, updateDoc, setDoc, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DEFAULT_TENANT_ID } from '@/lib/tenantConfig';
import { homeworkService, homeworkSubscriptions, initHomeworkService } from './dbHomework';

// Types
import { Assignment, Word, Class as SharedClass, Workbook, Chapter, Submission, Post, Feedback, StudentReport } from '@/types';

export interface Student {
    id: string;      // 학번/ID (예: ch001)
    docId?: string;  // Firestore Document ID
    name: string;
    classIds: string[]; // Multiple classes support (과제방)
    groupName?: string; // 반 이름 (예: "월수반", "화목반")
    password: string;
    tenantId?: string;
}

export interface ClassFolder {
    id: string; // docId
    name: string;
    parentId?: string | null;
    createdAt: number;
    tenantId?: string;
}

export interface Class {
    id: string; // docId
    name: string;
    folderId?: string; // Optional folder assignment
    studentIds?: string[];
    createdAt?: number;
    studentName?: string;
    tenantId?: string;
}
// Export Assignment from types to maintain compatibility without re-definition
export type { Assignment, Word, Submission, Feedback };

export interface WordBook {
    id: string;
    title: string;
    publisher: string;
    chapters: { name: string; words: Word[] }[];
    createdAt: number;
    tenantId?: string;
}

// ─── Tenant-aware helpers ───

/** 현재 활성 tenantId (컴포넌트 외부에서 주입) */
let _activeTenantId: string = DEFAULT_TENANT_ID;

/** 현재 활성 tenantId 설정 (TenantContext에서 호출) */
export function setActiveTenantId(id: string) {
    _activeTenantId = id;
    initHomeworkService(getActiveTenantId);
}

/** 현재 활성 tenantId 조회 */
export function getActiveTenantId(): string {
    return _activeTenantId;
}

/** 공유 콘텐츠 테넌트 ID */
export const SHARED_TENANT_ID = '__shared__';

/** 데이터의 tenantId를 확인 (fallback: cheonghan, __shared__는 모든 테넌트에서 접근 가능) */
function matchesTenant(data: Record<string, unknown>, tenantId: string): boolean {
    const dataTenant = (data.tenantId as string) || DEFAULT_TENANT_ID;
    return dataTenant === tenantId || dataTenant === SHARED_TENANT_ID;
}

// Convert Firestore Data to Type
const convertDoc = <T>(docSnap: { id: string; data: () => Record<string, unknown> }): T => {
    const data = docSnap.data();
    return {
        ...data,
        id: (data.id as string) || docSnap.id,
        docId: docSnap.id
    } as T;
};

/** Normalize DB submission fields to frontend interface */
const normalizeSubmission = (data: Submission): Submission => {
    if (!data.submittedAt && data.timestamp) {
        data.submittedAt = data.timestamp;
    }
    if (!data.attemptNumber && data.attempt) {
        data.attemptNumber = data.attempt;
    }
    return data;
};

export const dbService = {
    // --- Students ---
    getStudents: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            // 비기본 테넌트: 서버사이드 필터링 (성능 최적화)
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'students'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : collection(db, 'students');
            const sn = await getDocs(q);
            const results = sn.docs.map(d => {
                const data = convertDoc<Student>(d);
                if (!data.classIds) data.classIds = [];
                if (!data.password) data.password = '123456';
                return data;
            });
            // 기본 테넌트는 레거시 데이터(tenantId 미설정)도 포함해야 하므로 클라이언트 필터 유지
            return tid === DEFAULT_TENANT_ID ? results.filter(s => matchesTenant(s as any, tid)) : results;
        } catch (e) {
            console.error('Error fetching students:', e);
            return [];
        }
    },
    getStudent: async (id: string): Promise<Student | null> => {
        const q = query(collection(db, 'students'), where('id', '==', id));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docData = snapshot.docs[0].data();
        return { docId: snapshot.docs[0].id, ...docData } as Student;
    },
    addStudent: async (student: Omit<Student, 'docId'> & { id: string }, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newStudent = {
            ...student,
            classIds: student.classIds || [],
            password: student.password || '123456',
            tenantId: tid
        };
        const ref = await addDoc(collection(db, 'students'), newStudent);
        return { ...newStudent, docId: ref.id };
    },
    updateStudent: async (docId: string, data: Partial<Student>) => {
        await updateDoc(doc(db, 'students', docId), data);
    },
    deleteStudent: async (docId: string) => {
        await deleteDoc(doc(db, 'students', docId));
    },

    // --- Feedback ---
    addFeedback: async (feedback: Omit<Feedback, 'id' | 'docId'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const ref = await addDoc(collection(db, 'feedbacks'), {
            ...feedback,
            createdAt: Date.now(),
            status: 'pending',
            tenantId: tid
        });
        return ref.id;
    },
    getFeedbacks: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'feedbacks'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
            const sn = await getDocs(q);
            const results = sn.docs.map(d => convertDoc<Feedback>(d));
            const filtered = tid === DEFAULT_TENANT_ID ? results.filter(f => matchesTenant(f as any, tid)) : results;
            // 비기본 테넌트: orderBy 없으므로 클라이언트 정렬
            if (tid !== DEFAULT_TENANT_ID) {
                filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }
            return filtered;
        } catch (e) {
            console.error(e);
            return [];
        }
    },
    getClasses: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'classes'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : collection(db, 'classes');
            const classesSnap = await getDocs(q);
            const results = classesSnap.docs.map(d => convertDoc<Class>(d));
            return tid === DEFAULT_TENANT_ID ? results.filter(c => matchesTenant(c as any, tid)) : results;
        } catch (e) {
            console.error("Error fetching classes:", e);
            return [];
        }
    },
    addClass: async (name: string, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newClass = { name, tenantId: tid };
        const ref = await addDoc(collection(db, 'classes'), newClass);
        return { id: ref.id, ...newClass };
    },
    deleteClass: async (id: string) => {
        await deleteDoc(doc(db, 'classes', id));
    },
    updateClass: async (id: string, data: Partial<Class>) => {
        await updateDoc(doc(db, 'classes', id), data);
    },

    // --- Class Folders ---
    getClassFolders: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const snap = await getDocs(query(collection(db, 'class_folders'), orderBy('createdAt', 'asc')));
        return snap.docs.map(d => convertDoc<ClassFolder>(d))
            .filter(f => matchesTenant(f as any, tid));
    },
    addClassFolder: async (name: string, parentId?: string, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newFolder = { name, parentId: parentId || null, createdAt: Date.now(), tenantId: tid };
        const ref = await addDoc(collection(db, 'class_folders'), newFolder);
        return { id: ref.id, ...newFolder };
    },
    deleteClassFolder: async (id: string) => {
        await deleteDoc(doc(db, 'class_folders', id));
    },
    updateClassFolder: async (id: string, name: string, parentId?: string | null) => {
        const data: Record<string, string | null> = { name };
        if (parentId !== undefined) data.parentId = parentId ?? null;
        await updateDoc(doc(db, 'class_folders', id), data);
    },

    // --- Assignments ---
    getAssignments: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        // Helper: normalize any timestamp format to epoch ms
        const toEpoch = (val: any): number => {
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
        try {
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'assignments'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : collection(db, 'assignments');
            const sn = await getDocs(q);
            const mapped = sn.docs.map((d, idx) => {
                const data = convertDoc<Assignment>(d);
                if (!data.classIds && data.classId) {
                    data.classIds = [data.classId];
                } else if (!data.classIds) {
                    data.classIds = [];
                }
                // Normalize createdAt to epoch ms for consistent sorting
                const raw = toEpoch((data as any).createdAt);
                if (raw > 0) {
                    (data as any).createdAt = raw;
                } else {
                    // Fallback: use Firestore snapshot metadata if available
                    const snapTime = (d as any)._document?.createTime?.timestamp;
                    if (snapTime) {
                        (data as any).createdAt = snapTime.seconds * 1000;
                    }
                }
                return data;
            });
            return tid === DEFAULT_TENANT_ID ? mapped.filter(a => matchesTenant(a as any, tid)) : mapped;
        } catch (e) { console.error(e); return []; }
    },
    addAssignment: async (assignment: Omit<Assignment, 'id'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newAssignment = {
            ...assignment,
            classIds: assignment.classIds || (assignment.classId ? [assignment.classId] : []),
            createdAt: (assignment as any).createdAt || Date.now(),
            tenantId: tid
        };
        const ref = await addDoc(collection(db, 'assignments'), newAssignment);
        return { id: ref.id, ...newAssignment };
    },
    updateAssignment: async (docId: string, data: Partial<Assignment>) => {
        await updateDoc(doc(db, 'assignments', docId), data);
    },
    updateAssignmentOrder: async (docId: string, order: number) => {
        await updateDoc(doc(db, 'assignments', docId), { order });
    },
    deleteAssignment: async (docId: string) => {
        await deleteDoc(doc(db, 'assignments', docId));
    },
    getAssignmentById: async (id: string) => {
        const d = await getDoc(doc(db, 'assignments', id));
        if (d.exists()) return convertDoc<Assignment>(d);
        return null;
    },


    // --- Workbooks (Library) ---
    getWorkbooks: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'workbooks'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : query(collection(db, 'workbooks'), orderBy('createdAt', 'desc'));
            const sn = await getDocs(q);
            const results = sn.docs.map(d => convertDoc<Workbook>(d));
            // 기본 테넌트: 기존 matchesTenant 유지, 비기본: 이미 서버필터됨
            const filtered = tid === DEFAULT_TENANT_ID ? results.filter(w => matchesTenant(w as any, tid)) : results;
            // 비기본 테넌트는 orderBy가 없으므로 클라이언트 정렬
            if (tid !== DEFAULT_TENANT_ID) {
                filtered.sort((a, b) => ((b.createdAt as number) || 0) - ((a.createdAt as number) || 0));
            }
            return filtered;
        } catch (e) {
            console.error('Error fetching workbooks:', e);
            return [];
        }
    },
    addWorkbook: async (workbook: Omit<Workbook, 'id'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const docRef = await addDoc(collection(db, 'workbooks'), {
            ...workbook,
            createdAt: Date.now(),
            tenantId: tid
        });
        return docRef.id;
    },
    deleteWorkbook: async (id: string) => {
        await deleteDoc(doc(db, 'workbooks', id));
    },

    // --- Chapters (Library) ---
    getChapters: async (workbookId: string) => {
        try {
            const q = query(
                collection(db, 'chapters'),
                where('workbookId', '==', workbookId),
                orderBy('order', 'asc')
            );
            const sn = await getDocs(q);
            return sn.docs.map(d => convertDoc<Chapter>(d));
        } catch (e) {
            console.error('Error fetching chapters:', e);
            return [];
        }
    },
    addChapter: async (chapter: Omit<Chapter, 'id'>) => {
        const docRef = await addDoc(collection(db, 'chapters'), chapter);
        return docRef.id;
    },
    updateChapter: async (id: string, updates: Partial<Chapter>) => {
        await updateDoc(doc(db, 'chapters', id), updates);
    },
    deleteChapter: async (id: string) => {
        await deleteDoc(doc(db, 'chapters', id));
    },

    // --- Submissions ---
    getSubmissions: async (classId?: string, studentName?: string, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const q = tid !== DEFAULT_TENANT_ID
            ? query(collection(db, 'submissions'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
            : query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));

        const sn = await getDocs(q);
        let results = sn.docs.map(d => normalizeSubmission(convertDoc<Submission>(d)));
        // 기본 테넌트: matchesTenant 필터 유지
        if (tid === DEFAULT_TENANT_ID) {
            results = results.filter(s => matchesTenant(s as any, tid));
        } else {
            // 비기본 테넌트: orderBy 없으므로 클라이언트 정렬
            results.sort((a, b) => ((b.timestamp as number) || 0) - ((a.timestamp as number) || 0));
        }

        if (classId) results = results.filter(s => s.classId === classId);
        if (studentName) results = results.filter(s => s.studentName?.includes(studentName));

        return results;
    },
    addSubmission: async (submission: Omit<Submission, 'id' | 'timestamp'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newSub = { ...submission, timestamp: Date.now(), tenantId: tid };
        if (newSub.classId === undefined || newSub.classId === null) {
            newSub.classId = 'unknown';
        }
        const ref = await addDoc(collection(db, 'submissions'), newSub);
        return { id: ref.id, ...newSub };
    },
    getSubmissionHistory: async (studentId: string, assignmentId: string) => {
        if (!studentId || !assignmentId) return [];
        try {
            const q = query(
                collection(db, 'submissions'),
                where('studentId', '==', studentId),
                where('assignmentId', '==', assignmentId)
            );
            const sn = await getDocs(q);
            const results = sn.docs
                .map(d => convertDoc<Submission>(d))
                .map(normalizeSubmission);
            return results.sort((a, b) => a.attempt - b.attempt);
        } catch (e) {
            console.error('Error fetching submission history:', e);
            return [];
        }
    },
    getStudentSubmissions: async (studentId: string) => {
        try {
            const q = query(
                collection(db, 'submissions'),
                where('studentId', '==', studentId)
            );
            const sn = await getDocs(q);
            return sn.docs.map(d => normalizeSubmission(convertDoc<Submission>(d)));
        } catch (e) {
            console.error('Error fetching student submissions:', e);
            return [];
        }
    },
    updateSubmissionFeedback: async (id: string, isGiven: boolean) => {
        await updateDoc(doc(db, 'submissions', id), { isFeedbackGiven: isGiven });
    },
    updateSubmissionStatus: async (id: string, status: string) => {
        await updateDoc(doc(db, 'submissions', id), { status });
    },
    updateSubmissionGuidance: async (id: string, guidanceCompleted: boolean) => {
        await updateDoc(doc(db, 'submissions', id), { guidanceCompleted });
    },
    updateSubmissionManualPass: async (id: string, manualPass: boolean) => {
        await updateDoc(doc(db, 'submissions', id), { manualPass });
    },
    deleteSubmission: async (id: string) => {
        await deleteDoc(doc(db, 'submissions', id));
    },

    // --- Posts (Board/Blog) ---
    getPosts: async (type?: 'blog' | 'notice', tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            let q;
            if (type) {
                q = query(collection(db, 'posts'), where('type', '==', type));
            } else {
                q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
            }

            const sn = await getDocs(q);
            const posts = sn.docs.map(d => convertDoc<Post>(d))
                .filter(p => matchesTenant(p as any, tid));

            return posts.sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) {
            console.error('Error fetching posts:', e);
            return [];
        }
    },
    // --- Reset Logic ---
    resetAssignmentForStudents: async (assignmentId: string, studentIds: string[]) => {
        try {
            const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
            const sn = await getDocs(q);

            const batchDeletes = sn.docs
                .filter(d => studentIds.includes(d.data().studentId))
                .map(d => deleteDoc(d.ref));

            await Promise.all(batchDeletes);
            return true;
        } catch (e) {
            console.error("Error resetting assignment:", e);
            throw e;
        }
    },
    addPost: async (post: Omit<Post, 'id' | 'createdAt'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newPost = {
            ...post,
            createdAt: Date.now(),
            isVisible: true,
            tenantId: tid
        };
        const ref = await addDoc(collection(db, 'posts'), newPost);
        return { ...newPost, id: ref.id, docId: ref.id };
    },
    deletePost: async (id: string) => {
        await deleteDoc(doc(db, 'posts', id));
    },

    // --- WordBooks ---
    getWordBooks: async (tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        try {
            const q = tid !== DEFAULT_TENANT_ID
                ? query(collection(db, 'word_books'), where('tenantId', 'in', [tid, SHARED_TENANT_ID]))
                : collection(db, 'word_books');
            const sn = await getDocs(q);
            const results = sn.docs.map(d => convertDoc<WordBook>(d));
            return tid === DEFAULT_TENANT_ID ? results.filter(w => matchesTenant(w as any, tid)) : results;
        } catch (e) { console.error(e); return []; }
    },
    addWordBook: async (wb: Omit<WordBook, 'id' | 'createdAt'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const newBook = { ...wb, createdAt: Date.now(), tenantId: tid };
        const ref = await addDoc(collection(db, 'word_books'), newBook);
        return { ...newBook, id: ref.id };
    },

    // Word Annotations (자기만의 자습서)
    saveWordAnnotations: async (assignmentId: string, studentId: string, annotations: Record<string, string>) => {
        const docId = `${assignmentId}_${studentId}`;
        // Use setDoc WITHOUT merge to fully replace the document (merge: true would keep deleted annotation keys)
        await setDoc(doc(db, 'wordAnnotations', docId), {
            assignmentId,
            studentId,
            annotations,
            updatedAt: Date.now()
        });
    },
    getWordAnnotations: async (assignmentId: string, studentId: string): Promise<Record<string, string>> => {
        try {
            const docId = `${assignmentId}_${studentId}`;
            // Add timeout to prevent getDoc from hanging
            const timeoutPromise = new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('getDoc timeout after 5s')), 5000)
            );
            const snap = await Promise.race([
                getDoc(doc(db, 'wordAnnotations', docId)),
                timeoutPromise
            ]) as any;
            if (snap && snap.exists()) return snap.data().annotations || {};
            return {};
        } catch (e) { console.error('Failed to load annotations:', e); return {}; }
    },

    // ─── Tenant Management (슈퍼 관리자 전용) ───
    getTenants: async () => {
        try {
            const sn = await getDocs(collection(db, 'tenants'));
            return sn.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
        } catch (e) {
            console.error('Error fetching tenants:', e);
            return [];
        }
    },
    getTenant: async (tenantId: string) => {
        try {
            const d = await getDoc(doc(db, 'tenants', tenantId));
            if (d.exists()) return { id: d.id, ...d.data() } as Tenant;
            return null;
        } catch (e) {
            console.error('Error fetching tenant:', e);
            return null;
        }
    },
    addTenant: async (tenant: Omit<Tenant, 'id'>) => {
        const ref = await addDoc(collection(db, 'tenants'), tenant);
        return { id: ref.id, ...tenant };
    },
    updateTenant: async (tenantId: string, data: Partial<Tenant>) => {
        await updateDoc(doc(db, 'tenants', tenantId), data as Record<string, unknown>);
    },
    deleteTenant: async (tenantId: string) => {
        await deleteDoc(doc(db, 'tenants', tenantId));
    },
    getTenantByLoginId: async (loginId: string): Promise<Tenant | null> => {
        try {
            // 1. Check main adminLoginId first (fast Firestore query)
            const q = query(collection(db, 'tenants'), where('adminLoginId', '==', loginId));
            const sn = await getDocs(q);
            if (!sn.empty) return { id: sn.docs[0].id, ...sn.docs[0].data() } as Tenant;
            
            // 2. Fallback: search admins[] array (Firestore can't query nested array objects)
            const allSnap = await getDocs(collection(db, 'tenants'));
            for (const d of allSnap.docs) {
                const data = d.data();
                if (data.admins && Array.isArray(data.admins)) {
                    const match = data.admins.find((a: any) => a.loginId === loginId);
                    if (match) return { id: d.id, ...data } as Tenant;
                }
            }
            return null;
        } catch (e) {
            console.error('Error finding tenant by loginId:', e);
            return null;
        }
    },

    // --- Homework (delegated to dbHomework.ts) ---
    addHomework: homeworkService.addHomework,
    getHomeworks: homeworkService.getHomeworks,
    getStudentHomeworks: homeworkService.getStudentHomeworks,
    updateHomework: homeworkService.updateHomework,
    deleteHomework: homeworkService.deleteHomework,
    setHomeworkStatus: homeworkService.setHomeworkStatus,
    adminToggleHomeworkItem: homeworkService.adminToggleHomeworkItem,
    getHomeworkStatuses: homeworkService.getHomeworkStatuses,
    toggleStudentHomeworkItem: homeworkService.toggleStudentHomeworkItem,
    getStudentHomeworkStatus: homeworkService.getStudentHomeworkStatus,
    checkLinkedAssignmentCompletion: homeworkService.checkLinkedAssignmentCompletion,

    // ─── Reports ───

    addReport: async (report: Omit<StudentReport, 'id'>, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const ref = await addDoc(collection(db, 'reports'), { ...report, tenantId: tid });
        return { id: ref.id, ...report } as StudentReport;
    },
    updateReport: async (id: string, data: Partial<StudentReport>) => {
        await updateDoc(doc(db, 'reports', id), { ...data, updatedAt: Date.now() });
    },
    getStudentReports: async (studentId: string) => {
        const q = query(collection(db, 'reports'), where('studentId', '==', studentId));
        const sn = await getDocs(q);
        return sn.docs.map(d => ({ id: d.id, ...d.data() } as StudentReport))
            .sort((a, b) => (b.yearMonth || '').localeCompare(a.yearMonth || ''));
    },
    getReport: async (reportId: string) => {
        const d = await getDoc(doc(db, 'reports', reportId));
        if (!d.exists()) return null;
        return { id: d.id, ...d.data() } as StudentReport;
    },
    getReportsByMonth: async (yearMonth: string, tenantId?: string) => {
        const tid = tenantId || _activeTenantId;
        const q = query(collection(db, 'reports'), where('yearMonth', '==', yearMonth));
        const sn = await getDocs(q);
        return sn.docs.map(d => ({ id: d.id, ...d.data() } as StudentReport))
            .filter(r => matchesTenant(r as any, tid));
    },
    deleteReport: async (id: string) => {
        await deleteDoc(doc(db, 'reports', id));
    },
};

// ─── Real-time Subscription Functions (delegated to dbHomework.ts) ───
export const dbSubscriptions = {
    onHomeworks: homeworkSubscriptions.onHomeworks,
    onStudentHomeworks: homeworkSubscriptions.onStudentHomeworks,
    onStudentStatuses: homeworkSubscriptions.onStudentStatuses,
    onHomeworkStatuses: homeworkSubscriptions.onHomeworkStatuses,
};

// Re-export Tenant type
import type { Tenant } from '@/lib/tenantConfig';
import type { Homework, HomeworkStatus } from '@/types';

// Initialize homework service with tenant getter
initHomeworkService(getActiveTenantId);
