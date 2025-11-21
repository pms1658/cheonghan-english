export interface CsatMaterial {
    id: string;
    year: number;              // 2023, 2024, etc.
    examType: "수능" | "6월모평" | "9월모평" | "사관학교" | "교육청";
    questionNumber: number;    // 18, 19, 20, etc.
    questionType: QuestionType;
    passage: string;           // 지문
    question: string;          // 문제
    choices?: string[];        // 선택지 (객관식인 경우)
    answer: string;            // 정답
    explanation?: string;      // 해설
    createdAt: Date;
}

export type QuestionType =
    | "빈칸추론"
    | "순서배열"
    | "문장삽입"
    | "요지파악"
    | "주제파악"
    | "제목파악"
    | "내용일치"
    | "어법"
    | "어휘"
    | "기타";

export const QUESTION_TYPES: QuestionType[] = [
    "빈칸추론",
    "순서배열",
    "문장삽입",
    "요지파악",
    "주제파악",
    "제목파악",
    "내용일치",
    "어법",
    "어휘",
    "기타"
];

export const EXAM_TYPES = ["수능", "6월모평", "9월모평", "사관학교", "교육청"] as const;
