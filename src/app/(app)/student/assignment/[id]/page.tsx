'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStudentAssignment } from '@/hooks/useStudentAssignment';
import DesktopAssignment from '@/components/student/DesktopAssignment';
import MobileAssignment from '@/components/student/MobileAssignment';
import { SkeletonFullPage } from '@/components/common/Skeleton';

export default function StudentAssignmentPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading } = useAuth();
    const assignmentId = params.id as string;

    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Redirect if not student (unless preview mode)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const isPreview = searchParams.get('mode') === 'preview';

        if (isPreview || loading) return;

        if (!user) {
            router.push('/');
            return;
        }

        if ((user as any)?.role === 'admin') {
            // Allow admin to preview but don't redirect
        }
    }, [user, router, loading]);

    const data = useStudentAssignment(assignmentId);

    if (!user && !data.student) {
        return <SkeletonFullPage message="로그인 확인 중..." />;
    }

    if (data.loading && !data.assignment) {
        return <SkeletonFullPage message="과제를 불러오는 중..." />;
    }

    if (!data.assignment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
                <div className="text-center px-4">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">과제를 찾을 수 없습니다</h2>
                    <p className="text-gray-600 mb-6">과제가 삭제되었거나 접근 권한이 없습니다.</p>
                    <button
                        onClick={() => {
                            const classId = new URLSearchParams(window.location.search).get('classId');
                            router.push(classId ? `/class/${classId}` : '/dashboard');
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        과제방으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    // Render component based on screen size
    return isMobile ? (
        <MobileAssignment {...data} />
    ) : (
        <DesktopAssignment {...data} />
    );
}
