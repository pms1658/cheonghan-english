
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
    checkLinkedAssignmentCompletion: async (studentId: string, assignmentIds: string[], sinceTimestamp?: number, homeworkId?: string): Promise<string[]> => {
        if (!assignmentIds.length) return [];
        try {
            // 1. 해당 학생의 모든 submission 조회
            const q = query(
                collection(db, 'submissions'),
                where('studentId', '==', studentId)
            );
            const sn = await getDocs(q);

            // 2. 과제 유형 조회 (유형별 완료 기준 적용용)
            const assignmentTypes: Record<string, string> = {};
            await Promise.all(assignmentIds.map(async (aid) => {
                try {
                    const aDoc = await getDoc(doc(db, 'assignments', aid));
                    if (aDoc.exists()) {
                        assignmentTypes[aid] = (aDoc.data().type as string) || '';
                    }
                } catch { /* ignore */ }
            }));

            // 3. 유형별 완료 기준 점수
            const getPassScore = (type: string): number => {
                switch (type) {
                    case 'structure':
                    case 'analysis':
                        return 80;  // 구조독해/분석: 80점
                    case 'writing':
                    case 'writing_session':
                        return 90;  // 구조작문: 90점
                    default:
                        return 100; // 단어/변형/워크북 등: 100점
                }
            };

            // 4. fromHomeworkId 기반 매칭
            // directMatch: 이 homeworkId로 태그된 submission의 최고 점수
            const directBestScores: Record<string, number> = {};
            // poolBestScores: fromHomeworkId 없거나 다른 hw의 submission (풀 방식 대상)
            const poolBestScores: Record<string, number> = {};

            sn.docs.forEach(d => {
                const data = d.data();
                const aid = data.assignmentId;
                if (!aid || !assignmentIds.includes(aid)) return;

                // sinceTimestamp 이후 제출만 인정
                if (sinceTimestamp) {
                    const submittedAt = data.submittedAt || data.timestamp || 0;
                    if (submittedAt < sinceTimestamp) return;
                }

                const score = data.score ?? 0;
                const subHwId = data.fromHomeworkId;

                if (homeworkId && subHwId === homeworkId) {
                    // 직접 매칭: 이 과제 링크를 통해 제출된 것
                    directBestScores[aid] = Math.max(directBestScores[aid] || 0, score);
                } else if (!subHwId) {
                    // 풀 대상: fromHomeworkId가 없는 submission (과제방 직접 접근 등)
                    poolBestScores[aid] = Math.max(poolBestScores[aid] || 0, score);
                }
                // 다른 homeworkId로 태그된 submission은 무시 (그 과제에서 이미 소비됨)
            });

            // 5. 유형별 기준 충족 여부 판단
            // 직접 매칭이 합격이면 즉시 완료
            const directCompleted = assignmentIds.filter(aid => {
                const passScore = getPassScore(assignmentTypes[aid] || '');
                return (directBestScores[aid] || 0) >= passScore;
            });

            // 풀 매칭: 직접 매칭으로 완료되지 않은 assignment에 대해
            // 해당 assignmentId를 연동한 모든 homework를 조회 → 가장 오래된 미완료부터 차감
            const poolCandidates = assignmentIds.filter(aid => {
                if (directCompleted.includes(aid)) return false;
                const passScore = getPassScore(assignmentTypes[aid] || '');
                return (poolBestScores[aid] || 0) >= passScore;
            });

            if (poolCandidates.length > 0 && homeworkId) {
                // 해당 학생의 모든 homework를 조회하여 이 assignmentId를 연동한 것들을 찾기
                const allHws = await getDocs(collection(db, 'homework'));
                const poolCompleted: string[] = [];

                for (const aid of poolCandidates) {
                    // 이 assignmentId를 linkedAssignment로 가진 모든 homework를 찾아 createdAt 오름차순 정렬
                    const hwsWithThisAssignment = allHws.docs
                        .map(d => ({ id: d.id, ...d.data() } as any))
                        .filter((hw: any) =>
                            hw.studentIds?.includes(studentId) &&
                            hw.linkedAssignments?.some((la: any) => la.assignmentId === aid)
                        )
                        .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));

                    // 가장 오래된 미완료 homework에 배정
                    // 현재 homeworkId가 가장 오래된 것이면 이 과제에서 완료 인정
                    if (hwsWithThisAssignment.length > 0 && hwsWithThisAssignment[0].id === homeworkId) {
                        poolCompleted.push(aid);
                    }
                    // 과제가 하나뿐이면 (중복 연동 아님) 그냥 완료 인정
                    else if (hwsWithThisAssignment.length <= 1) {
                        poolCompleted.push(aid);
                    }
                }

                return [...directCompleted, ...poolCompleted];
            }

            // homeworkId가 없는 경우 (기존 호환: 전부 인정)
            if (!homeworkId) {
                return assignmentIds.filter(aid => {
                    const passScore = getPassScore(assignmentTypes[aid] || '');
                    const best = Math.max(directBestScores[aid] || 0, poolBestScores[aid] || 0);
                    return best >= passScore;
                });
            }

            return [...directCompleted, ...poolCandidates];
        } catch (e) {
            console.error('Error checking linked assignment completion:', e);
            return [];
        }
    },
    /** 과제방 linked assignment 세부 상태 조회 (v2.1)
     * 반환: { completedIds: string[], statuses: Record<assignmentId, status> }
     * status: 'pending_review' | 'approved' | 'in_progress' | 'completed'
     */
    checkLinkedAssignmentStatuses: async (studentId: string, assignmentIds: string[], sinceTimestamp?: number, homeworkId?: string): Promise<{
        completedIds: string[];
        statuses: Record<string, 'pending_review' | 'approved' | 'in_progress' | 'completed'>;
    }> => {
        if (!assignmentIds.length) return { completedIds: [], statuses: {} };
        try {
            const q = query(
                collection(db, 'submissions'),
                where('studentId', '==', studentId)
            );
            const sn = await getDocs(q);

            // 과제 유형 조회
            const assignmentTypes: Record<string, string> = {};
            await Promise.all(assignmentIds.map(async (aid) => {
                try {
                    const aDoc = await getDoc(doc(db, 'assignments', aid));
                    if (aDoc.exists()) {
                        assignmentTypes[aid] = (aDoc.data().type as string) || '';
                    }
                } catch { /* ignore */ }
            }));

            const getPassScore = (type: string): number => {
                switch (type) {
                    case 'structure':
                    case 'analysis':
                        return 80;
                    case 'writing':
                    case 'writing_session':
                        return 90;
                    default:
                        return 100;
                }
            };

            // 각 assignment별 submission 정보 수집
            // homeworkId가 있으면: 직접 매칭 + 미태그만 고려
            const bestScores: Record<string, number> = {};
            const latestStatuses: Record<string, string> = {};
            const hasTestSubmission: Record<string, boolean> = {};
            const hasRoundComplete: Record<string, boolean> = {};

            sn.docs.forEach(d => {
                const data = d.data();
                const aid = data.assignmentId;
                if (!aid || !assignmentIds.includes(aid)) return;

                if (sinceTimestamp) {
                    const submittedAt = data.submittedAt || data.timestamp || 0;
                    if (submittedAt < sinceTimestamp) return;
                }

                // fromHomeworkId 필터링: 다른 homework에 태그된 submission 무시
                const subHwId = data.fromHomeworkId;
                if (homeworkId && subHwId && subHwId !== homeworkId) return;

                const score = data.score ?? 0;
                const status = data.status || '';

                bestScores[aid] = Math.max(bestScores[aid] || 0, score);

                if (score > 0) {
                    hasTestSubmission[aid] = true;
                }

                if (status === 'round_complete') {
                    hasRoundComplete[aid] = true;
                }

                if (status === 'pending_review' || status === 'approved' || status === 'selection_rejected') {
                    const prevStatus = latestStatuses[aid];
                    if (!prevStatus ||
                        status === 'approved' ||
                        (status === 'pending_review' && prevStatus !== 'approved')) {
                        latestStatuses[aid] = status;
                    }
                }
            });

            // 상태 결정
            const statuses: Record<string, 'pending_review' | 'approved' | 'in_progress' | 'completed'> = {};
            const completedIds: string[] = [];

            assignmentIds.forEach(aid => {
                const passScore = getPassScore(assignmentTypes[aid] || '');
                const best = bestScores[aid] || 0;
                const latestStatus = latestStatuses[aid];
                const type = assignmentTypes[aid] || '';
                const isVocabType = type === 'vocabulary' || type === 'selection';
                const isTransformType = type === 'transform' || type === 'transform_subjective' || type === 'external_subjective' || type === 'mock_exam';

                if (isTransformType && hasRoundComplete[aid]) {
                    statuses[aid] = 'completed';
                    completedIds.push(aid);
                } else if (best >= passScore) {
                    statuses[aid] = 'completed';
                    completedIds.push(aid);
                } else if (isVocabType && latestStatus === 'pending_review') {
                    statuses[aid] = 'pending_review';
                } else if (isVocabType && latestStatus === 'approved') {
                    statuses[aid] = 'approved';
                } else if (hasTestSubmission[aid] || best > 0) {
                    statuses[aid] = 'in_progress';
                }
            });

            return { completedIds, statuses };
        } catch (e) {
            console.error('Error checking linked assignment statuses:', e);
            return { completedIds: [], statuses: {} };
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
    /** 학생의 submissions 변화 실시간 구독 (과제방 linked assignment 상태 즉시 반영용) */
    onStudentSubmissions: (studentId: string, callback: () => void) => {
        const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
        return onSnapshot(q, () => {
            callback();
        });
    },
};
