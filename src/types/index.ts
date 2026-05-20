// User types
export type UserRole = 'admin' | 'student';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    classId?: string; // 학생인 경우
    createdAt: Date;
    classIds?: string[]; // Added for multiple classes support
}

// Class types
export interface Class {
    id: string;
    name: string;
    studentIds?: string[];
    createdAt?: Date | number;
    folderId?: string;
    studentName?: string; // [New] Student-facing display name
}

// Vocabulary types
export interface Word {
    term: string;
    meaning: string;
    pronunciation?: string; // [New] IPA symbol
    partOfSpeech?: string;
    contextSentence?: string;
    assignmentId?: string;
}

// Assignment types
export type AssignmentCategory = 'sat' | 'midterm';
export type AssignmentType = 'vocabulary' | 'structure' | 'writing' | 'selection' | 'transform' | 'workbook' | 'analysis' | 'transform_subjective' | 'listening_set' | 'sentence_order' | 'external_subjective';
export type VocabularySource = 'custom' | 'workbook';
export type StructureSource = 'general' | 'textbook';


// Analysis Types
export interface AnalysisSentence {
    original: string;
    analyzed: string; // Text with [S]...[/S] tags
    translation: string;
    grammar: string[];
    vocab: { word: string; meaning: string }[];
}

export interface Assignment {
    id: string;
    classIds: string[]; // Changed: always use array
    title: string;

    // Category system
    category: AssignmentCategory; // 'sat' | 'midterm'
    type: AssignmentType; // 'vocabulary' | 'structure' | 'writing' | 'selection' | 'transform' | 'external_subjective'

    // Source tracking
    vocabularySource?: VocabularySource; // For vocabulary assignments
    structureSource?: StructureSource; // For structure assignments
    analysisNote?: string; // Overall analysis/summary of the passage

    // Legacy/compatibility
    classId?: string; // Deprecated: for compatibility
    studentIds?: string[]; // For individual assignments

    // Content fields
    workbookId?: string; // Link to Library Workbook
    chapterId?: string;  // Link to Library Chapter
    passage?: string; // 원본 지문 (Legacy)
    content?: string; // 원본 지문 (New)
    sentences: (string | AnalysisSentence)[]; // Modified to support rich analysis
    words?: Word[] | null; // Vocabulary list

    // Metadata
    deadline: string;
    status?: 'assigned' | 'completed' | 'passed';
    yearMonth?: string;
    targetGrade?: 'e4' | 'e5' | 'e6' | 'm1' | 'm2' | 'm3' | '1' | '2' | '3';
    vocabConfig?: {
        studyMode?: 'selection' | 'flashcard';
        failMode?: 'restart' | 'accumulate';
        testMode?: 'default' | 'reverse' | 'typing' | 'typing-ko';
    } | null;
    preCheck?: Record<string, unknown>;
    createdAt?: Date | number; // db.ts uses number in some places or Date
    order?: number; // Display order
    parentAssignmentId?: string; // Links split sub-assignments to original selection
    parentStudentId?: string; // The student this split assignment belongs to

    // Variant Problem fields (only for type='transform')
    variantConfig?: VariantConfig;
    variantProblems?: VariantProblem[];

    // Subjective Problem fields (for type='transform_subjective' | 'external_subjective')
    subjectiveConfig?: SubjectiveConfig;
    subjectiveProblems?: SubjectiveProblem[];

    // Workbook fields (only for type='workbook')
    workbookConfig?: WorkbookConfig;

    // Writing fields (only for type='writing')
    writingConfig?: {
        sessionId: number;     // writingModules session ID (1~26)
        level: 'bronze' | 'silver' | 'gold';
        targetGrade: string;   // 'e4'~'3'
        problemCount: number;  // default 5
    };

    // Listening Set fields (only for type='listening_set')
    listeningSetConfig?: ListeningSetConfig;
    listeningProblems?: ListeningProblem[];
    readingProblems?: ReadingProblem[];

    // Sentence Order fields (only for type='sentence_order')
    sentenceOrderConfig?: {
        originalSentences: string[]; // Correct order of sentences
    };
}

// Library Types
export interface Workbook {
    id: string;
    title: string;
    type: 'voca' | 'exam' | 'textbook' | 'my_class'; // 'my_class' for custom teacher folders
    coverImage?: string;
    description?: string;
    createdAt: Date | number;
    isPublic?: boolean; // If we want to share between teachers later
}

export interface Chapter {
    id: string;
    workbookId: string;
    title: string;
    content?: string;
    sentences?: string[];
    words?: Word[];
    order: number;
}

// Submission types
export type SubmissionStatus = 'pending' | 'passed' | 'failed' | 'offline_feedback' | 'pending_review' | 'approved' | 'selection_rejected';

export interface SubmissionAnswer {
    sentenceIndex: number;
    analysis: string;
}

export interface Submission {
    id: string;
    docId?: string; // From db service
    assignmentId: string;
    assignmentTitle?: string; // DB
    classId?: string; // DB
    studentId: string;
    studentName?: string; // DB

    attempt: number; // DB uses 'attempt'
    attemptNumber?: number; // Frontend alias

    /** Shape varies by assignment type (structure, vocab, selection, transform) */
    answers: any[];
    /** Polymorphic: {score, selectedIndices, ...} per assignment type */
    details?: any[];

    score: number;
    passedSentences?: number[];
    failedSentences?: number[];

    status: SubmissionStatus;

    timestamp?: number; // DB
    submittedAt: Date | number; // Shared

    isFeedbackGiven?: boolean; // DB

    // Workbook specific
    masteryLevel?: number; // 0: None, 1: Level 3 (Star), 2: Level 4 (Crown)
    completedLevels?: number[]; // [1, 2, 3, 4]

    // AI Analysis results (for structure assignments)
    aiAnalysis?: {
        sentenceIndex: number;
        studentMarks: { start: number; end: number; type: string; label?: string }[]; // Mark[] from StructureEditor
        score: number;
        feedback: string;
        correctStructure: string;
        directTranslation?: string;
    }[];
    guidanceCompleted?: boolean;
}

export interface Post {
    id: string; // docId
    docId?: string; // alias
    type: 'blog' | 'notice';
    title: string;
    content?: string; // For notices
    url?: string;     // For blog links
    imageUrl?: string; // Optional thumbnail
    createdAt: number;
    isVisible: boolean;
}


export interface Feedback {
    id: string; // docId
    docId?: string;
    studentId: string;
    studentName: string;
    content: string;
    createdAt: number;
    status: 'pending' | 'reviewed'; // optional logic
}

// Variant Problem Types (변형 문제)
export type VariantProblemType =
    | 'claim'        // 주장/요지
    | 'underline'    // 밑줄
    | 'topic'        // 주제
    | 'title'        // 제목
    | 'grammar'      // 어법
    | 'vocabulary'   // 낱말
    | 'blank'        // 빈칸
    | 'order'        // 순서
    | 'insertion'    // 삽입
    | 'flow'         // 흐름
    | 'summary'      // 요약
    | 'meaning'      // 함축 의미
    | 'special'      // SL: 지문 변형 (Special Level)
    | 'mismatch';    // 내용 불일치 (내신 26~28번, 45번 스타일)

export interface VariantProblem {
    id: string;
    type: VariantProblemType;
    question: string;           // HTML supported (밑줄, 이탤릭)
    choices: string[];          // 5 choices
    correctAnswer: number;      // 0-4
    points: number;             // 배점
    explanation?: string;       // AI generated explanation
}

export interface VariantSession {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName?: string;
    attemptNumber: number;
    answers: number[];          // Student answers
    score: number;
    incorrectProblems: number[]; // Indices of incorrect problems
    completedAt: number;
    isRetry?: boolean;          // Whether this is a retry of wrong answers
}

export interface VariantConfig {
    problemTypes: VariantProblemType[]; // Selected types (no limit)
    totalProblems: number;              // Number of problems
    passingScore?: number;              // Optional passing threshold
}

// ══════════════════════════════════════════
// 변형문제 주관식 (Transform Subjective) Types
// ══════════════════════════════════════════

export type SubjectiveProblemType =
    | 'eng_composition'         // 영작 (문법 조건 + 힌트)
    | 'sentence_interpretation'  // 해석/의미 서술
    | 'grammar_correction'       // 어법 교정 (6개중 3개 틀린것 + 이유)
    | 'blank_fill'               // 빈칸 서술 (선택지 없이 직접 작성)
    | 'pronoun_reference'        // 지칭 추론 (대명사 가리키는 대상)
    | 'summary_completion'       // 요약문 완성 (빈칸 단어 직접 작성)
    | 'sentence_transform'       // 문장 전환 (능동↔수동, 분사구문↔절 등)
    | 'korean_summary'           // 한국어 요약 (지문 전체를 한국어로 요약 서술)
    | 'english_answer';          // 영어로 답하기 (내용 이해 질문에 영어로 답변)

export interface GrammarItem {
    label: string;               // "(a)" ~ "(f)"
    underlinedText: string;      // 밑줄 친 부분
    isCorrect: boolean;          // 맞는지 틀린지
    correctForm?: string;        // 틀렸을 때 올바른 형태
    explanation?: string;        // 해설
}

export interface SubjectiveProblem {
    id: string;
    type: SubjectiveProblemType;
    instruction: string;         // 출제 지시문 (한국어)
    points: number;              // 배점

    // === 유형1: 영작 ===
    koreanMeaning?: string;      // 한글 뜻 (영작할 부분만)
    englishStart?: string;       // 문장 앞부분 (영어로 주어지는 부분)
    hintWords?: string[];        // 핵심 단어 힌트 (3~5개)
    grammarCondition?: string;   // 문법 조건 (e.g., "관계대명사 who를 사용하시오")
    originalSentence?: string;   // 원문 (채점 참고용)

    // === 유형2: 해석/의미 서술 ===
    targetSentence?: string;     // 대상 문장
    modelAnswer?: string;        // AI 생성 모범답안

    // === 유형3: 어법 교정 ===
    passageWithUnderlines?: string;  // (a)~(f) 밑줄 표시된 지문 (HTML)
    grammarItems?: GrammarItem[];

    // === 유형4: 빈칸 서술 ===
    passageWithBlank?: string;   // 빈칸 표시된 지문
    blankAnswer?: string;        // 정답 단어/구문
    blankContext?: string;       // 빈칸 주변 문맥 힌트

    // === 유형5: 지칭 추론 ===
    pronounSentence?: string;    // 문장 (대명사 밑줄)
    underlinedPronoun?: string;  // 밑줄 친 대명사
    referenceAnswer?: string;    // 가리키는 대상 (한국어)

    // === 유형6: 요약문 완성 ===
    summaryText?: string;        // "(A)...(B)..." 포함된 요약문
    blankAnswers?: { label: string; answer: string }[];

    // === 유형7: 문장 전환 ===
    originalForTransform?: string;  // 원문
    transformCondition?: string;    // 변환 조건
    transformedAnswer?: string;     // 모범 변환 답안

    // === 유형8: 한국어 요약 ===
    koreanSummaryModelAnswer?: string;  // 한국어 요약 모범답안

    // === 유형9: 영어로 답하기 ===
    comprehensionQuestion?: string;     // 내용 이해 질문 (영어)
    englishModelAnswer?: string;        // 영어 모범답안
}

export interface SubjectiveConfig {
    problemTypes: SubjectiveProblemType[];
    totalProblems: number;
}

// 학생 답안 구조
export interface SubjectiveAnswer {
    problemId: string;
    type: SubjectiveProblemType;
    textAnswer?: string;                   // 유형1,2,4,5,7 텍스트 답변
    selectedWrong?: string[];              // 유형3: 틀렸다고 선택한 라벨 ["(a)", "(c)", "(e)"]
    reasons?: Record<string, string>;      // 유형3: { "(a)": "이유...", "(c)": "이유..." }
    blankAnswers?: Record<string, string>; // 유형6: { "A": "단어", "B": "단어" }
}

// AI 채점 결과
export interface SubjectiveGradeResult {
    problemId: string;
    score: number;               // 0~100 (문제별)
    feedback: string;            // AI 피드백 (한국어)
    modelAnswer?: string;        // 모범답안
    detailedScores?: Record<string, number>;
}

// Workbook Progressive Types
export type WorkbookLevelType = 'vocab' | 'grammar' | 'unscramble' | 'writing' | 'choice' | 'mastery';

export interface WorkbookLevelData {
    type: WorkbookLevelType;
    problems: WorkbookLevelProblem[]; // Specific problem structures for each level
}

export interface WorkbookConfig {
    levels: WorkbookLevelData[];
    passage: string;
}

export interface WorkbookLevelProblem {
    sentenceIndex: number;
    original: string;
    // Level specific fields
    choices?: string[];    // For vocab/grammar: [correct, wrong]
    answer?: string;       // Correct option or full sentence
    segments?: string[];   // For unscramble
    hint?: string;         // For writing
    skeleton?: string;     // For writing: "The [ ] is [ ]."
}

// Homework Types (일일 숙제 — 카톡 과제)
export interface Homework {
    id: string;           // Firestore doc ID
    title: string;        // "4월 1일 과제" (자동생성, 수정가능)
    date: string;         // "2026-04-01" (YYYY-MM-DD)
    items: string[];      // ["교재 p.52~54", "단어 Day 7 암기", ...]
    studentIds: string[]; // 대상 학생 ID 목록
    classIds: string[];   // 대상 반 ID (필터링 보조)
    memo?: string;        // 관리자 메모
    createdAt: number;
    tenantId?: string;
    // v2: 과제방 연동 항목
    linkedAssignments?: {
        assignmentId: string;   // 과제방 assignment doc ID
        title: string;          // 표시용 제목
        classId?: string;       // 해당 과제의 classId
    }[];
}

export interface HomeworkStatus {
    id: string;           // doc ID: `${homeworkId}_${studentId}`
    homeworkId: string;
    studentId: string;
    studentName: string;
    completed: boolean;   // 관리자 수동 체크
    checkedAt?: number;
    note?: string;        // 학생별 메모
    // Phase 2: 학생 자체 완료 체크
    completedItems?: number[];   // 학생이 체크한 항목 인덱스 배열
    studentCompleted?: boolean;  // 학생 자체 전체 완료 보고
    studentCheckedAt?: number;   // 학생 마지막 체크 시간
    // v2: 과제방 자동완료 추적
    completedAssignments?: string[];  // 자동완료된 assignmentId 목록
    // v3: 관리자 개별 항목 확인
    adminConfirmedItems?: number[];   // 관리자가 확인한 오프라인 항목 인덱스
}

// Student Growth Report
export interface StudentReport {
    id: string;
    studentId: string;
    studentName: string;
    classId: string;
    yearMonth: string;       // '2026-04' format
    createdAt: number;
    updatedAt?: number;
    status: 'draft' | 'published';
    tenantId?: string;

    // Scores (0~100)
    vocabScore: number;
    grammarScore: number;
    readingScore: number;

    // Vocabulary Details
    vocab: {
        totalWordsLearned: number;      // 누적 통과 개인단어 수
        monthlyWordsLearned: number;    // 이번 달 통과 수
        avgAttemptsToPass: number;      // 100점까지 평균 시도 횟수
        firstTryPassRate: number;       // 첫 시도 통과율 (%)
        recentWords: string[];          // 최근 학습 단어 (최대 10개)
    };

    // Grammar Details
    grammar: {
        sessionsAttempted: number;      // 시도한 구문 종류 수
        sessionsPassed: number;         // 90점 이상 통과 구문 수
        avgFirstAttemptScore: number;   // 1차 시도 평균 점수
        weakSessions: { title: string; score: number }[]; // 약점 구문 (70점 미만)
        strongSessions: { title: string; score: number }[]; // 강점 구문 (90점 이상)
    };

    // Reading Details
    reading: {
        totalSubmissions: number;       // 전체 구조독해 제출 수
        withTranslation: number;        // 해석 포함 제출 수
        avgScore: number;               // 해석 포함 평균 점수
        structureOnlyCount: number;     // 기호만(내신대비) 수
        scoreHistory: { date: string; score: number; title: string }[];  // 점수 히스토리
    };

    // Growth
    growth: {
        vocabTrend: 'up' | 'stable' | 'down';
        grammarTrend: 'up' | 'stable' | 'down';
        readingTrend: 'up' | 'stable' | 'down';
        improvements: string[];    // 성장 필요 영역 (자동 추출)
    };

    // AI Summary
    aiSummary?: string;        // AI 생성 총평 (2~3문단)
}

// ══════════════════════════════════════════
// 듣기세트 (Listening Set) Types
// ══════════════════════════════════════════

/** 듣기 문제 유형 — 수능 1~17번 (2024~2025 기준) */
export type ListeningProblemType =
    | 'purpose'           // 1번: 목적 파악
    | 'opinion'           // 2번: 의견 파악
    | 'gist'              // 3번: 요지 파악 (최근 변경)
    | 'picture'           // 4번: 그림 내용 일치
    | 'task'              // 5번: 할 일 파악
    | 'calculation'       // 6번: 금액 계산
    | 'reason'            // 7번: 이유 파악
    | 'detail_mentioned'  // 8번: 언급된 것 파악
    | 'detail_match'      // 9번: 내용 일치/불일치
    | 'chart_listen'      // 10번: 도표 파악
    | 'short_response'    // 11~12번: 짧은 대화 응답
    | 'long_response'     // 13~14번: 긴 대화 응답
    | 'situation'         // 15번: 상황 파악 응답
    | 'long_set';         // 16~17번: 긴 담화 세트 (1대본 2문제, 두 번 재생)

/** 독해 문제 유형 — 실제 시험 순서 기반 */
export type ReadingProblemType =
    | 'r_purpose'           // 18번: 글의 목적
    | 'r_mood'              // 19번: 심경 변화
    | 'r_claim'             // 20번: 필자의 주장
    | 'r_chart'             // 25번: 도표 일치/불일치
    | 'r_desc_mismatch'     // 26번: 설명문 불일치
    | 'r_notice_mismatch'   // 27번: 안내문 불일치
    | 'r_notice_match'      // 28번: 안내문 일치
    | 'r_long_order'        // 43번: 장문 순서 배열
    | 'r_long_reference'    // 44번: 장문 지칭 추론
    | 'r_long_match';       // 45번: 장문 내용 일치

/** 듣기 대본 한 줄 (화자별) */
export interface ScriptLine {
    speaker: 'M' | 'W' | 'N';  // Male, Woman, Narrator(한국어 지시)
    text: string;
    lang?: 'en' | 'ko';         // N일 때만 'ko', 기본 'en'
}

/** 도표 데이터 (듣기 10번 / 독해 25번 공용) */
export interface ChartData {
    title: string;              // 도표 제목
    type: 'bar' | 'line' | 'pie' | 'table';  // 차트 유형
    labels: string[];           // X축/행 라벨
    datasets: {
        label: string;          // 범례 이름
        data: number[];         // 수치 배열
    }[];
    unit?: string;              // '%', '명', '만원' 등
    source?: string;            // 출처 (e.g. "Ministry of Education, 2024")
}

/** 듣기 문제 1개 */
export interface ListeningProblem {
    id: string;
    number: number;              // 문제 번호 1~17
    type: ListeningProblemType;
    instruction: string;         // "다음을 듣고, 남자가 하는 말의 목적으로..."
    script: ScriptLine[];        // TTS용 대본
    choices: string[];           // 5지선다
    correctAnswer: number;       // 0~4
    explanation: string;         // 해설
    points: number;              // 배점 (보통 2점)
    needsMemo?: boolean;         // 6번 계산 등 메모 필요
    gapAfterSeconds?: number;    // 다음 문제까지 대기(초)
    playTwice?: boolean;         // 16~17번: 두 번 재생
    // 4번 전용: 그림
    pictureUrl?: string;         // AI 생성 이미지 URL (Firebase Storage)
    pictureDescription?: string; // 그림 설명 (접근성 + 프롬프트용)
    pictureMarkers?: { x: number; y: number }[]; // ①~⑤ 기호 좌표 (백분율 0~100)
    // 10번 전용: 도표
    chartData?: ChartData;
    // 16~17 세트: 같은 대본을 공유하는 문제 번호
    linkedProblemId?: string;    // 세트 파트너 문제 ID
    // 사전 캐싱된 TTS 오디오 URL (Firebase Storage)
    audioUrl?: string;           // 문제별 합쳐진 오디오 (WAV base64 or download URL)
}

/** 독해 문제 1개 */
export interface ReadingProblem {
    id: string;
    number: number;              // 문제 번호 (18,19,20,25,26,27,28,43,44,45)
    type: ReadingProblemType;
    passage: string;             // 독해 지문
    question: string;            // 발문
    choices: string[];           // 5지선다
    correctAnswer: number;       // 0~4
    explanation: string;         // 해설
    points: number;              // 배점
    // 도표 (25번)
    chartData?: ChartData;
    // 문장 하이라이트용: 지문을 문장 단위로 분리
    sentences?: string[];
    // 43~45 장문: 같은 지문 공유 그룹
    longPassageGroup?: string;   // 같은 그룹 ID면 같은 지문
    paragraphs?: { label: string; text: string }[];  // (A)(B)(C)(D) 단락
    // 44번: 지칭 정보
    referenceMarkers?: { label: string; referTo: string }[];  // (a)~(e) → 누구?
}

/** 듣기세트 설정 */
export interface ListeningSetConfig {
    targetGrade: string;         // '1' | '2' | '3'
    gapBetweenProblems: number;  // 문제 간 기본 간격(초), 기본 10
    /** 독해 풀이 순서 (기본: 장문→안내문→설명문→도표→목적/심경/주장) */
    readingOrder: number[];      // [43,44,45,27,28,26,25,18,19,20]
}

/** 듣기세트 학생 답안 */
export interface ListeningSetAnswers {
    listeningAnswers: Record<number, number>;   // { 1: 2, 2: 0, ... } 문제번호→선택
    readingAnswers: Record<number, number>;     // { 18: 3, 19: 1, ... }
    highlightedSentences: Record<number, number[]>; // 문제번호→하이라이트된 문장 인덱스
    memos: Record<number, string>;              // 문제번호→메모 텍스트
    elapsedSeconds: number;                      // 총 소요 시간
}
