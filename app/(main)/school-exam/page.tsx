import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function SchoolExamPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">내신대비</h2>
                <p className="text-navy-300 mt-2">학교 시험 준비를 위한 학습 도구</p>
            </div>

            <div className="grid gap-4">
                <Link href="/school-exam/vocabulary">
                    <Card className="bg-navy-800 border-navy-700 text-white hover:border-galaxy-500 transition-all cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <BookOpen className="h-6 w-6 text-galaxy-400" />
                                <CardTitle>단어 학습</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300">교과서 필수 단어와 숙어를 학습하세요</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
