import { z } from 'zod';

/**
 * API 요청 Body Zod 스키마 정의
 * 
 * 모든 API 라우트의 요청 구조를 정의합니다.
 * warn-only 모드로 사용되어 검증 실패 시에도 기존 로직을 차단하지 않습니다.
 */

// ═══════════════════════════════════════
// 공통 스키마
// ═══════════════════════════════════════

const targetGradeSchema = z.enum(['e4', 'e5', 'e6', 'm1', 'm2', 'm3', '1', '2', '3']).optional().default('3');

// ═══════════════════════════════════════
// 채점 (Grading) 스키마
// ═══════════════════════════════════════

/** POST /api/grade — 구조독해 배치 채점 */
export const gradeRequestSchema = z.object({
    assignments: z.array(z.object({
        standard_answer: z.string(),
        student_answers: z.array(z.string()),
        sentence_index: z.number(),
    })).min(1, 'At least one assignment is required'),
});

/** POST /api/grade-vocab-ko — 한국어 어휘 채점 */
export const gradeVocabKoRequestSchema = z.object({
    items: z.array(z.object({
        word: z.string(),
        correctMeaning: z.string(),
        studentInput: z.string(),
    })).min(1, 'At least one item is required'),
});

/** POST /api/grade-subjective — 주관식 채점 */
export const gradeSubjectiveRequestSchema = z.object({
    problems: z.array(z.any()).min(1),
    answers: z.array(z.any()).min(1),
    passage: z.string().min(1, 'Passage is required'),
});

/** POST /api/grade-writing — 영작 단건 채점 */
export const gradeWritingRequestSchema = z.object({
    targetGrammar: z.string(),
    koreanSentence: z.string(),
    studentAnswer: z.string(),
    correctAnswer: z.string(),
});

/** POST /api/grade-writing-batch — 영작 배치 채점 */
export const gradeWritingBatchRequestSchema = z.object({
    problems: z.array(z.object({
        korean: z.string(),
        correctAnswer: z.string(),
        studentAnswer: z.string(),
        keyGrammar: z.string(),
    })).min(1),
    targetGrammar: z.string().optional(),
    level: z.string().optional(),
});

// ═══════════════════════════════════════
// 생성 (Generation) 스키마
// ═══════════════════════════════════════

/** POST /api/generate-variant-problems — 변형문제 생성 */
export const generateVariantRequestSchema = z.object({
    passage: z.string().min(1, 'Passage is required'),
    problemTypes: z.array(z.string()).optional(),
    autoGenerate: z.boolean().optional(),
    targetGrade: targetGradeSchema,
    isSpecialLevel: z.boolean().optional(),
});

/** POST /api/generate-subjective-problems — 주관식 생성 */
export const generateSubjectiveRequestSchema = z.object({
    passage: z.string().min(1, 'Passage is required'),
    targetGrade: targetGradeSchema,
    problemTypes: z.array(z.string()).optional(),
});

/** POST /api/generate-workbook — 워크북 생성 */
export const generateWorkbookRequestSchema = z.object({
    passage: z.string().min(1, 'Passage is required'),
    targetGrade: targetGradeSchema,
});

/** POST /api/generate-analysis — 구조 분석 생성 */
export const generateAnalysisRequestSchema = z.object({
    sentences: z.array(z.any()).min(1, 'At least one sentence is required'),
    grade: z.string().optional().default('2'),
});

/** POST /api/generate-full-set — 풀세트 생성 */
export const generateFullSetRequestSchema = z.object({
    passage: z.string().min(1, 'Passage is required'),
    problemTypes: z.array(z.string()).optional(),
    targetGrade: targetGradeSchema,
});

/** POST /api/generate-listening-set — 듣기세트 생성 */
export const generateListeningSetRequestSchema = z.object({
    targetGrade: targetGradeSchema,
});

/** POST /api/generate-writing-problems — 영작 문제 생성 */
export const generateWritingProblemsRequestSchema = z.object({
    sessionTitle: z.string(),
    sessionFormula: z.string().optional(),
    sessionDescription: z.string().optional(),
    sessionExample: z.string().optional(),
    level: z.enum(['bronze', 'silver', 'gold']).optional(),
    targetGrade: targetGradeSchema,
    problemCount: z.number().int().positive().optional(),
    bidirectional: z.boolean().optional(),
});

/** POST /api/generate-report-summary — 리포트 총평 생성 */
export const generateReportSummaryRequestSchema = z.object({
    studentName: z.string(),
    yearMonth: z.string(),
    vocabScore: z.number(),
    grammarScore: z.number(),
    readingScore: z.number(),
    vocab: z.object({
        totalWordsLearned: z.number(),
        monthlyWordsLearned: z.number(),
        avgAttemptsToPass: z.number(),
        firstTryPassRate: z.number(),
    }).passthrough(),
    grammar: z.object({
        sessionsAttempted: z.number(),
        sessionsPassed: z.number(),
        avgFirstAttemptScore: z.number(),
        weakSessions: z.array(z.any()),
        strongSessions: z.array(z.any()),
    }).passthrough(),
    reading: z.object({
        withTranslation: z.number(),
        avgScore: z.number(),
    }).passthrough(),
    growth: z.object({
        vocabTrend: z.enum(['up', 'stable', 'down']),
        grammarTrend: z.enum(['up', 'stable', 'down']),
        readingTrend: z.enum(['up', 'stable', 'down']),
        improvements: z.array(z.string()),
    }).passthrough(),
});

/** POST /api/generate-image — 이미지 생성 */
export const generateImageRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
});

// ═══════════════════════════════════════
// 유틸리티 (Utility) 스키마
// ═══════════════════════════════════════

/** POST /api/extract-words — 단어 추출 */
export const extractWordsRequestSchema = z.object({
    sentences: z.array(z.string()).min(1),
    providedWords: z.array(z.any()).optional(),
});

/** POST /api/translate-sentences — 번역 */
export const translateSentencesRequestSchema = z.object({
    sentences: z.array(z.string()).min(1, 'At least one sentence is required'),
});

// ═══════════════════════════════════════
// TTS 스키마
// ═══════════════════════════════════════

/** POST /api/tts — 단일 TTS */
export const ttsRequestSchema = z.object({
    text: z.string().min(1, 'Text is required'),
    speaker: z.enum(['M', 'W', 'N']).optional().default('M'),
    lang: z.enum(['en', 'ko']).optional(),
});

/** POST /api/tts-problem — 문제별 TTS */
export const ttsProblemRequestSchema = z.object({
    lines: z.array(z.object({
        speaker: z.enum(['M', 'W', 'N']).optional(),
        text: z.string(),
        lang: z.enum(['en', 'ko']).optional(),
    })).min(1, 'At least one line is required'),
    problemNumber: z.number().int().positive(),
});

// ═══════════════════════════════════════
// 스키마 이름 매핑 (로그용)
// ═══════════════════════════════════════

export const API_SCHEMAS = {
    'grade': gradeRequestSchema,
    'grade-vocab-ko': gradeVocabKoRequestSchema,
    'grade-subjective': gradeSubjectiveRequestSchema,
    'grade-writing': gradeWritingRequestSchema,
    'grade-writing-batch': gradeWritingBatchRequestSchema,
    'generate-variant-problems': generateVariantRequestSchema,
    'generate-subjective-problems': generateSubjectiveRequestSchema,
    'generate-workbook': generateWorkbookRequestSchema,
    'generate-analysis': generateAnalysisRequestSchema,
    'generate-full-set': generateFullSetRequestSchema,
    'generate-listening-set': generateListeningSetRequestSchema,
    'generate-writing-problems': generateWritingProblemsRequestSchema,
    'generate-report-summary': generateReportSummaryRequestSchema,
    'generate-image': generateImageRequestSchema,
    'extract-words': extractWordsRequestSchema,
    'translate-sentences': translateSentencesRequestSchema,
    'tts': ttsRequestSchema,
    'tts-problem': ttsProblemRequestSchema,
} as const;
