'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { dbService } from '@/services/db';
import { isSuperAdmin } from '@/lib/tenantConfig';
import { getAdminByEmail } from '@/lib/adminConfig';
import { setActiveTenantId } from '@/services/db';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, pw: string) => Promise<void>;
    loginStudent: (studentData: any) => Promise<void>;
    loginTenantAdmin: (tenantData: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    loginStudent: async () => { },
    loginTenantAdmin: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // 1. Firebase Auth Listener (Admin)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Check if this is an anonymous user (Tenant Admin)
                if (firebaseUser.isAnonymous) {
                    const storedTenantAdmin = localStorage.getItem('CHEONGHAN_TENANT_ADMIN');
                    if (storedTenantAdmin) {
                        try {
                            const tenantData = JSON.parse(storedTenantAdmin);
                            (firebaseUser as any).role = 'admin';
                            (firebaseUser as any).isSuperAdmin = false;
                            (firebaseUser as any).isTenantAdmin = true;
                            (firebaseUser as any).tenantId = tenantData.id;
                            (firebaseUser as any).tenantName = tenantData.name;
                            (firebaseUser as any).displayName = tenantData.ownerName || tenantData.name || 'Admin';
                            (firebaseUser as any).email = tenantData.ownerEmail;
                            setActiveTenantId(tenantData.id);
                            setUser(firebaseUser);
                            setLoading(false);
                            return;
                        } catch (e) {
                            console.error('Failed to parse tenant admin data', e);
                        }
                    }
                    // Anonymous without tenant data — check for student
                    const storedStudent = localStorage.getItem('CHEONGHAN_STUDENT');
                    if (storedStudent) {
                        // Student with anonymous auth — keep auth active, set user from localStorage
                        try {
                            const localData = JSON.parse(storedStudent);
                            createUserObject(localData);
                            setLoading(false);
                            return;
                        } catch (e) {
                            console.error('Failed to parse student data', e);
                        }
                    }
                    // Anonymous without any data — sign out
                    await signOut(auth).catch(() => { });
                    setUser(null);
                    setLoading(false);
                    return;
                }
                // Regular Admin Login (Firebase email/password)
                const email = firebaseUser.email || '';
                (firebaseUser as any).role = 'admin';
                (firebaseUser as any).isSuperAdmin = isSuperAdmin(email);
                const adminInfo = getAdminByEmail(email);
                const tid = adminInfo?.tenantId || 'cheonghan';
                (firebaseUser as any).tenantId = tid;
                setActiveTenantId(tid);
                setUser(firebaseUser);
                setLoading(false);
            } else {
                // 2. Fallback: check localStorage for tenant admin
                const storedTenantAdmin = localStorage.getItem('CHEONGHAN_TENANT_ADMIN');
                if (storedTenantAdmin) {
                    // Tenant admin found but no Firebase auth — re-establish anonymous auth
                    // onAuthStateChanged will fire again with the anonymous user
                    try {
                        await signInAnonymously(auth);
                    } catch (e) {
                        console.error('Failed to re-auth tenant admin:', e);
                        localStorage.removeItem('CHEONGHAN_TENANT_ADMIN');
                        setUser(null);
                        setLoading(false);
                    }
                    return; // onAuthStateChanged will handle it
                }
                // 3. Fallback: check localStorage for student
                const storedStudent = localStorage.getItem('CHEONGHAN_STUDENT');
                if (storedStudent) {
                    // Student found but no Firebase auth — establish anonymous auth
                    // onAuthStateChanged will fire again and the anonymous handler
                    // will detect CHEONGHAN_STUDENT and set up the user
                    try {
                        await signInAnonymously(auth);
                    } catch (e) {
                        console.error('Failed to re-auth student:', e);
                        // Fallback: set user from localStorage even without auth
                        try {
                            createUserObject(JSON.parse(storedStudent));
                        } catch {
                            setUser(null);
                        }
                        setLoading(false);
                    }
                    return; // onAuthStateChanged will handle it
                } else {
                    setUser(null);
                }
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Helper to standardize student user creation
    const createUserObject = (studentData: any) => {
        const studentUser: any = {
            uid: studentData.id,
            displayName: studentData.name || studentData.id || 'Student',
            email: null,
            emailVerified: false,
            isAnonymous: false,
            metadata: {},
            providerData: [],
            refreshToken: '',
            tenantId: null,
            delete: async () => { },
            getIdToken: async () => '',
            getIdTokenResult: async () => ({} as any),
            reload: async () => { },
            toJSON: () => ({}),
            phoneNumber: null,
            photoURL: null,
            role: 'student',
            ...studentData,
            name: studentData.name || studentData.id || 'Student',
            classIds: Array.isArray(studentData.classIds) ? studentData.classIds : []
        };
        setUser(studentUser);
    };

    const login = async (email: string, pw: string) => {
        const result = await signInWithEmailAndPassword(auth, email, pw);
        if (result.user) {
            // Both admin and regular users go to dashboard
            router.push('/dashboard');
        }
    };

    const loginStudent = async (studentData: any) => {
        try {
            // 1. Fetch Fresh Data FIRST (while still Admin/Authenticated)
            // This avoids permission errors if 'students' collection is protected.
            let freshData: any = null;
            try {
                freshData = await dbService.getStudent(studentData.id);
            } catch (e) {
                // May fail if not authenticated — use provided data
                console.warn('Could not fetch fresh student data, using provided:', e);
            }
            const finalData = freshData || studentData;

            // 2. Set Local Storage BEFORE signing out
            // This ensures data is ready when onAuthStateChanged reads it
            localStorage.setItem('CHEONGHAN_STUDENT', JSON.stringify(finalData));

            // 3. Sign Out if currently authenticated (Clear Admin Session)
            await signOut(auth).catch(() => { });

            // 4. Sign in anonymously for Firestore security rules (auth != null)
            // This is silent — student doesn't see or interact with this
            await signInAnonymously(auth).catch((e) => {
                console.warn('Anonymous auth failed (non-critical):', e);
            });

            // 5. Set user state directly
            createUserObject(finalData);

            // 6. Small delay to ensure state has propagated to all components
            await new Promise(resolve => setTimeout(resolve, 50));

            // 7. Navigate
            router.push('/dashboard');
        } catch (e) {
            console.error("Login fetch error:", e);
            // Fallback:
            await signOut(auth).catch(() => { });
            localStorage.setItem('CHEONGHAN_STUDENT', JSON.stringify(studentData));
            await signInAnonymously(auth).catch(() => { });
            createUserObject(studentData);
            await new Promise(resolve => setTimeout(resolve, 50));
            router.push('/dashboard');
        }
    };

    const logout = async () => {
        await signOut(auth).catch(() => { }); // Clear Firebase (may fail if not logged in via Firebase)
        localStorage.removeItem('CHEONGHAN_STUDENT');
        localStorage.removeItem('CHEONGHAN_TENANT_ADMIN');
        localStorage.removeItem('SAVED_ID');
        localStorage.removeItem('CHEONGHAN_AUTO_LOGIN');
        setUser(null);
        router.push('/');
    };

    const loginTenantAdmin = async (tenantData: any) => {
        // ★ localStorage에 먼저 저장 (onAuthStateChanged보다 먼저!)
        localStorage.setItem('CHEONGHAN_TENANT_ADMIN', JSON.stringify(tenantData));
        setActiveTenantId(tenantData.id);
        
        // Sign out existing session, then sign in anonymously
        await signOut(auth).catch(() => { });
        await signInAnonymously(auth);
        // onAuthStateChanged will fire and detect anonymous + localStorage → tenant admin
        
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push('/dashboard');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginStudent, loginTenantAdmin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
