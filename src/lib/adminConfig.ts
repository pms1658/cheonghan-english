/**
 * Admin Configuration
 * 관리자 계정 정보를 한 곳에서 관리합니다.
 * 하드코딩된 이메일 대신 이 파일을 참조하세요.
 */

import { isSuperAdmin as checkSuperAdmin } from '@/lib/tenantConfig';

export interface AdminUser {
    email: string;
    loginId: string;
    displayName: string;
    displayNameEn: string;
    tenantId: string;
    isSuperAdmin: boolean;
}

export const ADMIN_USERS: AdminUser[] = [
    {
        email: 'pms1658@cheonghan.com',
        loginId: 'pms1658',
        displayName: '박민식원장님!',
        displayNameEn: 'Administrator',
        tenantId: 'cheonghan',
        isSuperAdmin: true,
    },
    {
        email: 'jhson88@cheonghan.com',
        loginId: 'jhson88',
        displayName: '손주향실장님!',
        displayNameEn: 'Manager',
        tenantId: 'cheonghan',
        isSuperAdmin: false,
    },
];

/** 로그인 ID로 관리자 이메일 찾기 */
export function getAdminEmailByLoginId(loginId: string): string | null {
    const admin = ADMIN_USERS.find(a => a.loginId === loginId);
    return admin?.email || null;
}

/** 이메일로 관리자 정보 찾기 */
export function getAdminByEmail(email: string): AdminUser | undefined {
    return ADMIN_USERS.find(a => a.email === email);
}

/** 이메일로 관리자 표시명 찾기 */
export function getAdminDisplayName(email: string): string {
    const admin = ADMIN_USERS.find(a => a.email === email);
    return admin?.displayName || '관리자님!';
}

/** 이메일로 관리자 영문 표시명 찾기 */
export function getAdminDisplayNameEn(email: string): string {
    const admin = ADMIN_USERS.find(a => a.email === email);
    return admin?.displayNameEn || 'Administrator';
}

/** 관리자 로그인 ID 목록 */
export const ADMIN_LOGIN_IDS = ADMIN_USERS.map(a => a.loginId);

/** 이메일이 슈퍼 관리자인지 확인 */
export { checkSuperAdmin as isSuperAdmin };

