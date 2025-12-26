"use client";

import { Settings } from "lucide-react";

interface LearningPolicyProps {
    classId: string;
}

export function LearningPolicy({ classId }: LearningPolicyProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">학습 정책 설정</h3>
            <p className="text-gray-500 mb-1">이 기능은 곧 추가됩니다.</p>
            <p className="text-sm text-gray-400">
                클래스별 학습 정책을 일괄 설정할 수 있습니다.
            </p>
        </div>
    );
}
