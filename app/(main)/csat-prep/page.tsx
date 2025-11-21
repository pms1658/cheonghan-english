import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";

export default function CSATPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">수능대비</h2>
                <p className="text-navy-300 mt-2">수능 준비를 위한 학습 도구</p>
            </div>

            <div className="grid gap-4">
                <Link href="/csat-prep/vocabulary">
                    <Card className="bg-navy-800 border-navy-700 text-white hover:border-galaxy-500 transition-all cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <BookOpen className="h-6 w-6 text-galaxy-400" />
                                <CardTitle>단어 학습</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300">수능 필수 단어와 고난도 어휘를 학습하세요</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/csat-prep/chunk-reading">
                    <Card className="bg-navy-800 border-navy-700 text-white hover:border-galaxy-500 transition-all cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-galaxy-400" />
                                <CardTitle>끊어읽기</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300">문장 구조를 파악하고 정확한 해석 연습</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="rounded-lg border border-navy-700 bg-navy-800 p-8 text-center">
                <p className="text-navy-300">나머지 기능은 준비 중입니다.</p>
            </div>
        </div>
    );
}
