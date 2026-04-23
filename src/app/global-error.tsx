'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        치명적인 오류가 발생했습니다.
                    </h2>
                    <p className="text-slate-600 mb-8">
                        {error.message}
                    </p>
                    <button
                        onClick={() => reset()}
                        className="bg-[#0A0E27] text-white px-6 py-3 rounded-xl font-bold"
                    >
                        다시 시도하기
                    </button>
                </div>
            </body>
        </html>
    );
}
