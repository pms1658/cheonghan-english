"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getSetById } from "@/lib/vocabulary-data";
import { ChunkReadingPassage } from "@/types/vocabulary";
import { WordGroup } from "@/types/chunk-reading";
import { SentenceSelector } from "@/components/chunk-reading/SentenceSelector";
import { MarkingToolbar } from "@/components/chunk-reading/MarkingToolbar";
import { InteractiveSentence, InteractiveSentenceRef } from "@/components/chunk-reading/InteractiveSentence";
import { TranslationPanel } from "@/components/chunk-reading/TranslationPanel";

export default function PassageStudyPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const setId = params.setId as string;
    const passageId = params.passageId as string;

    const [passage, setPassage] = useState<ChunkReadingPassage | null>(null);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [groups, setGroups] = useState<WordGroup[]>([]);
    const [completedSentences, setCompletedSentences] = useState<number[]>([]);
    const [showBackbone, setShowBackbone] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const interactiveSentenceRef = useRef<InteractiveSentenceRef>(null);

    useEffect(() => {
        setIsLoading(true);
        const set = getSetById(setId);
        if (set && set.passages) {
            const foundPassage = set.passages.find(p => p.id === passageId);
            if (foundPassage) {
                setPassage(foundPassage);
            }
        }
        setIsLoading(false);
    }, [setId, passageId]);

    // Reset groups when sentence changes
    useEffect(() => {
        setGroups([]);
    }, [currentSentenceIndex]);

    if (isLoading) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    if (!passage) {
        return <div className="p-8 text-center">지문을 찾을 수 없습니다.</div>;
    }

    // Safety check for sentences
    if (!passage.sentences || passage.sentences.length === 0) {
        return <div className="p-8 text-center">지문에 문장이 없습니다.</div>;
    }

    const handleNextSentence = () => {
        if (currentSentenceIndex < passage.sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
        }
    };

    const handlePrevSentence = () => {
        if (currentSentenceIndex > 0) {
            setCurrentSentenceIndex(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        if (!completedSentences.includes(currentSentenceIndex)) {
            setCompletedSentences([...completedSentences, currentSentenceIndex]);
        }
        handleNextSentence();
    };

    const handleMarkAs = (type: any) => {
        interactiveSentenceRef.current?.markAs(type);
    };

    const handleClearSelection = () => {
        interactiveSentenceRef.current?.clearSelection();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{passage.title}</h1>
                        <p className="text-xs text-gray-500">
                            {currentSentenceIndex + 1} / {passage.sentences.length} 문장
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevSentence}
                        disabled={currentSentenceIndex === 0}
                        className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                        onClick={handleNextSentence}
                        disabled={currentSentenceIndex === passage.sentences.length - 1}
                        className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar: Sentence List */}
                <div className="lg:col-span-3 order-2 lg:order-1">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
                        <h3 className="font-bold text-gray-900 mb-4">문장 목록</h3>
                        <SentenceSelector
                            sentences={passage.sentences}
                            currentIndex={currentSentenceIndex}
                            onSelectSentence={setCurrentSentenceIndex}
                            completedIndices={new Set(completedSentences)}
                        />
                    </div>
                </div>

                {/* Main Content: Study Area */}
                <div className="lg:col-span-9 order-1 lg:order-2 space-y-6">
                    {/* Marking Toolbar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <MarkingToolbar
                            onMarkAs={handleMarkAs}
                            onClearSelection={handleClearSelection}
                            onShowBackbone={() => setShowBackbone(!showBackbone)}
                            onUndo={() => interactiveSentenceRef.current?.undoLastMarking()}
                            showingBackbone={showBackbone}
                        />
                    </div>

                    {/* Interactive Sentence */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm min-h-[200px] flex items-center justify-center">
                        <div className="w-full">
                            <InteractiveSentence
                                ref={interactiveSentenceRef}
                                sentence={passage.sentences[currentSentenceIndex]}
                                groups={groups}
                                onGroupsChange={setGroups}
                                showBackbone={showBackbone}
                            />
                        </div>
                    </div>

                    {/* Translation & Grading */}
                    <div className="bg-navy-950 rounded-xl border border-navy-900 p-6 shadow-lg text-white">
                        <TranslationPanel
                            sentence={passage.sentences[currentSentenceIndex]}
                            groups={groups}
                            onComplete={handleComplete}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
