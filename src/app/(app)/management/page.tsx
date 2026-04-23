'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import StudentManagement from '@/components/admin/StudentManagement';
import { dbService } from '@/services/db';

export default function ManagementPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    // Student Password Change State (Declared unconditionally)
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Simple auth check simulation or role redirection could happen here
        if (user) setLoading(false);
    }, [user]);

    const handlePasswordChange = async () => {
        if (!newPassword || !confirmPassword) {
            setMessage('비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 4) {
            setMessage('비밀번호는 4자리 이상이어야 합니다.');
            return;
        }

        try {
            await dbService.updateStudent((user as any).id, { password: newPassword });
            setMessage('비밀번호가 변경되었습니다.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e) {
            console.error(e);
            setMessage('변경 실패. 다시 시도해주세요.');
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;

    // STUDENT VIEW
    if ((user as any)?.role !== 'admin') {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Profile</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none">내 정보 관리</h1>
                </motion.div>

                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl shadow-lg text-white">
                                🎓
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{(user as any)?.name}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                    학생 (Student)
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-white/10">
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">아이디</label>
                                <div className="font-bold text-lg text-slate-700 dark:text-slate-200 font-mono">{(user as any)?.id}</div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-xl font-bold text-[#0A0E27] dark:text-white mb-6 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    비밀번호 변경
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="password"
                                        placeholder="새 비밀번호 (4자리 이상)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium dark:text-white"
                                    />
                                    <input
                                        type="password"
                                        placeholder="새 비밀번호 확인"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/10 transition-all font-medium dark:text-white"
                                    />
                                </div>
                                {message && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`text-sm font-bold mt-4 p-3 rounded-xl text-center ${message.includes('완료') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}
                                    >
                                        {message}
                                    </motion.p>
                                )}

                                <button
                                    onClick={handlePasswordChange}
                                    className="w-full mt-6 py-4 bg-[#0A0E27] text-white text-lg font-bold rounded-2xl hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                                >
                                    비밀번호 변경하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ADMIN VIEW - Use the shared component
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Administration</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none">학원 관리</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-2xl">
                    전체 학생 관리 및 데이터베이스 설정
                </p>
            </motion.div>

            <StudentManagement />
        </div>
    );
}
