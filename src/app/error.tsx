'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
                오류가 발생했습니다.
            </h2>
            <p className="text-slate-600 mb-8 max-w-md bg-slate-100 p-4 rounded text-xs text-left overflow-auto max-h-48">
                {error.message || "알 수 없는 오류가 발생했습니다."}
                {error.digest && <span className="block mt-1 text-slate-400">Code: {error.digest}</span>}
            </p>
            <button
                onClick={reset}
                className="bg-[#0A0E27] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1a1f4b] transition-colors"
            >
                다시 시도하기
            </button>
        </div>
    );
}
