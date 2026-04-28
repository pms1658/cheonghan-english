'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/services/db';
import { ADMIN_LOGIN_IDS, getAdminEmailByLoginId } from '@/lib/adminConfig';
import { toast } from 'sonner';

const AUTO_LOGIN_KEY = 'CHEONGHAN_AUTO_LOGIN';
const SAVED_ID_KEY = 'SAVED_ID';

export default function LoginForm() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [autoLogin, setAutoLogin] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [autoLoggingIn, setAutoLoggingIn] = useState(true);
    const router = useRouter();
    const { login, loginStudent, loginTenantAdmin } = useAuth();

    // Auto-login: check saved credentials on mount
    useEffect(() => {
        const saved = localStorage.getItem(AUTO_LOGIN_KEY);
        if (saved) {
            try {
                const { id: savedId, pw } = JSON.parse(saved);
                setId(savedId);
                setPassword(pw);
                setAutoLogin(true);
                setRememberMe(true);
                performLogin(savedId, pw, true);
                return;
            } catch {
                localStorage.removeItem(AUTO_LOGIN_KEY);
            }
        }
        // Check for saved ID
        const savedId = localStorage.getItem(SAVED_ID_KEY);
        if (savedId) {
            setId(savedId);
            setRememberMe(true);
        }
        setAutoLoggingIn(false);
    }, []);

    const performLogin = async (loginId: string, pw: string, isAuto = false) => {
        setIsLoading(true);
        try {
            // 1. Super Admin / Core Admin Login (Firebase Auth)
            if (ADMIN_LOGIN_IDS.includes(loginId)) {
                if (!pw && !isAuto) {
                    toast.warning("비밀번호를 입력해주세요.");
                    setIsLoading(false);
                    setAutoLoggingIn(false);
                    return;
                }
                const email = getAdminEmailByLoginId(loginId);
                if (!email) return;
                // Save auto-login credentials for admin too
                if (autoLogin || isAuto) {
                    localStorage.setItem(AUTO_LOGIN_KEY, JSON.stringify({ id: loginId, pw }));
                }
                // Save remembered ID
                if (rememberMe && !autoLogin && !isAuto) {
                    localStorage.setItem(SAVED_ID_KEY, loginId);
                }
                await login(email, pw);
                return;
            }

            // 2. Tenant Admin Login (Firestore tenants collection)
            // Now supports both main adminLoginId AND additional admins[] entries
            const tenant = await dbService.getTenantByLoginId(loginId);
            if (tenant) {
                if (!pw && !isAuto) {
                    toast.warning("비밀번호를 입력해주세요.");
                    setIsLoading(false);
                    setAutoLoggingIn(false);
                    return;
                }
                // Check password against main admin AND additional admins
                const isMainAdmin = tenant.adminLoginId === loginId;
                const matchingExtra = !isMainAdmin && tenant.admins?.find((a: any) => a.loginId === loginId);
                const expectedPassword = isMainAdmin ? tenant.adminPassword : (matchingExtra ? matchingExtra.password : null);

                if (!expectedPassword || pw !== expectedPassword) {
                    if (!isAuto) toast.warning("비밀번호가 올바르지 않습니다.");
                    if (isAuto) localStorage.removeItem(AUTO_LOGIN_KEY);
                    setIsLoading(false);
                    setAutoLoggingIn(false);
                    return;
                }
                if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
                    toast.error("이용이 정지된 계정입니다. 관리자에게 문의하세요.");
                    setIsLoading(false);
                    setAutoLoggingIn(false);
                    return;
                }
                // Save auto-login
                if (autoLogin || isAuto) {
                    localStorage.setItem(AUTO_LOGIN_KEY, JSON.stringify({ id: loginId, pw }));
                }
                // Save remembered ID
                if (rememberMe && !autoLogin && !isAuto) {
                    localStorage.setItem(SAVED_ID_KEY, loginId);
                }
                await loginTenantAdmin(tenant);
                return;
            }

            // 3. Student Login
            const student = await dbService.getStudent(loginId);

            if (student) {
                const dbPassword = student.password || '123456';
                if (pw !== dbPassword) {
                    if (!isAuto) toast.warning("비밀번호가 올바르지 않습니다.");
                    if (isAuto) localStorage.removeItem(AUTO_LOGIN_KEY);
                    setIsLoading(false);
                    setAutoLoggingIn(false);
                    return;
                }

                // Save auto-login credentials
                if (autoLogin || isAuto) {
                    localStorage.setItem(AUTO_LOGIN_KEY, JSON.stringify({ id: loginId, pw }));
                }
                // Save remembered ID
                if (rememberMe && !autoLogin && !isAuto) {
                    localStorage.setItem(SAVED_ID_KEY, loginId);
                }

                await loginStudent(student);
            } else {
                if (!isAuto) toast("존재하지 않는 사용자 ID입니다.");
                if (isAuto) localStorage.removeItem(AUTO_LOGIN_KEY);
            }
        } catch (error: any) {
            console.error(error);
            if (!isAuto) toast.error('로그인 실패: ' + (error.message || '알 수 없는 오류'));
            if (isAuto) localStorage.removeItem(AUTO_LOGIN_KEY);
        } finally {
            setIsLoading(false);
            setAutoLoggingIn(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Handle remember-me ID saving on manual submit
        if (rememberMe) {
            localStorage.setItem(SAVED_ID_KEY, id);
        } else {
            localStorage.removeItem(SAVED_ID_KEY);
        }
        // If auto-login is unchecked, clear saved credentials
        if (!autoLogin) {
            localStorage.removeItem(AUTO_LOGIN_KEY);
        }
        await performLogin(id, password);
    };

    // Show spinner while auto-login is in progress
    if (autoLoggingIn) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p className="text-blue-200/60 text-sm font-medium">자동 로그인 중...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-blue-100 mb-1">아이디</label>
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-blue-200/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                    placeholder="아이디를 입력하세요"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-blue-100 mb-1">비밀번호</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-blue-200/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                    placeholder="비밀번호"
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center">
                    <input
                        id="remember-id"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => {
                            setRememberMe(e.target.checked);
                            if (!e.target.checked) {
                                localStorage.removeItem(SAVED_ID_KEY);
                            }
                        }}
                        className="w-4 h-4 text-blue-600 border-white/30 rounded focus:ring-blue-500 bg-white/20"
                    />
                    <label htmlFor="remember-id" className="ml-2 block text-sm text-blue-100">
                        아이디 기억
                    </label>
                </div>
                <div className="flex items-center">
                    <input
                        id="auto-login"
                        type="checkbox"
                        checked={autoLogin}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            setAutoLogin(checked);
                            if (checked) {
                                // Auto-login implies remembering ID too
                                setRememberMe(true);
                            } else {
                                localStorage.removeItem(AUTO_LOGIN_KEY);
                            }
                        }}
                        className="w-4 h-4 text-blue-600 border-white/30 rounded focus:ring-blue-500 bg-white/20"
                    />
                    <label htmlFor="auto-login" className="ml-2 block text-sm text-blue-100">
                        자동 로그인
                    </label>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0A0E27] text-white font-bold py-4 rounded-xl hover:bg-[#1a1f4b] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    '로그인'
                )}
            </button>
            <p className="text-center text-xs text-blue-200/50 mt-4">
                * 본 학습 시스템은 수강생 전용입니다.
            </p>
        </form>
    );
}
