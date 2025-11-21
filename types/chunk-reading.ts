export interface Passage {
    id: string;
    title: string;
    rawText: string;
    sentences: string[];
    difficulty: "easy" | "medium" | "hard";
    source?: string;
    createdBy: string;
    assignedTo?: string[];
    createdAt: Date;
}

export type MarkingType = "verb" | "gerund" | "clause" | "conjunction" | "modifier";

export interface WordGroup {
    id: string;
    wordIndices: number[];
    type: MarkingType;
    color?: string;
}

export interface SentenceAnalysis {
    passageId: string;
    sentenceIndex: number;
    groups: WordGroup[];
    translation?: string;
    completed: boolean;
}

export interface GeminiStructureAnalysis {
    backbone: string;
    verbs: Array<{ text: string; position: [number, number] }>;
    modifiers: Array<{
        text: string;
        type: "adjective" | "adverb" | "relative-clause" | "participial" | "prepositional";
        position: [number, number];
    }>;
    clauses: Array<{
        text: string;
        type: "subordinate" | "coordinate";
        position: [number, number];
    }>;
}

export interface GeminiTranslation {
    translation: string; // Korean with modifiers in parentheses
    backbone: string; // Main sentence structure
}

export interface GeminiGrading {
    score: number;
    feedback: string;
    misunderstoodWords: string[];
    strengths: string[];
    improvements: string[];
}
