"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { gradeTranslation } from "@/app/actions/gemini";
import { Card, CardContent } from "@/components/ui/card";
import { WordGroup } from "@/types/chunk-reading";

interface TranslationPanelProps {
    sentence: string;
    groups: WordGroup[];
    sentenceIndex: number;
    onScoreUpdate: (type: 'chunkReading' | 'translation', score: number) => void;
    currentScore?: {
        chunkReading: number | null;
        translation: number | null;
    };
    chunkPassed: boolean;
    translationPassed: boolean;
}

export function TranslationPanel({
    sentence,
    groups,
    sentenceIndex,
    onScoreUpdate,
    currentScore,
    chunkPassed,
    translationPassed
}: TranslationPanelProps) {
    const [studentTranslation, setStudentTranslation] = useState("");
    const [isGrading, setIsGrading] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!studentTranslation.trim()) {
            alert("해석을 입력해주세요");
            return;
        }

        if (groups.length === 0) {
            alert("먼저 끊어읽기 표시를 해주세요");
            return;
        }

        setIsGrading(true);
        setHasSubmitted(true);

        try {
            // Grade both chunk reading and translation simultaneously

            // 1. Grade chunk reading (marking)
            const markingDescription = groups.map(g => {
                const words = sentence.split(/\s+/);
                const groupWords = g.wordIndices.map(i => words[i]).join(" ");
                return `[${g.type}] ${groupWords}`;
            }).join(", ");

            // Mock grading for chunk reading (replace with actual Gemini call later)
            const mockChunkScore = 75 + Math.floor(Math.random() * 25); // 75-100

            // 2. Grade translation
            const translationResult = await gradeTranslation(sentence, studentTranslation);
            const translationScore = translationResult?.score || 0;

            // Update scores
            onScoreUpdate('chunkReading', mockChunkScore);
            onScoreUpdate('translation', translationScore);

        } catch (error) {
            console.error("Grading error:", error);
            alert("채점 중 오류가 발생했습니다");
        } finally {
            setIsGrading(false);
        }
    };

    const bothPassed = chunkPassed && translationPassed;
    const bothScored = currentScore?.chunkReading !== null && currentScore?.translation !== null;

    return (
        <div className="space-y-4">
            {/* Translation Input */}
            <div>
                <label className="text-sm font-semibold text-white block mb-2">해석 입력</label>
                <textarea
                    value={studentTranslation}
                    onChange={(e) => setStudentTranslation(e.target.value)}
                    placeholder="문장을 한국어로 해석해보세요..."
                    rows={3}
                    disabled={bothPassed}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500 disabled:opacity-50"
                />
            </div>

            {/* Submit Button */}
            {!bothPassed && (
                <button
                    onClick={handleSubmit}
                    disabled={isGrading || !studentTranslation.trim() || groups.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-galaxy-600 to-purple-600 hover:from-galaxy-500 hover:to-purple-500 disabled:from-navy-700 disabled:to-navy-700 disabled:text-navy-500 text-white font-semibold rounded-lg transition-all shadow-lg"
                >
                    {isGrading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            채점 중...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-5 w-5" />
                            제출하기
                        </>
                    )}
                </button>
            )}

            {/* Score Display */}
            {bothScored && (
                <Card className={`border-2 ${bothPassed ? 'bg-green-900/20 border-green-600' : 'bg-orange-900/20 border-orange-600'}`}>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {bothPassed ? (
                                    <CheckCircle className="h-6 w-6 text-green-400" />
                                ) : (
                                    <XCircle className="h-6 w-6 text-orange-400" />
                                )}
                                <h3 className="font-bold text-white text-lg">
                                    {bothPassed ? "통과!" : "재시도 필요"}
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-navy-950/50 rounded-lg p-3">
                                <p className="text-xs text-navy-300 mb-1">끊어읽기</p>
                                <p className={`text-2xl font-bold ${chunkPassed ? 'text-green-400' : 'text-orange-400'}`}>
                                    {currentScore?.chunkReading}점
                                </p>
                            </div>
                            <div className="bg-navy-950/50 rounded-lg p-3">
                                <p className="text-xs text-navy-300 mb-1">해석</p>
                                <p className={`text-2xl font-bold ${translationPassed ? 'text-green-400' : 'text-orange-400'}`}>
                                    {currentScore?.translation}점
                                </p>
                            </div>
                        </div>

                        {bothPassed ? (
                            <p className="text-sm text-green-300 text-center">
                                ✨ 잘했습니다! 잠시 후 다음 문장으로 넘어갑니다.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-orange-300 text-center">
                                    80점 이상을 받아야 다음으로 진행할 수 있습니다.
                                </p>
                                {!chunkPassed && (
                                    <p className="text-xs text-orange-200">
                                        💡 끊어읽기를 다시 확인해보세요
                                    </p>
                                )}
                                {!translationPassed && (
                                    <p className="text-xs text-orange-200">
                                        💡 해석을 다시 작성해보세요
                                    </p>
                                )}
                                <button
                                    onClick={() => {
                                        setStudentTranslation("");
                                        setHasSubmitted(false);
                                    }}
                                    className="w-full mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all"
                                >
                                    다시 시도하기
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Helper Text */}
            {!bothScored && (
                <p className="text-xs text-navy-400 text-center">
                    끊어읽기 표시와 해석을 모두 완료한 후 제출하세요
                </p>
            )}
        </div>
    );
}
