'use client';

import { useEffect, useState } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/utils/chunkError';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const chunkError = isChunkLoadError(error);
    const [reloading, setReloading] = useState(chunkError);

    useEffect(() => {
        console.error(error);
        // 새 버전 배포 후 예전 파일을 찾는 오류 → 자동으로 한 번 새로고침
        if (chunkError && !reloadOnceForChunkError()) setReloading(false);
    }, [error, chunkError]);

    if (chunkError && reloading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#0A0E27] rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">새 버전으로 업데이트하는 중입니다…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
                {chunkError ? '새 버전이 배포되었습니다.' : '오류가 발생했습니다.'}
            </h2>
            {chunkError ? (
                <p className="text-slate-600 mb-8 max-w-md text-sm">페이지를 새로고침하면 최신 버전으로 열립니다.</p>
            ) : (
                <p className="text-slate-600 mb-8 max-w-md bg-slate-100 p-4 rounded text-xs text-left overflow-auto max-h-48">
                    {error.message || "알 수 없는 오류가 발생했습니다."}
                    {error.digest && <span className="block mt-1 text-slate-400">Code: {error.digest}</span>}
                </p>
            )}
            <button
                onClick={() => (chunkError ? window.location.reload() : reset())}
                className="bg-[#0A0E27] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1a1f4b] transition-colors"
            >
                {chunkError ? '새로고침' : '다시 시도하기'}
            </button>
        </div>
    );
}
