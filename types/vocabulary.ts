// Class-based vocabulary management types

export interface VocabularyClass {
    id: string;
    name: string;           // "고3 A반", "김철수 개별"
    parentClassId?: string; // For hierarchical structure (folder)
    description?: string;
    studentIds?: string[];  // Associated students
    color?: string;         // For visual distinction
    createdAt: Date;
    updatedAt: Date;
}

export type SetType = "vocabulary" | "chunk-reading" | "sequence";

export interface ChunkReadingPassage {
    id: string;
    title: string;
    rawText: string;
    sentences: string[];
    difficulty: "easy" | "medium" | "hard";
    source?: string;
    createdAt: Date;
}

export interface VocabularySet {
    id: string;
    classId: string;        // Parent class
    type: SetType;          // Set type
    name: string;           // "6월 모의고사", "수능특강 1강"
    description?: string;
    words: VocabularyWord[];
    passages?: ChunkReadingPassage[]; // For chunk reading sets
    createdAt: Date;
    updatedAt: Date;
}

export interface VocabularyWord {
    id: string;
    word: string;           // English word
    meaning: string;        // Korean meaning
    example?: string;       // Example sentence
    pronunciation?: string; // IPA or Korean
    level?: "고1" | "고2" | "고3" | "수능";
    partOfSpeech?: string;  // n., v., adj., etc.
    synonyms?: string[];
    antonyms?: string[];
}

export type UploadMethod = "table" | "paste" | "passage";

export const WORD_LEVELS = ["고1", "고2", "고3", "수능"] as const;
export const PARTS_OF_SPEECH = ["n.", "v.", "adj.", "adv.", "prep.", "conj.", "interj."] as const;

// Study session types (keeping for compatibility)
export type StudyMode = "practice" | "perfect";

export interface QuizQuestion {
    word: VocabularyWord;
    options: string[];
    correctAnswer: string;
}

export interface QuizResult {
    wordId: string;
    correct: boolean;
    attempts: number;
}

export interface StudySession {
    setId: string;
    selectedWordIds: string[];
    mode: StudyMode;
    results: QuizResult[];
    score: number;
    completed: boolean;
}

// Student management
export interface Student {
    id: string;
    name: string;
    email: string;
    joinedAt: Date;
}

// Student progress tracking
export interface StudentProgress {
    studentId: string;
    studentName: string;
    completionRate: number;  // 0-100
    lastStudied?: Date;
    score?: number;
}
