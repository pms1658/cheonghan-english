'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { dbService } from '@/services/db';
import { Tenant, PLAN_DEFAULTS, SubscriptionPlan, TenantStatus } from '@/lib/tenantConfig';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';

import { motion } from 'framer-motion';

interface AdminEntry { loginId: string; password: string; }

export default function SuperAdminPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formOwnerEmail, setFormOwnerEmail] = useState('');
    const [formOwnerName, setFormOwnerName] = useState('');
    const [formAdmins, setFormAdmins] = useState<AdminEntry[]>([{ loginId: '', password: '' }]);
    const [formPlan, setFormPlan] = useState<SubscriptionPlan>('basic');
    const [formMaxStudents, setFormMaxStudents] = useState(50);
    const [formMonthlyFee, setFormMonthlyFee] = useState<string>('');

    // Auth check
    useEffect(() => {
        if (user && !(user as any)?.isSuperAdmin) {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Load tenants
    useEffect(() => {
        const load = async () => {
            try {
                const data = await dbService.getTenants();
                setTenants(data);
            } catch (e) {
                console.error('Failed to load tenants:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const resetForm = () => {
        setFormName('');
        setFormSlug('');
        setFormOwnerEmail('');
        setFormOwnerName('');
        setFormAdmins([{ loginId: '', password: '' }]);
        setFormPlan('basic');
        setFormMaxStudents(50);
        setFormMonthlyFee('');
        setEditingTenant(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setFormName(tenant.name);
        setFormSlug(tenant.slug);
        setFormOwnerEmail(tenant.ownerEmail);
        setFormOwnerName(tenant.ownerName || '');
        // Build admins list from tenant data
        const admins: AdminEntry[] = [{ loginId: tenant.adminLoginId, password: tenant.adminPassword }];
        if (tenant.admins && tenant.admins.length > 0) {
            tenant.admins.forEach(a => admins.push({ loginId: a.loginId, password: a.password }));
        }
        setFormAdmins(admins);
        setFormPlan(tenant.subscription?.plan || 'basic');
        setFormMaxStudents(tenant.maxStudents);
        setFormMonthlyFee(tenant.monthlyFee ? String(tenant.monthlyFee) : '');
        setShowModal(true);
    };

    const handleSave = async () => {
        const mainAdmin = formAdmins[0];
        if (!formName || !formSlug || !formOwnerEmail || !mainAdmin?.loginId || !mainAdmin?.password) {
            toast.warning('학원명, 슬러그, 원장 이메일, 메인 관리자 ID/PW는 필수입니다.');
            return;
        }

        const extraAdmins = formAdmins.slice(1).filter(a => a.loginId && a.password);
        const monthlyFee = formMonthlyFee ? Number(formMonthlyFee) : undefined;

        if (editingTenant) {
            // UPDATE
            try {
                const updates: Partial<Tenant> & Record<string, any> = {
                    name: formName,
                    slug: formSlug,
                    ownerEmail: formOwnerEmail,
                    ownerName: formOwnerName || undefined,
                    adminLoginId: mainAdmin.loginId,
                    adminPassword: mainAdmin.password,
                    admins: extraAdmins.length > 0 ? extraAdmins : undefined,
                    maxStudents: formMaxStudents,
                    monthlyFee,
                    subscription: {
                        ...editingTenant.subscription,
                        plan: formPlan,
                    },
                    settings: {
                        ...editingTenant.settings,
                        instituteName: formName,
                    },
                };
                await dbService.updateTenant(editingTenant.id, updates);
                setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, ...updates } as Tenant : t));
                toast.success('학원 정보가 수정되었습니다.');
                setShowModal(false);
                resetForm();
            } catch (e) {
                console.error('Failed to update tenant:', e);
                toast.error('학원 수정 실패');
            }
        } else {
            // ADD
            const newTenant: Omit<Tenant, 'id'> = {
                name: formName,
                slug: formSlug,
                ownerEmail: formOwnerEmail,
                ownerName: formOwnerName || undefined,
                adminLoginId: mainAdmin.loginId,
                adminPassword: mainAdmin.password,
                admins: extraAdmins.length > 0 ? extraAdmins : undefined,
                status: 'trial',
                maxStudents: formMaxStudents,
                monthlyFee,
                createdAt: Date.now(),
                settings: {
                    instituteName: formName,
                    primaryColor: '#083973'
                },
                subscription: {
                    plan: formPlan,
                    startDate: Date.now(),
                    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
                    autoRenew: false,
                    options: {
                        highSchoolContent: formPlan === 'standard' || formPlan === 'premium',
                        elementaryContent: formPlan === 'premium',
                    }
                }
            };

            try {
                const added = await dbService.addTenant(newTenant);
                setTenants(prev => [...prev, added]);
                toast.success('학원이 추가되었습니다.');
                setShowModal(false);
                resetForm();
            } catch (e) {
                console.error('Failed to add tenant:', e);
                toast.error('학원 추가 실패');
            }
        }
    };

    const handleUpdateStatus = async (tenant: Tenant, newStatus: TenantStatus) => {
        try {
            await dbService.updateTenant(tenant.id, { status: newStatus });
            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t));
        } catch (e) {
            console.error('Failed to update tenant status:', e);
        }
    };

    const handleDeleteTenant = async (tenant: Tenant) => {
        if (!confirm(`정말 "${tenant.name}" 학원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            await dbService.deleteTenant(tenant.id);
            setTenants(prev => prev.filter(t => t.id !== tenant.id));
        } catch (e) {
            console.error('Failed to delete tenant:', e);
        }
    };

    // Admin row management
    const addAdminRow = () => setFormAdmins(prev => [...prev, { loginId: '', password: '' }]);
    const removeAdminRow = (idx: number) => {
        if (idx === 0) return; // Can't remove main admin
        setFormAdmins(prev => prev.filter((_, i) => i !== idx));
    };
    const updateAdmin = (idx: number, field: keyof AdminEntry, value: string) => {
        setFormAdmins(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
    };

    const getStatusBadge = (status: TenantStatus) => {
        const styles: Record<TenantStatus, string> = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
        };
        const labels: Record<TenantStatus, string> = {
            active: '활성', trial: '체험', suspended: '정지', cancelled: '해지'
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
    };

    const getPlanBadge = (plan: SubscriptionPlan) => {
        const styles: Record<SubscriptionPlan, string> = {
            free: 'bg-slate-100 text-slate-600',
            basic: 'bg-blue-100 text-blue-700',
            standard: 'bg-purple-100 text-purple-700',
            premium: 'bg-amber-100 text-amber-700',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[plan]}`}>{PLAN_DEFAULTS[plan].label}</span>;
    };

    // Calculate estimated monthly revenue
    const estimatedRevenue = tenants
        .filter(t => t.status === 'active' || t.status === 'trial')
        .reduce((acc, t) => {
            const fee = t.monthlyFee ?? PLAN_DEFAULTS[t.subscription?.plan || 'basic'].priceNum;
            return acc + fee;
        }, 0);

    if (!user || !(user as any)?.isSuperAdmin) return null;
    // if (loading) return <LoadingSpinner variant="skeleton" />;

    const activeTenants = tenants.filter(t => t.status === 'active' || t.status === 'trial').length;
    const totalStudents = tenants.reduce((acc, t) => acc + (t.currentStudentCount || 0), 0);

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-full">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Super Admin</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#0A0E27] dark:text-white tracking-tight leading-none flex items-center gap-3">
                            슈퍼 관리자
                        </h1>
                        <p className="mt-3 text-lg font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            전체 학원 관리 대시보드
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            ← 대시보드
                        </button>
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            + 학원 추가
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 학원</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{tenants.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">활성 학원</p>
                        <p className="text-3xl font-black text-emerald-600 mt-1">{activeTenants}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 학생</p>
                        <p className="text-3xl font-black text-blue-600 mt-1">{totalStudents}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">예상 월 매출</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">
                            ₩{estimatedRevenue.toLocaleString()}만
                        </p>
                    </div>
                </div>

                {/* Tenant List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">학원 목록</h2>
                    </div>

                    {loading ? (
                        <div className="p-6">
                            <LoadingSpinner variant="skeleton" />
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-5xl mb-3">🏫</p>
                            <p className="text-slate-500 font-semibold">등록된 학원이 없습니다</p>
                            <p className="text-sm text-slate-400 mt-1">&apos;학원 추가&apos; 버튼으로 첫 학원을 등록하세요</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {tenants.map(tenant => (
                                <div key={tenant.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{tenant.name}</h3>
                                            {getStatusBadge(tenant.status)}
                                            {getPlanBadge(tenant.subscription?.plan || 'free')}
                                            {tenant.monthlyFee && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                                    ₩{tenant.monthlyFee}만
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                            <span>🔗 {tenant.slug}</span>
                                            <span>👤 {tenant.ownerName || tenant.ownerEmail}</span>
                                            <span>🔑 ID: {tenant.adminLoginId || '-'}</span>
                                            <span className="cursor-pointer hover:text-slate-600" onClick={() => setShowPasswordFor(showPasswordFor === tenant.id ? null : tenant.id)}>
                                                🔒 PW: {showPasswordFor === tenant.id ? (tenant.adminPassword || '-') : '••••'}
                                            </span>
                                            {tenant.admins && tenant.admins.length > 0 && (
                                                <span className="text-indigo-500 font-bold">+{tenant.admins.length}명 관리자</span>
                                            )}
                                            <span>👥 {tenant.currentStudentCount || 0}/{tenant.maxStudents}명</span>
                                            <span>📅 {new Date(tenant.createdAt).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {tenant.status === 'trial' && (
                                            <button
                                                onClick={() => handleUpdateStatus(tenant, 'active')}
                                                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                승인
                                            </button>
                                        )}
                                        {tenant.status === 'active' && (
                                            <button
                                                onClick={() => handleUpdateStatus(tenant, 'suspended')}
                                                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                정지
                                            </button>
                                        )}
                                        {tenant.status === 'suspended' && (
                                            <button
                                                onClick={() => handleUpdateStatus(tenant, 'active')}
                                                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                재활성
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(tenant)}
                                            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTenant(tenant)}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            {/* Add/Edit Tenant Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingTenant ? '✏️ 학원 수정' : '🏫 새 학원 추가'}
                            </h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* 학원 기본 정보 */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">학원명 *</label>
                                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ABC영어학원" className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">슬러그 (URL용) *</label>
                                <div className="flex items-center gap-2">
                                    <input value={formSlug} onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))} placeholder="abc-english" className={`flex-1 ${inputClass}`} />
                                    <span className="text-xs text-slate-400 whitespace-nowrap">.cheonghan.com</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">원장 이메일 *</label>
                                    <input value={formOwnerEmail} onChange={e => setFormOwnerEmail(e.target.value)} placeholder="owner@example.com" className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">원장 이름</label>
                                    <input value={formOwnerName} onChange={e => setFormOwnerName(e.target.value)} placeholder="홍길동" className={inputClass} />
                                </div>
                            </div>

                            {/* 관리자 목록 */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <label className="text-xs font-bold text-slate-500 mb-3 block">👤 관리자 계정</label>
                                <div className="space-y-2">
                                    {formAdmins.map((admin, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="flex-shrink-0 w-6 text-center">
                                                {idx === 0 ? (
                                                    <span className="text-[10px] font-black text-amber-500">MAIN</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                                )}
                                            </div>
                                            <input
                                                value={admin.loginId}
                                                onChange={e => updateAdmin(idx, 'loginId', e.target.value)}
                                                placeholder="로그인 ID"
                                                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <input
                                                value={admin.password}
                                                onChange={e => updateAdmin(idx, 'password', e.target.value)}
                                                placeholder="비밀번호"
                                                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            {idx > 0 && (
                                                <button
                                                    onClick={() => removeAdminRow(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                    title="관리자 삭제"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                            {idx === 0 && <div className="w-7 flex-shrink-0"></div>}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addAdminRow}
                                    className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                                >
                                    + 관리자 추가
                                </button>
                            </div>

                            {/* 구독 플랜 + 금액 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">구독 플랜</label>
                                    <select
                                        value={formPlan}
                                        onChange={e => {
                                            const plan = e.target.value as SubscriptionPlan;
                                            setFormPlan(plan);
                                            setFormMaxStudents(PLAN_DEFAULTS[plan].maxStudents);
                                            if (!formMonthlyFee) {
                                                setFormMonthlyFee(String(PLAN_DEFAULTS[plan].priceNum));
                                            }
                                        }}
                                        className={inputClass}
                                    >
                                        {Object.entries(PLAN_DEFAULTS).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">월 구독료 (만원)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formMonthlyFee}
                                            onChange={e => setFormMonthlyFee(e.target.value)}
                                            placeholder={String(PLAN_DEFAULTS[formPlan].priceNum)}
                                            className={inputClass}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">만원</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">최대 학생 수</label>
                                    <input
                                        type="number"
                                        value={formMaxStudents}
                                        onChange={e => setFormMaxStudents(Number(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                {editingTenant ? '수정 완료' : '학원 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
