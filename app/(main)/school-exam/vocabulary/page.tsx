"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { mockSets } from "@/lib/vocabulary-data";
import { VocabularySet, QuizQuestion, StudyMode } from "@/types/vocabulary";
import { WordSelectionView } from "@/components/vocabulary/WordSelectionView";
import { QuizView } from "@/components/vocabulary/QuizView";
import { QuizResults } from "@/components/vocabulary/QuizResults";

type ViewMode = "set-list" | "word-selection" | "mode-selection" | "quiz" | "results";

export default function SchoolExamVocabularyPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("set-list");
    const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
    const [studyMode, setStudyMode] = useState<StudyMode>("practice");
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongWords, setWrongWords] = useState<string[]>([]);

    // Generate quiz questions
    const quizQuestions = useMemo<QuizQuestion[]>(() => {
        if (!selectedSet || selectedWordIds.length === 0) return [];

        const selectedWords = selectedSet.words.filter((w) =>
            selectedWordIds.includes(w.id)
        );

        return selectedWords.map((word) => {
            // Get 5 random wrong answers from the same set
            const otherWords = selectedSet.words
                .filter((w) => w.id !== word.id)
                .map((w) => w.korean);

            const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
            const wrongAnswers = shuffled.slice(0, Math.min(5, shuffled.length));

            // If less than 5 other words, pad with duplicates (shouldn't happen with good data)
            while (wrongAnswers.length < 5) {
                wrongAnswers.push(wrongAnswers[wrongAnswers.length % wrongAnswers.length]);
            }

            // Combine correct answer with wrong answers and shuffle
            const options = [word.korean, ...wrongAnswers].sort(
                () => Math.random() - 0.5
            );

            return {
                word,
                options,
                correctAnswer: word.korean,
            };
        });
    }, [selectedSet, selectedWordIds]);

    const handleSelectSet = (set: VocabularySet) => {
        setSelectedSet(set);
        setSelectedWordIds([]);
        setViewMode("word-selection");
    };

    const handleToggleWord = (wordId: string) => {
        setSelectedWordIds((prev) =>
            prev.includes(wordId)
                ? prev.filter((id) => id !== wordId)
                : [...prev, wordId]
        );
    };

    const handleStartQuiz = () => {
        setViewMode("mode-selection");
    };

    const handleSelectMode = (mode: StudyMode) => {
        setStudyMode(mode);
        setViewMode("quiz");
    };

    const handleQuizComplete = (correct: number, wrong: string[]) => {
        setCorrectCount(correct);
        setWrongWords(wrong);
        setViewMode("results");
    };

    const handleRetry = () => {
        setViewMode("mode-selection");
    };

    const handleBackToList = () => {
        setSelectedSet(null);
        setSelectedWordIds([]);
        setViewMode("set-list");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white">단어 학습 - 내신대비</h2>
                <p className="text-navy-300 mt-2">교과서 필수 단어를 학습하세요</p>
            </div>

            {viewMode === "set-list" && (
                <div className="grid gap-4">
                    {mockSets.map((set) => (
                        <Card
                            key={set.id}
                            className="bg-navy-800 border-navy-700 text-white hover:border-galaxy-500 transition-all cursor-pointer"
                            onClick={() => handleSelectSet(set)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-galaxy-400" />
                                    <div>
                                        <CardTitle>{set.title}</CardTitle>
                                        <p className="text-sm text-navy-400 mt-1">
                                            {set.words.length}개 단어
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            {viewMode === "word-selection" && selectedSet && (
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardHeader>
                        <CardTitle>{selectedSet.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <WordSelectionView
                            words={selectedSet.words}
                            selectedWordIds={selectedWordIds}
                            onToggleWord={handleToggleWord}
                            onStartQuiz={handleStartQuiz}
                        />
                    </CardContent>
                </Card>
            )}

            {viewMode === "mode-selection" && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card
                        className="bg-navy-800 border-navy-700 text-white hover:border-galaxy-500 transition-all cursor-pointer"
                        onClick={() => handleSelectMode("practice")}
                    >
                        <CardHeader>
                            <CardTitle>오답 재출제 모드</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300 text-sm">
                                틀린 문제를 다시 풀면서 가볍게 학습합니다. 부담없이 연습하기에
                                좋습니다.
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-galaxy-400">
                                <span className="px-2 py-1 bg-galaxy-900/50 rounded">
                                    오답 반복
                                </span>
                                <span className="px-2 py-1 bg-galaxy-900/50 rounded">
                                    부담 없음
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="bg-navy-800 border-navy-700 text-white hover:border-red-500 transition-all cursor-pointer"
                        onClick={() => handleSelectMode("perfect")}
                    >
                        <CardHeader>
                            <CardTitle>100점 모드</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-navy-300 text-sm">
                                한 문제라도 틀리면 종료됩니다. 완벽하게 암기했는지 확인할 때
                                사용하세요.
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
                                <span className="px-2 py-1 bg-red-900/50 rounded">
                                    한번에 통과
                                </span>
                                <span className="px-2 py-1 bg-red-900/50 rounded">고난도</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {viewMode === "quiz" && quizQuestions.length > 0 && (
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardContent className="pt-6">
                        <QuizView
                            questions={quizQuestions}
                            mode={studyMode}
                            onComplete={handleQuizComplete}
                        />
                    </CardContent>
                </Card>
            )}

            {viewMode === "results" && (
                <Card className="bg-navy-800 border-navy-700 text-white">
                    <CardContent className="pt-6">
                        <QuizResults
                            totalQuestions={selectedWordIds.length}
                            correctCount={correctCount}
                            wrongWords={wrongWords}
                            mode={studyMode}
                            onRetry={handleRetry}
                            onBack={handleBackToList}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
