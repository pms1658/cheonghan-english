"use client";

import { useState } from "react";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";
import { gradeTranslation, translateWithStructure } from "@/app/actions/gemini";
import { Card, CardContent } from "@/components/ui/card";
import { WordGroup } from "@/types/chunk-reading";

interface TranslationPanelProps {
    sentence: string;
    groups: WordGroup[];
    onComplete?: () => void;
}

export function TranslationPanel({ sentence, groups, onComplete }: TranslationPanelProps) {
    const [studentTranslation, setStudentTranslation] = useState("");
    const [aiTranslation, setAiTranslation] = useState<string | null>(null);
    const [grading, setGrading] = useState<any>(null);
    const [markingGrading, setMarkingGrading] = useState<any>(null);
    const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
    const [isGrading, setIsGrading] = useState(false);
    const [isGradingMarking, setIsGradingMarking] = useState(false);

    const handleShowAITranslation = async () => {
        setIsLoadingTranslation(true);
        try {
            const result = await translateWithStructure(sentence);
            if (result) {
                setAiTranslation(result.translation);
            } else {
                alert("AI 해석을 가져오지 못했습니다");
            }
        } catch (error) {
            console.error("Translation error:", error);
            alert("오류가 발생했습니다");
        } finally {
            setIsLoadingTranslation(false);
        }
    };

    const handleGradeTranslation = async () => {
        if (!studentTranslation.trim()) {
            alert("해석을 입력해주세요");
            return;
        }

        setIsGrading(true);
        try {
            const result = await gradeTranslation(sentence, studentTranslation);
            if (result) {
                setGrading(result);
            } else {
                alert("채점 결과를 가져오지 못했습니다");
            }
        } catch (error) {
            console.error("Grading error:", error);
            alert("오류가 발생했습니다");
        } finally {
            setIsGrading(false);
        }
    };

    const handleGradeMarking = async () => {
        if (groups.length === 0) {
            alert("먼저 끊어읽기 표시를 해주세요");
            return;
        }

        setIsGradingMarking(true);
        try {
            // Create description of marking for AI
            const markingDescription = groups.map(g => {
                const words = sentence.split(/\s+/);
                const groupWords = g.wordIndices.map(i => words[i]).join(" ");
                return `[${g.type}] ${groupWords}`;
            }).join(", ");

            const prompt = `문장: "${sentence}"
학생이 끊어읽기를 다음과 같이 표시했습니다:
${markingDescription}

동사(verb), 준동사(gerund), 종속절(clause), 등위접속사(conjunction), 수식어(modifier)의 표시가 정확한지 채점하고, JSON 형식으로 응답해주세요:
{
  "score": 점수(0-100),
  "feedback": "총평",
  "correctMarkings": ["잘 표시한 부분1", "잘 표시한 부분2"],
  "incorrectMarkings": ["틀린 부분1", "틀린 부분2"],
  "suggestions": ["개선 제안1", "개선 제안2"]
}`;

            // Simple fetch for now (replace with actual Gemini service call)
            const mockResult = {
                score: 85,
                feedback: "전반적으로 잘 표시했습니다. 동사와 수식어 구분이 정확합니다.",
                correctMarkings: ["동사 표시", "수식어 괄호"],
                incorrectMarkings: [],
                suggestions: ["종속절 범위를 조금 더 넓게 표시해보세요"]
            };

            setMarkingGrading(mockResult);
        } catch (error) {
            console.error("Marking grading error:", error);
            alert("오류가 발생했습니다");
        } finally {
            setIsGradingMarking(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Marking Grading Section */}
            <div className="pb-4 border-b border-navy-700">
                <h3 className="text-sm font-semibold text-white mb-3">끊어읽기 채점</h3>
                <button
                    onClick={handleGradeMarking}
                    disabled={isGradingMarking || groups.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all"
                >
                    {isGradingMarking ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            채점 중...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            끊어읽기 표시 채점
                        </>
                    )}
                </button>

                {markingGrading && (
                    <Card className="bg-purple-900/30 border-purple-700 mt-3">
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-navy-300">끊어읽기 점수</p>
                                <p className="text-2xl font-bold text-white">{markingGrading.score}점</p>
                            </div>

                            <div>
                                <p className="text-sm text-navy-300 mb-1">총평</p>
                                <p className="text-white text-sm">{markingGrading.feedback}</p>
                            </div>

                            {markingGrading.correctMarkings && markingGrading.correctMarkings.length > 0 && (
                                <div>
                                    <p className="text-sm text-green-400 mb-1">잘한 점</p>
                                    <ul className="list-disc list-inside text-sm text-navy-200 space-y-1">
                                        {markingGrading.correctMarkings.map((item: string, idx: number) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {markingGrading.suggestions && markingGrading.suggestions.length > 0 && (
                                <div>
                                    <p className="text-sm text-yellow-400 mb-1">개선 제안</p>
                                    <ul className="list-disc list-inside text-sm text-navy-200 space-y-1">
                                        {markingGrading.suggestions.map((item: string, idx: number) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Translation Section */}
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">해석 & 채점</h3>
                <div>
                    <label className="text-sm text-navy-300 block mb-2">내 해석</label>
                    <textarea
                        value={studentTranslation}
                        onChange={(e) => setStudentTranslation(e.target.value)}
                        placeholder="문장을 한국어로 해석해보세요..."
                        rows={3}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleShowAITranslation}
                        disabled={isLoadingTranslation}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 disabled:bg-navy-800 text-white rounded-lg transition-all"
                    >
                        {isLoadingTranslation ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                로딩 중...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                AI 해석 보기
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleGradeTranslation}
                        disabled={isGrading || !studentTranslation.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all"
                    >
                        {isGrading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                채점 중...
                            </>
                        ) : (
                            "내 해석 채점"
                        )}
                    </button>
                </div>

                {aiTranslation && (
                    <Card className="bg-galaxy-900/30 border-galaxy-700 mt-3">
                        <CardContent className="pt-4">
                            <p className="text-sm text-galaxy-300 mb-1">AI 해석</p>
                            <p className="text-white">{aiTranslation}</p>
                        </CardContent>
                    </Card>
                )}

                {grading && (
                    <Card className="bg-navy-900 border-navy-700 mt-3">
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-navy-300">해석 점수</p>
                                <p className="text-2xl font-bold text-white">{grading.score}점</p>
                            </div>

                            <div>
                                <p className="text-sm text-navy-300 mb-1">총평</p>
                                <p className="text-white text-sm">{grading.feedback}</p>
                            </div>

                            {grading.misunderstoodWords && grading.misunderstoodWords.length > 0 && (
                                <div>
                                    <p className="text-sm text-red-400 mb-1">헷갈린 단어</p>
                                    <div className="flex flex-wrap gap-2">
                                        {grading.misunderstoodWords.map((word: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-red-900/30 border border-red-700/50 text-red-300 rounded text-xs"
                                            >
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {grading.strengths && grading.strengths.length > 0 && (
                                <div>
                                    <p className="text-sm text-green-400 mb-1">잘한 점</p>
                                    <ul className="list-disc list-inside text-sm text-navy-200 space-y-1">
                                        {grading.strengths.map((strength: string, idx: number) => (
                                            <li key={idx}>{strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {onComplete && (
                                <button
                                    onClick={onComplete}
                                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all mt-2"
                                >
                                    완료 → 다음 문장
                                </button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
