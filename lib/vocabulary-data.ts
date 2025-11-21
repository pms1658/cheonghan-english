import { VocabularyClass, VocabularySet, VocabularyWord, Student, ChunkReadingPassage } from "@/types/vocabulary";

// Mock data stores
export let mockClasses: VocabularyClass[] = [
    {
        id: "class-1",
        name: "고3 A반",
        description: "2024년 고3 A반 공통 어휘",
        color: "#3B82F6",
        studentIds: ["student-1", "student-2"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
    }
];

export let mockSets: VocabularySet[] = [
    {
        id: "set-1",
        classId: "class-1",
        type: "vocabulary",
        name: "6월 모의고사 필수 어휘",
        description: "6월 모의고사 대비 필수 영단어",
        words: [
            {
                id: "word-1",
                word: "accomplish",
                meaning: "성취하다, 달성하다",
                example: "She accomplished her goal.",
                level: "고3",
                partOfSpeech: "v."
            }
        ],
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15")
    }
];

export let mockStudents: Student[] = [
    { id: "student-1", name: "김철수", email: "kim@example.com", joinedAt: new Date("2024-01-01") },
    { id: "student-2", name: "이영희", email: "lee@example.com", joinedAt: new Date("2024-01-02") },
    { id: "student-3", name: "박민수", email: "park@example.com", joinedAt: new Date("2024-01-03") },
    { id: "student-4", name: "최지우", email: "choi@example.com", joinedAt: new Date("2024-01-04") },
    { id: "student-5", name: "정우성", email: "jung@example.com", joinedAt: new Date("2024-01-05") },
];

// ===== CLASS MANAGEMENT =====

export function getAllClasses(): VocabularyClass[] {
    return [...mockClasses];
}

export function getClassById(id: string): VocabularyClass | undefined {
    return mockClasses.find(c => c.id === id);
}

export function createClass(data: Omit<VocabularyClass, "id" | "createdAt" | "updatedAt">): VocabularyClass {
    const newClass: VocabularyClass = {
        ...data,
        id: `class-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    mockClasses.push(newClass);
    return newClass;
}

export function updateClass(id: string, updates: Partial<VocabularyClass>): VocabularyClass | null {
    const index = mockClasses.findIndex(c => c.id === id);
    if (index === -1) return null;

    mockClasses[index] = {
        ...mockClasses[index],
        ...updates,
        updatedAt: new Date()
    };
    return mockClasses[index];
}

export function deleteClass(id: string): boolean {
    const index = mockClasses.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Also delete all sets in this class
    mockSets = mockSets.filter(s => s.classId !== id);
    mockClasses.splice(index, 1);
    return true;
}

// ===== SET MANAGEMENT =====

export function getSetsByClassId(classId: string): VocabularySet[] {
    return mockSets.filter(s => s.classId === classId);
}

export function getSetById(id: string): VocabularySet | undefined {
    return mockSets.find(s => s.id === id);
}

export function createSet(data: Omit<VocabularySet, "id" | "createdAt" | "updatedAt">): VocabularySet {
    const newSet: VocabularySet = {
        ...data,
        id: `set-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    mockSets.push(newSet);
    return newSet;
}

export function updateSet(id: string, updates: Partial<VocabularySet>): VocabularySet | null {
    const index = mockSets.findIndex(s => s.id === id);
    if (index === -1) return null;

    mockSets[index] = {
        ...mockSets[index],
        ...updates,
        updatedAt: new Date()
    };
    return mockSets[index];
}

export function deleteSet(id: string): boolean {
    const index = mockSets.findIndex(s => s.id === id);
    if (index === -1) return false;

    mockSets.splice(index, 1);
    return true;
}

// ===== WORD MANAGEMENT =====

export function addWordsToSet(setId: string, words: Omit<VocabularyWord, "id">[]): VocabularySet | null {
    const set = getSetById(setId);
    if (!set) return null;

    const newWords: VocabularyWord[] = words.map((word, index) => ({
        ...word,
        id: `word-${Date.now()}-${index}`
    }));

    set.words.push(...newWords);
    set.updatedAt = new Date();

    return set;
}

export function removeWordsFromSet(setId: string, wordIds: string[]): VocabularySet | null {
    const set = getSetById(setId);
    if (!set) return null;

    set.words = set.words.filter(w => !wordIds.includes(w.id));
    set.updatedAt = new Date();

    return set;
}

export function updateWordInSet(setId: string, wordId: string, updates: Partial<VocabularyWord>): VocabularySet | null {
    const set = getSetById(setId);
    if (!set) return null;

    const wordIndex = set.words.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return null;

    set.words[wordIndex] = { ...set.words[wordIndex], ...updates };
    set.updatedAt = new Date();

    return set;
}

// ===== PASSAGE MANAGEMENT =====

export function addPassageToSet(setId: string, passage: Omit<ChunkReadingPassage, "id" | "createdAt">): VocabularySet | null {
    const set = getSetById(setId);
    if (!set) return null;

    if (!set.passages) set.passages = [];

    const newPassage: ChunkReadingPassage = {
        ...passage,
        id: `passage-${Date.now()}`,
        createdAt: new Date()
    };

    set.passages.push(newPassage);
    set.updatedAt = new Date();

    return set;
}

export function removePassageFromSet(setId: string, passageId: string): VocabularySet | null {
    const set = getSetById(setId);
    if (!set || !set.passages) return null;

    set.passages = set.passages.filter(p => p.id !== passageId);
    set.updatedAt = new Date();

    return set;
}

// ===== STUDENT MANAGEMENT =====

export function getAllStudents(): Student[] {
    return [...mockStudents];
}

export function getStudentsByClassId(classId: string): Student[] {
    const cls = getClassById(classId);
    if (!cls || !cls.studentIds) return [];
    return mockStudents.filter(s => cls.studentIds?.includes(s.id));
}

export function addStudentToClass(classId: string, studentId: string): boolean {
    const cls = getClassById(classId);
    if (!cls) return false;

    if (!cls.studentIds) cls.studentIds = [];
    if (cls.studentIds.includes(studentId)) return false;

    cls.studentIds.push(studentId);
    cls.updatedAt = new Date();
    return true;
}

export function removeStudentFromClass(classId: string, studentId: string): boolean {
    const cls = getClassById(classId);
    if (!cls || !cls.studentIds) return false;

    cls.studentIds = cls.studentIds.filter(id => id !== studentId);
    cls.updatedAt = new Date();
    return true;
}
