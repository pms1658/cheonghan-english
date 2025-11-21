"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft } from "lucide-react";
import { mockPassages } from "@/lib/chunk-reading-data";
import { WordGroup, MarkingType } from "@/types/chunk-reading";
import { SentenceSelector } from "@/components/chunk-reading/SentenceSelector";
import { TranslationPanel } from "@/components/chunk-reading/TranslationPanel";
import { MarkingToolbar } from "@/components/chunk-reading/MarkingToolbar";
import { InteractiveSentence } from "@/components/chunk-reading/InteractiveSentence";

export default function ChunkReadingPage() {
    const [selectedPassageId, setSelectedPassageId] = useState<string | null>(null);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [completedSentences, setCompletedSentences] = useState<Set<number>>(new Set());
    const [sentenceGroups, setSentenceGroups] = useState<Map<number, WordGroup[]>>(new Map());
    const [showBackbone, setShowBackbone] = useState(false);

    const selectedPassage = mockPassages.find((p) => p.id === selectedPassageId);
    const currentSentence = selectedPassage?.sentences[currentSentenceIndex];
    const currentGroups = sentenceGroups.get(currentSentenceIndex) || [];

    const handleSelectPassage = (id: string) => {
        setSelectedPassageId(id);
        setCurrentSentenceIndex(0);
        setCompletedSentences(new Set());
        setSentenceGroups(new Map());
        setShowBackbone(false);
    };

    const handleSentenceComplete = () => {
        const newCompleted = new Set(completedSentences);
        newCompleted.add(currentSentenceIndex);
        setCompletedSentences(newCompleted);

        if (selectedPassage && currentSentenceIndex < selectedPassage.sentences.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
            setShowBackbone(false);
        }
    };

    const handleGroupsChange = (groups: WordGroup[]) => {
        const newMap = new Map(sentenceGroups);
        newMap.set(currentSentenceIndex, groups);
        setSentenceGroups(newMap);
    };

    const handleMarkAs = (type: MarkingType) => {
        if (typeof window !== "undefined" && (window as any).__markingFunctions) {
            (window as any).__markingFunctions.markAs(type);
        }
    };

    const handleClearSelection = () => {
        if (typeof window !== "undefined" && (window as any).__markingFunctions) {
            (window as any).__markingFunctions.clearSelection();
        }
    };

    const handleUndo = () => {
        if (typeof window !== "undefined" && (window as any).__markingFunctions) {
            (window as any).__markingFunctions.undo();
        }
    };

    if (!selectedPassageId || !selectedPassage) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">끊어읽기</h2>
                    <p className="text-gray-600 mt-2">배정된 지문으로 문장 구조를 학습하세요</p>
                </div>

                <div className="grid gap-4">
                    {mockPassages.map((passage) => (
                        <Card
                            key={passage.id}
                            className="bg-white border-gray-200 text-gray-900 hover:border-navy-950 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => handleSelectPassage(passage.id)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-blue-600" />
                                    <div>
                                        <CardTitle className="text-gray-900">{passage.title}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            {passage.source && (
                                                <span className="text-xs text-gray-500">
                                                    {passage.source}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                {passage.sentences.length}개 문장
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setSelectedPassageId(null)}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPassage.title}</h2>
                    {selectedPassage.source && (
                        <p className="text-sm text-gray-500 mt-1">{selectedPassage.source}</p>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="pt-6">
                            <SentenceSelector
                                sentences={selectedPassage.sentences}
                                currentIndex={currentSentenceIndex}
                                completedIndices={completedSentences}
                                onSelectSentence={(idx) => {
                                    setCurrentSentenceIndex(idx);
                                    setShowBackbone(false);
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <MarkingToolbar
                        onMarkAs={handleMarkAs}
                        onClearSelection={handleClearSelection}
                        onShowBackbone={() => setShowBackbone(!showBackbone)}
                        onUndo={handleUndo}
                        showingBackbone={showBackbone}
                    />

                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardHeader className="border-b border-gray-100">
                            <CardTitle className="text-gray-900">
                                문장 {currentSentenceIndex + 1} / {selectedPassage.sentences.length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <InteractiveSentence
                                sentence={currentSentence || ""}
                                groups={currentGroups}
                                onGroupsChange={handleGroupsChange}
                                showBackbone={showBackbone}
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardHeader className="border-b border-gray-100">
                            <CardTitle className="text-gray-900">해석 & 채점</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <TranslationPanel
                                sentence={currentSentence || ""}
                                groups={currentGroups}
                                onComplete={handleSentenceComplete}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
