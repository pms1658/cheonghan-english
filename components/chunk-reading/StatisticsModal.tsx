"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { translateWithStructure } from "@/app/actions/gemini";

interface StatisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    scores: {
        [sentenceIndex: number]: {
            chunkReading: number | null;
            translation: number | null;
        }
    };
    sentences: string[];
    onRetry: () => void;
}

export function StatisticsModal({ isOpen, onClose, scores, sentences, onRetry }: StatisticsModalProps) {
    const [showingAnswers, setShowingAnswers] = useState<{
        [key: string]: boolean; // "chunk-0", "trans-1" etc
    }>({});
    const [answers, setAnswers] = useState<{
        [key: string]: string;
    }>({});
    const [loadingAnswer, setLoadingAnswer] = useState<string | null>(null);

    if (!isOpen) return null;

    // Calculate averages
    const validScores = Object.values(scores).filter(s => s.chunkReading !== null && s.translation !== null);
    const chunkAvg = validScores.length > 0
        ? validScores.reduce((sum, s) => sum + (s.chunkReading || 0), 0) / validScores.length
        : 0;
    const translationAvg = validScores.length > 0
        ? validScores.reduce((sum, s) => sum + (s.translation || 0), 0) / validScores.length
        : 0;
    const overallAvg = (chunkAvg + translationAvg) / 2;

    const handleShowAnswer = async (type: 'chunk' | 'trans', idx: number) => {
        const key = `${type}-${idx}`;

        if (showingAnswers[key]) {
            setShowingAnswers(prev => ({ ...prev, [key]: false }));
            return;
        }

        if (answers[key]) {
            setShowingAnswers(prev => ({ ...prev, [key]: true }));
            return;
        }

        setLoadingAnswer(key);
        try {
            if (type === 'chunk') {
                // For chunk reading, show a simple guidance
                setAnswers(prev => ({ ...prev, [key]: "수식어(modifier)를 괄호로 표시하고, 동사(verb)에 밑줄을 긋습니다. 종속절이 있으면 대괄호로 표시합니다." }));
            } else {
                // For translation, get AI translation
                const result = await translateWithStructure(sentences[idx]);
                setAnswers(prev => ({ ...prev, [key]: result?.translation || "번역을 가져올 수 없습니다." }));
            }
            setShowingAnswers(prev => ({ ...prev, [key]: true }));
        } catch (error) {
            console.error("Error fetching answer:", error);
        } finally {
            setLoadingAnswer(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-navy-950 border border-navy-800 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-navy-800">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">학습 통계</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-navy-800 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5 text-navy-300" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-navy-900/50 rounded-lg overflow-hidden border border-navy-800">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-navy-800/50">
                                    <th className="px-4 py-3 text-sm font-semibold text-navy-200 text-left">문장</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-navy-200 text-center">구조독해</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-navy-200 text-center">해석</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-navy-200 text-center">정답보기</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sentences.map((sentence, idx) => {
                                    const score = scores[idx];
                                    const chunk = score?.chunkReading || 0;
                                    const trans = score?.translation || 0;
                                    const chunkKey = `chunk-${idx}`;
                                    const transKey = `trans-${idx}`;

                                    return (
                                        <>
                                            <tr key={idx} className="border-t border-navy-800/50">
                                                <td className="px-4 py-3 text-sm text-navy-300">
                                                    <div className="max-w-xs truncate" title={sentence}>
                                                        {sentence.substring(0, 40)}{sentence.length > 40 ? '...' : ''}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-center font-semibold ${chunk >= 80 ? 'text-green-400' : 'text-orange-400'}`}>
                                                    {chunk}점
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-center font-semibold ${trans >= 80 ? 'text-green-400' : 'text-orange-400'}`}>
                                                    {trans}점
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2 justify-center">
                                                        {chunk < 80 && (
                                                            <button
                                                                onClick={() => handleShowAnswer('chunk', idx)}
                                                                disabled={loadingAnswer === chunkKey}
                                                                className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 text-xs rounded transition-all disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {showingAnswers[chunkKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                {loadingAnswer === chunkKey ? "로딩..." : (showingAnswers[chunkKey] ? "닫기" : "구조독해")}
                                                            </button>
                                                        )}
                                                        {trans < 80 && (
                                                            <button
                                                                onClick={() => handleShowAnswer('trans', idx)}
                                                                disabled={loadingAnswer === transKey}
                                                                className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 text-xs rounded transition-all disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {showingAnswers[transKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                {loadingAnswer === transKey ? "로딩..." : (showingAnswers[transKey] ? "닫기" : "해석")}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Answer rows */}
                                            {showingAnswers[chunkKey] && (
                                                <tr className="bg-purple-900/10">
                                                    <td colSpan={4} className="px-4 py-3">
                                                        <div className="text-sm text-purple-200 bg-purple-900/20 p-3 rounded border border-purple-700/30">
                                                            <p className="font-semibold mb-1">구조독해 가이드:</p>
                                                            <p>{answers[chunkKey]}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {showingAnswers[transKey] && (
                                                <tr className="bg-blue-900/10">
                                                    <td colSpan={4} className="px-4 py-3">
                                                        <div className="text-sm text-blue-200 bg-blue-900/20 p-3 rounded border border-blue-700/30">
                                                            <p className="font-semibold mb-1">모범 번역:</p>
                                                            <p>{answers[transKey]}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                                {/* Average row */}
                                <tr className="border-t-2 border-navy-700 bg-navy-800/30">
                                    <td className="px-4 py-3 text-sm font-semibold text-white">평균</td>
                                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-400">
                                        {chunkAvg.toFixed(1)}점
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-400">
                                        {translationAvg.toFixed(1)}점
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                        <p className="text-white font-semibold mb-2">종합 평가</p>
                        <p className="text-blue-200 text-sm">
                            {overallAvg >= 80
                                ? "🎉 훌륭합니다! 모든 항목에서 우수한 성과를 보였습니다."
                                : "💪 정답을 확인하고 재시험을 통해 실력을 향상시켜보세요!"}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-navy-800 flex gap-3">
                    {overallAvg < 80 && (
                        <button
                            onClick={onRetry}
                            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-all"
                        >
                            재시험 보기
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
