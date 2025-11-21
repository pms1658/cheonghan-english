import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle, Clock, Star } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">반갑습니다, 김학생님!</h2>
                <p className="text-navy-300 mt-2">오늘도 청한영어와 함께 꿈을 향해 나아가세요.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="이번 주 출석"
                    value="100%"
                    icon={CheckCircle}
                    description="개근 중입니다! 훌륭해요."
                />
                <StatsCard
                    title="남은 과제"
                    value="2개"
                    icon={BookOpen}
                    description="오늘 마감인 과제가 있습니다."
                />
                <StatsCard
                    title="최근 단어 시험"
                    value="95점"
                    icon={Star}
                    description="지난주보다 5점 올랐어요!"
                />
                <StatsCard
                    title="학습 시간"
                    value="12시간"
                    icon={Clock}
                    description="이번 주 누적 학습 시간"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardHeader>
                        <CardTitle>최근 공지사항</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            <li className="flex justify-between text-sm">
                                <span className="text-galaxy-300">[필독] 11월 모의고사 일정 안내</span>
                                <span className="text-navy-400">2025.11.20</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-white">겨울방학 특강 신청 안내</span>
                                <span className="text-navy-400">2025.11.18</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardHeader>
                        <CardTitle>오늘의 학습 명언</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <blockquote className="italic text-navy-200">
                            "The only way to do great work is to love what you do."
                        </blockquote>
                        <p className="text-right text-sm text-navy-400 mt-2">- Steve Jobs</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, description }: any) {
    return (
        <Card className="bg-navy-800 border-navy-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-navy-200">{title}</CardTitle>
                <Icon className="h-4 w-4 text-galaxy-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className="text-xs text-navy-400 mt-1">{description}</p>
            </CardContent>
        </Card>
    );
}
