
import {
    collection, getDocs, addDoc, deleteDoc, doc, getDoc,
    query, where, updateDoc, setDoc, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DEFAULT_TENANT_ID } from '@/lib/tenantConfig';
import type { Homework, HomeworkStatus } from '@/types';

// ─── Tenant helpers (shared) ───
let _getActiveTenantId: () => string;

export function initHomeworkService(getActiveTenantId: () => string) {
    _getActiveTenantId = getActiveTenantId;
}

function matchesTenant(data: Record<string, unknown>, tenantId: string): boolean {
    const dataTenant = (data.tenantId as string) || DEFAULT_TENANT_ID;
    return dataTenant === tenantId || dataTenant === '__shared__';
}

const convertDoc = <T>(docSnap: { id: string; data: () => Record<string, unknown> }): T => {
    const data = docSnap.data();
    return {
        ...data,
        id: (data.id as string) || docSnap.id,
        docId: docSnap.id
    } as T;
};

// ─── Homework CRUD ───
export const homeworkService = {
    addHomework: async (homework: Omit<Homework, 'id'>, tenantId?: string) => {
        const tid = tenantId || _getActiveTenantId();
        const newHomework = {
            ...homework,
            createdAt: homework.createdAt || Date.now(),
            tenantId: tid
        };
        const ref = await addDoc(collection(db, 'homework'), newHomework);
        return { id: ref.id, ...newHomework } as Homework;
    },
    getHomeworks: async (tenantId?: string) => {
        const tid = tenantId || _getActiveTenantId();
        try {
            const sn = await getDocs(collection(db, 'homework'));
            return sn.docs.map(d => convertDoc<Homework>(d))
                .filter(h => matchesTenant(h as any, tid))
                .sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) { console.error('Error fetching homework:', e); return []; }
    },
    getStudentHomeworks: async (studentId: string, tenantId?: string) => {
        const tid = tenantId || _getActiveTenantId();
        try {
            const sn = await getDocs(collection(db, 'homework'));
            return sn.docs.map(d => convertDoc<Homework>(d))
                .filter(h => matchesTenant(h as any, tid))
                .filter(h => h.studentIds?.includes(studentId))
                .sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) { console.error('Error fetching student homework:', e); return []; }
    },
    updateHomework: async (id: string, data: Partial<Homework>) => {
        await updateDoc(doc(db, 'homework', id), data as Record<string, unknown>);
    },
    deleteHomework: async (id: string) => {
        await deleteDoc(doc(db, 'homework', id));
    },
    setHomeworkStatus: async (homeworkId: string, studentId: string, data: { studentName: string; completed: boolean; note?: string }) => {
        const docId = `${homeworkId}_${studentId}`;
        await setDoc(doc(db, 'homework_status', docId), {
            homeworkId,
            studentId,
            ...data,
            checkedAt: Date.now()
        }, { merge: true });
    },
    adminToggleHomeworkItem: async (homeworkId: string, studentId: string, studentName: string, itemIndex: number, totalOfflineItems: number) => {
        const docId = `${homeworkId}_${studentId}`;
        const docRef = doc(db, 'homework_status', docId);
        try {
            const snap = await getDoc(docRef);
            const existing = snap.exists() ? snap.data() : {};
            const currentConfirmed: number[] = existing.adminConfirmedItems || [];
            
            const newConfirmed = currentConfirmed.includes(itemIndex)
                ? currentConfirmed.filter((i: number) => i !== itemIndex)
                : [...currentConfirmed, itemIndex];
            
            const allConfirmed = newConfirmed.length >= totalOfflineItems;
            
            await setDoc(docRef, {
                homeworkId,
                studentId,
                studentName,
                adminConfirmedItems: newConfirmed,
                completed: allConfirmed,
                checkedAt: Date.now(),
                ...(existing.completedItems !== undefined ? { completedItems: existing.completedItems } : {}),
                ...(existing.studentCompleted !== undefined ? { studentCompleted: existing.studentCompleted } : {}),
                ...(existing.studentCheckedAt !== undefined ? { studentCheckedAt: existing.studentCheckedAt } : {}),
            }, { merge: true });
            
            return { adminConfirmedItems: newConfirmed, completed: allConfirmed };
        } catch (e) {
            console.error('Error toggling admin homework item:', e);
            throw e;
        }
    },
    getHomeworkStatuses: async (homeworkId: string) => {
        try {
            const q = query(collection(db, 'homework_status'), where('homeworkId', '==', homeworkId));
            const sn = await getDocs(q);
            return sn.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkStatus));
        } catch (e) { console.error('Error fetching homework statuses:', e); return []; }
    },
    toggleStudentHomeworkItem: async (homeworkId: string, studentId: string, studentName: string, itemIndex: number, totalItems: number) => {
        const docId = `${homeworkId}_${studentId}`;
        const docRef = doc(db, 'homework_status', docId);
        try {
            const snap = await getDoc(docRef);
            const existing = snap.exists() ? snap.data() : {};
            const currentItems: number[] = existing.completedItems || [];
            
            const newItems = currentItems.includes(itemIndex)
                ? currentItems.filter(i => i !== itemIndex)
                : [...currentItems, itemIndex];
            
            const allDone = newItems.length >= totalItems;
            
            await setDoc(docRef, {
                homeworkId,
                studentId,
                studentName,
                completedItems: newItems,
                studentCompleted: allDone,
                studentCheckedAt: Date.now(),
                ...(existing.completed !== undefined ? { completed: existing.completed } : {}),
                ...(existing.checkedAt !== undefined ? { checkedAt: existing.checkedAt } : {}),
                ...(existing.note !== undefined ? { note: existing.note } : {}),
            }, { merge: true });
            
            return { completedItems: newItems, studentCompleted: allDone };
        } catch (e) {
            console.error('Error toggling student homework item:', e);
            throw e;
        }
    },
    getStudentHomeworkStatus: async (homeworkId: string, studentId: string): Promise<HomeworkStatus | null> => {
        const docId = `${homeworkId}_${studentId}`;
        try {
            const snap = await getDoc(doc(db, 'homework_status', docId));
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as HomeworkStatus;
            }
            return null;
        } catch (e) {
            console.error('Error fetching student homework status:', e);
            return null;
        }
    },
    checkLinkedAssignmentCompletion: async (studentId: string, assignmentIds: string[], sinceTimestamp?: number): Promise<string[]> => {
        if (!assignmentIds.length) return [];
        try {
            const q = query(
                collection(db, 'submissions'),
                where('studentId', '==', studentId)
            );
            const sn = await getDocs(q);
            const submittedAssignmentIds = new Set(
                sn.docs
                    .filter(d => {
                        if (!sinceTimestamp) return true;
                        const data = d.data();
                        const submittedAt = data.submittedAt || data.timestamp || 0;
                        return submittedAt >= sinceTimestamp;
                    })
                    .map(d => d.data().assignmentId)
                    .filter(Boolean)
            );
            return assignmentIds.filter(id => submittedAssignmentIds.has(id));
        } catch (e) {
            console.error('Error checking linked assignment completion:', e);
            return [];
        }
    },
};

// ─── Real-time Subscription Functions ───
export const homeworkSubscriptions = {
    onHomeworks: (tenantId: string | undefined, callback: (hws: Homework[]) => void) => {
        const tid = tenantId || _getActiveTenantId();
        return onSnapshot(collection(db, 'homework'), (snapshot) => {
            const hws = snapshot.docs.map(d => convertDoc<Homework>(d))
                .filter(h => matchesTenant(h as any, tid))
                .sort((a, b) => b.createdAt - a.createdAt);
            callback(hws);
        });
    },
    onStudentHomeworks: (studentId: string, tenantId: string | undefined, callback: (hws: Homework[]) => void) => {
        const tid = tenantId || _getActiveTenantId();
        return onSnapshot(collection(db, 'homework'), (snapshot) => {
            const hws = snapshot.docs.map(d => convertDoc<Homework>(d))
                .filter(h => matchesTenant(h as any, tid))
                .filter(h => h.studentIds?.includes(studentId))
                .sort((a, b) => b.createdAt - a.createdAt);
            callback(hws);
        });
    },
    onStudentStatuses: (studentId: string, callback: (statuses: HomeworkStatus[]) => void) => {
        const q = query(collection(db, 'homework_status'), where('studentId', '==', studentId));
        return onSnapshot(q, (snapshot) => {
            const statuses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkStatus));
            callback(statuses);
        });
    },
    onHomeworkStatuses: (homeworkId: string, callback: (statuses: HomeworkStatus[]) => void) => {
        const q = query(collection(db, 'homework_status'), where('homeworkId', '==', homeworkId));
        return onSnapshot(q, (snapshot) => {
            const statuses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkStatus));
            callback(statuses);
        });
    },
};
