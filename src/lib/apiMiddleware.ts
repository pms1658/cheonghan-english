import { NextResponse } from 'next/server';

/**
 * API 보안 미들웨어
 * 
 * 모든 API 라우트에서 공통으로 사용하는 보안 검사 유틸리티입니다.
 * - Origin/Referer 검증 (외부 도메인의 무단 API 호출 차단)
 * - Request body 크기 제한
 * - 에러 응답 표준화 (내부 정보 노출 차단)
 */

// ═══════════════════════════════════════
// 허용된 Origin 목록
// ═══════════════════════════════════════
const ALLOWED_ORIGINS = [
    'https://cheonghan.com',
    'https://www.cheonghan.com',
    'https://cheonghan-english.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
];

// 프로덕션이 아닌 환경에서는 Origin 검사를 느슨하게 적용
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════
// Origin 검증
// ═══════════════════════════════════════

/**
 * 요청의 Origin 또는 Referer가 허용된 도메인인지 확인합니다.
 * 프로덕션 환경에서만 강제 적용되며, 개발 환경에서는 경고만 출력합니다.
 * 
 * @returns null이면 통과, NextResponse이면 차단
 */
export function validateOrigin(req: Request): NextResponse | null {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');

    // Origin 또는 Referer에서 도메인 추출
    const requestOrigin = origin || (referer ? new URL(referer).origin : null);

    if (!requestOrigin) {
        // Origin이 없는 경우 (서버 간 호출, Postman 등)
        if (IS_PRODUCTION) {
            console.warn('[API Security] Request with no Origin/Referer blocked');
            return NextResponse.json(
                { error: 'Unauthorized request' },
                { status: 403 }
            );
        }
        return null; // 개발 환경에서는 허용
    }

    // 허용 목록 체크 + Vercel Preview URL 패턴 허용
    const isAllowed = ALLOWED_ORIGINS.includes(requestOrigin)
        || requestOrigin.endsWith('.vercel.app')
        || !IS_PRODUCTION;

    if (!isAllowed) {
        // Same-origin 요청인지 확인 (배포된 도메인에서 자기 API 호출)
        const host = req.headers.get('host');
        const isSameOrigin = host && requestOrigin.includes(host);
        
        if (isSameOrigin) {
            return null; // Same-origin은 항상 허용
        }

        console.warn(`[API Security] Blocked request from unauthorized origin: ${requestOrigin}`);
        return NextResponse.json(
            { error: 'Unauthorized origin' },
            { status: 403 }
        );
    }

    return null; // 통과
}

// ═══════════════════════════════════════
// Body 크기 제한
// ═══════════════════════════════════════

/** 최대 body 크기 (기본 1MB) */
const DEFAULT_MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB
/** PDF 업로드 등 대용량은 10MB */
export const LARGE_BODY_LIMIT = 10 * 1024 * 1024; // 10MB

/**
 * Content-Length를 기반으로 요청 크기를 제한합니다.
 * 
 * @returns null이면 통과, NextResponse이면 차단
 */
export function validateBodySize(req: Request, maxSize: number = DEFAULT_MAX_BODY_SIZE): NextResponse | null {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
        console.warn(`[API Security] Request body too large: ${contentLength} bytes (max: ${maxSize})`);
        return NextResponse.json(
            { error: 'Request body too large' },
            { status: 413 }
        );
    }
    return null;
}

// ═══════════════════════════════════════
// 에러 응답 표준화
// ═══════════════════════════════════════

/**
 * 에러 응답을 생성합니다.
 * 프로덕션 환경에서는 내부 에러 상세 정보(stack trace 등)를 숨깁니다.
 */
export function createErrorResponse(
    error: unknown,
    publicMessage: string = 'Internal server error',
    status: number = 500
): NextResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 서버 로그에는 상세 정보 기록
    console.error(`[API Error] ${publicMessage}:`, errorMessage);
    if (errorStack) {
        console.error('[API Error] Stack:', errorStack);
    }

    // 클라이언트 응답에는 프로덕션에서 상세 정보 숨김
    const responseBody: Record<string, string> = {
        error: publicMessage,
    };

    if (!IS_PRODUCTION) {
        // 개발 환경에서는 디버깅을 위해 상세 정보 포함
        responseBody.details = errorMessage;
    }

    return NextResponse.json(responseBody, { status });
}

// ═══════════════════════════════════════
// Rate Limiter (인메모리)
// ═══════════════════════════════════════

/** 기본 제한: 분당 60회 */
const DEFAULT_RATE_LIMIT = 60;
/** AI 생성 API용: 분당 10회 */
export const AI_RATE_LIMIT = 10;

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 5분마다 만료된 항목 정리
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetAt < now) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

/**
 * IP 기반 속도 제한 (프로덕션 전용)
 * 
 * @returns null이면 통과, NextResponse이면 차단
 */
export function rateLimit(req: Request, maxRequests: number = DEFAULT_RATE_LIMIT): NextResponse | null {
    if (!IS_PRODUCTION) return null; // 개발 환경에서는 비활성

    // IP 추출 (Vercel, Cloudflare 등 프록시 헤더 지원)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';

    const now = Date.now();
    const windowMs = 60 * 1000; // 1분 윈도우
    const key = ip;

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        // 새 윈도우 시작
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return null;
    }

    entry.count++;

    if (entry.count > maxRequests) {
        console.warn(`[Rate Limit] IP ${ip} exceeded ${maxRequests} req/min`);
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    return null;
}

// ═══════════════════════════════════════
// 통합 미들웨어 (한 줄로 호출)
// ═══════════════════════════════════════

export interface ApiGuardOptions {
    /** Body 크기 제한 (바이트). 기본값: 1MB */
    maxBodySize?: number;
    /** Origin 검증 스킵 여부. 기본값: false */
    skipOriginCheck?: boolean;
    /** Rate limit (분당 요청 수). 기본값: 60 */
    rateLimit?: number;
    /** Firebase Auth 토큰 검증 여부. 기본값: false */
    requireAuth?: boolean;
}

/**
 * API 라우트에서 호출하는 통합 보안 검사 (sync 버전).
 * Firebase Auth 검증이 필요 없는 라우트에서 사용합니다.
 * 
 * @returns null이면 통과, NextResponse이면 차단 응답을 반환해야 함
 */
export function apiGuard(req: Request, options?: ApiGuardOptions): NextResponse | null {
    // 1. Origin 검증
    if (!options?.skipOriginCheck) {
        const originBlock = validateOrigin(req);
        if (originBlock) return originBlock;
    }

    // 2. Body 크기 제한
    const bodyBlock = validateBodySize(req, options?.maxBodySize);
    if (bodyBlock) return bodyBlock;

    // 3. Rate Limiting
    const rateLimitBlock = rateLimit(req, options?.rateLimit);
    if (rateLimitBlock) return rateLimitBlock;

    return null; // 모든 검사 통과
}

/**
 * API 라우트에서 호출하는 통합 보안 검사 (async 버전).
 * Firebase Auth 토큰 검증을 포함합니다.
 * 
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *     const blocked = await apiGuardAsync(req, { requireAuth: true });
 *     if (blocked) return blocked;
 *     // ... 기존 로직
 * }
 * ```
 */
export async function apiGuardAsync(req: Request, options?: ApiGuardOptions): Promise<NextResponse | null> {
    // 1-3. Sync checks
    const syncBlock = apiGuard(req, options);
    if (syncBlock) return syncBlock;

    // 4. Firebase Auth Token Verification (production only)
    if (options?.requireAuth) {
        const authHeader = req.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (IS_PRODUCTION) {
                console.warn('[API Auth] Missing auth token');
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }
            // Dev: warn only
            console.warn('[API Auth] Missing auth token (dev mode — allowing)');
            return null;
        }

        try {
            const { verifyAuthToken } = await import('@/lib/apiAuth');
            const decoded = await verifyAuthToken(req);
            if (!decoded && IS_PRODUCTION) {
                return NextResponse.json(
                    { error: 'Invalid authentication token' },
                    { status: 401 }
                );
            }
        } catch (e) {
            console.warn('[API Auth] Token verification failed:', e);
            if (IS_PRODUCTION) {
                return NextResponse.json(
                    { error: 'Authentication failed' },
                    { status: 401 }
                );
            }
        }
    }

    return null;
}

// ═══════════════════════════════════════
// Blocking 입력 검증 (Zod)
// ═══════════════════════════════════════

import type { ZodSchema, ZodError } from 'zod';

/**
 * 요청 body를 Zod 스키마로 검증합니다 (blocking).
 * 
 * 검증 실패 시 에러를 throw합니다.
 * 각 API 라우트의 try-catch에서 createErrorResponse로 처리됩니다.
 * 
 * @param schema - Zod 스키마
 * @param data - 검증할 데이터 (req.json() 결과)
 * @param routeName - 로그에 표시할 API 라우트 이름
 * @throws Error if validation fails
 * 
 * @example
 * ```ts
 * const body = await req.json();
 * validateRequest(gradeRequestSchema, body, 'grade');
 * // 여기에 도달하면 body는 스키마에 맞음이 보장됨
 * ```
 */
export function validateRequest<T>(
    schema: ZodSchema<T>,
    data: unknown,
    routeName: string
): void {
    try {
        schema.parse(data);
    } catch (err) {
        const zodError = err as ZodError;
        const issues = zodError.issues?.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
        ).join(', ') || 'Unknown validation error';

        const errorMsg = `[${routeName}] Invalid request: ${issues}`;
        console.warn(`[Schema Block] ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

