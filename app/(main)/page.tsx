"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllClasses } from "@/lib/vocabulary-data";
import { useRole } from "@/contexts/RoleContext";

export default function HomePage() {
    const router = useRouter();
    const { role } = useRole();

    useEffect(() => {
        const classes = getAllClasses();

        // Redirect to first class if available
        if (classes.length > 0) {
            router.push(`/class/${classes[0].id}`);
        }
    }, [router]);

    const classes = getAllClasses();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="text-center py-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">청한영어 LMS에 오신 것을 환영합니다</h1>
                <p className="text-lg text-gray-600 mb-8">
                    {role === "admin"
                        ? "왼쪽 사이드바에서 클래스를 선택하거나 새로 만드세요."
                        : "왼쪽 사이드바에서 가입된 클래스를 선택하세요."
                    }
                </p>

                {classes.length === 0 && role === "admin" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-lg mx-auto">
                        <p className="text-blue-900">
                            <strong>시작하기:</strong> 왼쪽 상단의 <strong>+</strong> 버튼을 클릭하여 첫 클래스를 만드세요!
                        </p>
                    </div>
                )}

                {classes.length === 0 && role === "student" && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-lg mx-auto">
                        <p className="text-gray-700">
                            아직 가입된 클래스가 없습니다. 관리자에게 문의하세요.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
