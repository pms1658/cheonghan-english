"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Trophy, RotateCcw, ArrowLeft } from "lucide-react";

interface QuizResultsProps {
    totalQuestions: number;
    correctCount: number;
    wrongWords: string[];
    mode: "practice" | "perfect";
    onRetry: () => void;
    onBack: () => void;
}

export function QuizResults({
    totalQuestions,
    correctCount,
    wrongWords,
    mode,
    onRetry,
    onBack,
}: QuizResultsProps) {
    const score = Math.round((correctCount / totalQuestions) * 100);
    const isPerfect = score === 100;

    return (
        <div className="space-y-6">
            {/* Score Display */}
            <Card className="bg-gradient-to-br from-navy-800 to-navy-900 border-navy-700">
                <CardContent className="pt-8 pb-8">
                    <div className="text-center">
                        <Trophy
                            className={`h-16 w-16 mx-auto mb-4 ${isPerfect ? "text-yellow-400" : "text-navy-500"
                                }`}
                        />
                        <h2 className="text-4xl font-bold text-white mb-2">{score}점</h2>
                        <p className="text-navy-300">
                            {correctCount} / {totalQuestions} 정답
                        </p>

                        {mode === "perfect" && !isPerfect && (
                            <div className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg">
                                <p className="text-red-300 text-sm">
                                    100점 모드: 한 문제라도 틀리면 종료됩니다
                                </p>
                            </div>
                        )}

                        {isPerfect && (
                            <div className="mt-4 px-4 py-2 bg-yellow-600/20 border border-yellow-500/50 rounded-lg">
                                <p className="text-yellow-300 text-sm font-semibold">
                                    🎉 완벽합니다! 모든 단어를 정확히 외웠습니다!
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Wrong Answers */}
            {wrongWords.length > 0 && (
                <Card className="bg-navy-800 border-navy-700">
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">
                            틀린 단어 ({wrongWords.length}개)
                        </h3>
                        <div className="space-y-2">
                            {wrongWords.map((wordId, idx) => (
                                <div
                                    key={idx}
                                    className="px-4 py-2 bg-navy-900/50 rounded text-navy-300 text-sm"
                                >
                                    단어 ID: {wordId}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-all"
                >
                    <ArrowLeft className="h-5 w-5" />
                    단어 목록으로
                </button>
                <button
                    onClick={onRetry}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-galaxy-600 hover:bg-galaxy-500 text-white rounded-lg transition-all"
                >
                    <RotateCcw className="h-5 w-5" />
                    다시 학습하기
                </button>
            </div>
        </div>
    );
}
