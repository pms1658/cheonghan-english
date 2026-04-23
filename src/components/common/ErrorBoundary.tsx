import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary Caught Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="p-10 text-center bg-white rounded-xl shadow-sm border border-slate-200 m-4">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
                    <p className="text-slate-600 mb-6">
                        {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors"
                        >
                            다시 시도하기
                        </button>
                        <button
                            onClick={() => window.location.search = '?mode=overview'}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                        >
                            단어장 바로가기
                        </button>
                    </div>
                    <details className="mt-6 text-left">
                        <summary className="text-xs text-slate-400 cursor-pointer mb-2">상세 에러 내용 보기</summary>
                        <pre className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg overflow-auto max-h-40 border border-slate-100">
                            {this.state.error?.stack}
                        </pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}
