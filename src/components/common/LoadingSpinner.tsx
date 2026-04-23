'use client';

import React from 'react';
import { SkeletonAssignmentList, SkeletonFullPage } from './Skeleton';

interface LoadingSpinnerProps {
    fullScreen?: boolean;
    message?: string;
    variant?: 'spinner' | 'skeleton';
}

export default function LoadingSpinner({ fullScreen = false, message = '로딩 중...', variant = 'skeleton' }: LoadingSpinnerProps) {
    // All variants now render skeleton-based loading
    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                <SkeletonFullPage message={message} />
            </div>
        );
    }

    // Skeleton variant: show card placeholders
    if (variant === 'skeleton') {
        return (
            <div className="p-4">
                <SkeletonAssignmentList />
            </div>
        );
    }

    // Fallback: also skeleton
    return (
        <div className="p-4">
            <SkeletonFullPage message={message} />
        </div>
    );
}

