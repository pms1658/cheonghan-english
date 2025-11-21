"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default function StudentAssignmentsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">과제 업로드</h2>
                <p className="text-navy-300 mt-2">과제를 제출하세요</p>
            </div>

            <Card className="bg-navy-800 border-navy-700 text-white">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Upload className="h-16 w-16 text-navy-600 mb-4" />
                    <p className="text-navy-400">과제 업로드 기능은 구현 중입니다</p>
                </CardContent>
            </Card>
        </div>
    );
}
