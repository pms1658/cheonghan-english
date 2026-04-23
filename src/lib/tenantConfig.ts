/**
 * Tenant Configuration
 * 멀티테넌시 관련 타입 및 설정
 */

/** 기본 테넌트 ID (청한영어) */
export const DEFAULT_TENANT_ID = 'cheonghan';

/** 슈퍼 관리자 이메일 목록 */
export const SUPER_ADMIN_EMAILS = ['pms1658@cheonghan.com'];

/** 구독 플랜 */
export type SubscriptionPlan = 'free' | 'basic' | 'standard' | 'premium';

/** 테넌트 상태 */
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

/** 테넌트 설정 */
export interface TenantSettings {
    logoUrl?: string;
    primaryColor?: string;
    instituteName?: string;
}

/** 구독 정보 */
export interface TenantSubscription {
    plan: SubscriptionPlan;
    startDate: number;
    endDate: number;
    autoRenew: boolean;
    options?: {
        highSchoolContent?: boolean;   // 고등부 교재 (+20만)
        elementaryContent?: boolean;   // 초중등부 커리 (+50만)
    };
}

/** 테넌트 (학원) */
export interface Tenant {
    id: string;          // Firestore doc ID
    name: string;        // 학원 이름
    slug: string;        // URL용 슬러그 (abc-english)
    ownerEmail: string;  // 원장 이메일
    ownerName?: string;  // 원장 이름
    // 관리자 인증 정보 (메인)
    adminLoginId: string;   // 원장 로그인 ID
    adminPassword: string;  // 원장 비밀번호
    // 추가 관리자 목록
    admins?: { loginId: string; password: string }[];
    status: TenantStatus;
    maxStudents: number;
    currentStudentCount?: number;
    monthlyFee?: number;  // 커스텀 월 구독료 (만원 단위)
    createdAt: number;
    settings: TenantSettings;
    subscription: TenantSubscription;
    // 통계 (캐시용)
    stats?: {
        totalAssignments?: number;
        totalSubmissions?: number;
        lastActivity?: number;
    };
}

/** 플랜별 기본 설정 */
export const PLAN_DEFAULTS: Record<SubscriptionPlan, { maxStudents: number; label: string; price: string; priceNum: number }> = {
    free: { maxStudents: 10, label: '무료 체험', price: '₩0', priceNum: 0 },
    basic: { maxStudents: 50, label: '기본', price: '₩100만/월', priceNum: 100 },
    standard: { maxStudents: 100, label: '스탠다드', price: '₩120만/월', priceNum: 120 },
    premium: { maxStudents: 200, label: '프리미엄', price: '₩170만/월', priceNum: 170 },
};

/** 이메일이 슈퍼 관리자인지 확인 */
export function isSuperAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email);
}
