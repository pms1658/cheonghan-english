'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/utils/chunkError';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const chunkError = isChunkLoadError(error);

    useEffect(() => {
        if (chunkError) reloadOnceForChunkError();
    }, [chunkError]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        {chunkError ? '새 버전이 배포되었습니다.' : '치명적인 오류가 발생했습니다.'}
                    </h2>
                    <p className="text-slate-600 mb-8">
                        {chunkError ? '페이지를 새로고침하면 최신 버전으로 열립니다.' : error.message}
                    </p>
                    <button
                        onClick={() => (chunkError ? window.location.reload() : reset())}
                        className="bg-[#0A0E27] text-white px-6 py-3 rounded-xl font-bold"
                    >
                        {chunkError ? '새로고침' : '다시 시도하기'}
                    </button>
                </div>
            </body>
        </html>
    );
}
