"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { splitIntoSentences } from "@/app/actions/gemini";

interface PassageInputFormProps {
    onSave: (passage: {
        title: string;
        rawText: string;
        sentences: string[];
        difficulty: "easy" | "medium" | "hard";
        source?: string;
    }) => void;
}

export function PassageInputForm({ onSave }: PassageInputFormProps) {
    const [title, setTitle] = useState("");
    const [source, setSource] = useState("");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [rawText, setRawText] = useState("");
    const [sentences, setSentences] = useState<string[]>([]);
    const [isSplitting, setIsSplitting] = useState(false);

    const handleSplitSentences = async () => {
        if (!rawText.trim()) {
            alert("지문을 입력해주세요");
            return;
        }

        setIsSplitting(true);
        try {
            const result = await splitIntoSentences(rawText);
            setSentences(result);
        } catch (error) {
            console.error("Error splitting sentences:", error);
            alert("문장 분리 중 오류가 발생했습니다");
        } finally {
            setIsSplitting(false);
        }
    };

    const handleSave = () => {
        if (!title || !rawText || sentences.length === 0) {
            alert("모든 필드를 입력하고 문장을 분리해주세요");
            return;
        }

        onSave({
            title,
            rawText,
            sentences,
            difficulty,
            source: source || undefined,
        });

        // Reset form
        setTitle("");
        setSource("");
        setRawText("");
        setSentences([]);
    };

    return (
        <Card className="bg-navy-800 border-navy-700 text-white">
            <CardHeader>
                <CardTitle>새 지문 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="text-sm text-navy-300 block mb-2">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 2024 수능 모의고사 18번"
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>

                <div>
                    <label className="text-sm text-navy-300 block mb-2">출처 (선택)</label>
                    <input
                        type="text"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="예: 2024 수능 모의고사"
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>

                <div>
                    <label className="text-sm text-navy-300 block mb-2">난이도</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    >
                        <option value="easy">쉬움</option>
                        <option value="medium">보통</option>
                        <option value="hard">어려움</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm text-navy-300 block mb-2">지문</label>
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="영어 지문을 붙여넣으세요..."
                        rows={8}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-white placeholder:text-navy-500 focus:outline-none focus:ring-2 focus:ring-galaxy-500"
                    />
                </div>

                <button
                    onClick={handleSplitSentences}
                    disabled={isSplitting || !rawText.trim()}
                    className="w-full px-4 py-2 bg-galaxy-600 hover:bg-galaxy-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {isSplitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            AI 분석 중...
                        </>
                    ) : (
                        "문장 자동 분리"
                    )}
                </button>

                {sentences.length > 0 && (
                    <div>
                        <label className="text-sm text-navy-300 block mb-2">
                            감지된 문장 ({sentences.length}개)
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sentences.map((sentence, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 bg-navy-900/50 rounded text-sm text-navy-200"
                                >
                                    <span className="text-galaxy-400 font-semibold mr-2">
                                        {idx + 1}.
                                    </span>
                                    {sentence}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setTitle("");
                            setSource("");
                            setRawText("");
                            setSentences([]);
                        }}
                        className="flex-1 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-all"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={sentences.length === 0}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all"
                    >
                        저장
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
