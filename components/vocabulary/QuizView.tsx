"use client";

import { useState } from "react";
import { QuizQuestion, StudyMode } from "@/types/vocabulary";
import { Check, X } from "lucide-react";

interface QuizViewProps {
    questions: QuizQuestion[];
    mode: StudyMode;
    onComplete: (correctCount: number, wrongWords: string[]) => void;
}

export function QuizView({ questions, mode, onComplete }: QuizViewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongWords, setWrongWords] = useState<string[]>([]);
    const [remainingQuestions, setRemainingQuestions] = useState(questions);

    const currentQuestion = remainingQuestions[currentIndex];

    const handleSelectAnswer = (answer: string) => {
        if (showFeedback) return;
        setSelectedAnswer(answer);
    };

    const handleSubmit = () => {
        if (!selectedAnswer) return;

        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        setShowFeedback(true);

        if (isCorrect) {
            setCorrectCount(correctCount + 1);
        } else {
            setWrongWords([...wrongWords, currentQuestion.word.id]);

            // Perfect mode: end quiz on first wrong answer
            if (mode === "perfect") {
                setTimeout(() => {
                    onComplete(correctCount, [...wrongWords, currentQuestion.word.id]);
                }, 1500);
                return;
            }
        }
    };

    const handleNext = () => {
        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

        if (mode === "practice" && !isCorrect) {
            // In practice mode, add wrong answer back to the queue
            setRemainingQuestions([
                ...remainingQuestions.slice(currentIndex + 1),
                currentQuestion,
            ]);
        } else {
            // Move to next question
            if (currentIndex + 1 >= remainingQuestions.length) {
                // Quiz complete
                onComplete(correctCount + (isCorrect ? 1 : 0), wrongWords);
                return;
            }
        }

        setCurrentIndex(
            mode === "practice" && !isCorrect ? currentIndex : currentIndex + 1
        );
        setSelectedAnswer(null);
        setShowFeedback(false);
    };

    if (!currentQuestion) {
        onComplete(correctCount, wrongWords);
        return null;
    }

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const progress = mode === "practice"
        ? `${correctCount} / ${questions.length}`
        : `${currentIndex + 1} / ${remainingQuestions.length}`;

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm text-navy-400">진행률</span>
                    <p className="text-2xl font-bold text-white mt-1">{progress}</p>
                </div>
                <div className="px-4 py-2 bg-navy-800 rounded-lg">
                    <span className="text-sm text-navy-400">
                        {mode === "practice" ? "오답 재출제 모드" : "100점 모드"}
                    </span>
                </div>
            </div>

            {/* Question */}
            <div className="bg-navy-800 rounded-lg p-8 text-center">
                <p className="text-sm text-navy-400 mb-4">영단어</p>
                <h2 className="text-4xl font-bold text-white">
                    {currentQuestion.word.english}
                </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isWrong = showFeedback && isSelected && !isCorrect;
                    const isCorrectAnswer =
                        showFeedback && option === currentQuestion.correctAnswer;

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelectAnswer(option)}
                            disabled={showFeedback}
                            className={`p-4 rounded-lg text-left transition-all border-2 ${isCorrectAnswer
                                    ? "bg-green-600/20 border-green-500 text-green-100"
                                    : isWrong
                                        ? "bg-red-600/20 border-red-500 text-red-100"
                                        : isSelected
                                            ? "bg-galaxy-600 border-galaxy-500 text-white"
                                            : "bg-navy-800 border-navy-700 text-navy-200 hover:border-galaxy-500"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{option}</span>
                                {showFeedback && isCorrectAnswer && (
                                    <Check className="h-5 w-5 text-green-400" />
                                )}
                                {showFeedback && isWrong && (
                                    <X className="h-5 w-5 text-red-400" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
                {!showFeedback ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedAnswer}
                        className="px-8 py-3 bg-galaxy-600 hover:bg-galaxy-500 disabled:bg-navy-700 disabled:text-navy-500 text-white rounded-lg transition-all font-semibold"
                    >
                        제출
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className={`px-8 py-3 rounded-lg transition-all font-semibold ${isCorrect
                                ? "bg-green-600 hover:bg-green-500 text-white"
                                : mode === "perfect"
                                    ? "bg-red-600 hover:bg-red-500 text-white"
                                    : "bg-galaxy-600 hover:bg-galaxy-500 text-white"
                            }`}
                    >
                        {mode === "perfect" && !isCorrect ? "퀴즈 종료" : "다음"}
                    </button>
                )}
            </div>
        </div>
    );
}
