'use client';

import LoginForm from '@/components/auth/LoginForm';

export default function LoginCard() {
    return (
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2rem] p-8 w-full max-w-md relative overflow-hidden group hover:bg-white/15 transition-all duration-500">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-blue-700"></div>

            <div className="mb-6 text-center pt-2">
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-md">Welcome Back</h2>
                <p className="text-blue-100/80 text-sm font-medium tracking-wide">청한영어 학습 시스템에 접속하세요</p>
            </div>

            <LoginForm />

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-blue-200/60 font-medium">
                    로그인 문제가 발생하면 선생님께 문의해주세요.
                </p>
            </div>
        </div>
    );
}
