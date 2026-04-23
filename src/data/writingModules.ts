// 구조작문 (Structural Writing) Module Data
// 24+ sessions across 5 themes with level system

export type WritingLevel = 'bronze' | 'silver' | 'gold';

export interface WritingSession {
    id: number;
    themeId: number;
    title: string;
    titleEn: string;
    description: string;
    formula: string;
    exampleKo: string;
    exampleEn: string;
    problemCount: number;
    bidirectional: boolean; // true = needs A→B and B→A style problems
}

export interface WritingTheme {
    id: number;
    name: string;
    nameEn: string;
    color: string; // tailwind color prefix
    accentHex: string;
    icon: string; // emoji
    sessions: WritingSession[];
}

export interface LevelConfig {
    id: WritingLevel;
    name: string;
    nameKo: string;
    icon: string;
    description: string;
    hintLevel: 'full' | 'partial' | 'none';
    passScore: number;
    color: string;
}

export const LEVELS: LevelConfig[] = [
    {
        id: 'bronze',
        name: '기본',
        nameKo: '기본',
        icon: '',
        description: '핵심 단어와 구조 힌트가 제공됩니다.',
        hintLevel: 'full',
        passScore: 90,
        color: 'amber'
    },
    {
        id: 'silver',
        name: '실전',
        nameKo: '실전',
        icon: '',
        description: '핵심 단어만 제공됩니다. 구조는 직접 떠올려야 합니다.',
        hintLevel: 'partial',
        passScore: 90,
        color: 'slate'
    },
    {
        id: 'gold',
        name: '실력',
        nameKo: '실력',
        icon: '',
        description: '힌트 없이 완전한 영작을 합니다. 복합 구문도 출제됩니다.',
        hintLevel: 'none',
        passScore: 90,
        color: 'yellow'
    }
];

export type TargetGrade = 'e4' | 'e5' | 'e6' | 'm1' | 'm2' | 'm3' | '1' | '2' | '3';

export interface GradeConfig {
    value: TargetGrade;
    label: string;
    description: string;
}

export const GRADES: GradeConfig[] = [
    { value: 'e4', label: 'E4', description: '초등 4학년' },
    { value: 'e5', label: 'E5', description: '초등 5학년' },
    { value: 'e6', label: 'E6', description: '초등 6학년' },
    { value: 'm1', label: 'M1', description: '중등 1학년' },
    { value: 'm2', label: 'M2', description: '중등 2학년' },
    { value: 'm3', label: 'M3', description: '중등 3학년' },
    { value: '1', label: 'H1', description: '고등 1학년' },
    { value: '2', label: 'H2', description: '고등 2학년' },
    { value: '3', label: 'H3', description: '고등 3학년' },
];

// ============================================================
//  THEME 1: It 구문
// ============================================================
// ============================================================
const theme1Sessions: WritingSession[] = [
    {
        id: 1,
        themeId: 1,
        title: '가주어·진주어',
        titleEn: 'It ~ to-V / that (Expletive It)',
        description: '주어가 너무 길 때, It을 가짜 주어로 앞에 세우고 진짜 주어(to-V / that절)를 뒤로 보내는 구문입니다.',
        formula: 'It is + 형용사/명사 + to-V / that S + V',
        exampleKo: '새로운 언어를 배우는 것은 중요하다.',
        exampleEn: 'It is important to learn a new language.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 2,
        themeId: 1,
        title: '가목적어·진목적어',
        titleEn: 'V + it + OC + to-V (Formal Object)',
        description: '5형식 문장에서 목적어가 길 때, it을 가목적어로 두고 진목적어를 뒤로 보냅니다.',
        formula: 'S + V(make/find/think) + it + 형용사/명사 + to-V / that S + V',
        exampleKo: '나는 매일 운동하는 것을 규칙으로 삼는다.',
        exampleEn: 'I make it a rule to exercise every day.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 3,
        themeId: 1,
        title: 'It ~ that 강조구문',
        titleEn: 'It is ~ that (Cleft Sentence)',
        description: '문장에서 특정 요소를 강조하려고 It is와 that 사이에 넣는 구문입니다. 가주어 구문과 구별이 중요합니다.',
        formula: 'It is/was + 강조 대상 + that + 나머지',
        exampleKo: '바로 그녀가 그 문제를 해결했다.',
        exampleEn: 'It was she that solved the problem.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 4,
        themeId: 1,
        title: '의미상 주어',
        titleEn: 'It is ~ for/of A to-V',
        description: 'to부정사의 동작 주체를 for/of로 밝히는 구문입니다. 성격·판단 형용사 → of, 나머지 → for.',
        formula: 'It is + 형용사 + for/of + A + to-V',
        exampleKo: '네가 그렇게 말하다니 친절하구나.',
        exampleEn: 'It is kind of you to say so.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 5,
        themeId: 1,
        title: '의문사 + to부정사 / 명사절',
        titleEn: 'Wh- + to-V / Noun Clauses',
        description: '의문사 뒤에 to-V를 붙여 명사처럼 쓰거나, 의문사절을 명사절로 활용합니다.',
        formula: 'S + V + 의문사 + to-V  |  S + V + 의문사 + S + V',
        exampleKo: '나는 무엇을 해야 할지 모르겠다.',
        exampleEn: 'I don\'t know what to do.',
        problemCount: 5,
        bidirectional: false
    },
];

// ============================================================
//  THEME 2: 가정법 (서술형 킬러)
// ============================================================
const theme2Sessions: WritingSession[] = [
    {
        id: 6,
        themeId: 2,
        title: '가정법 과거',
        titleEn: 'Subjunctive Past',
        description: '현재 사실의 반대를 가정할 때 씁니다. 동사는 과거형, be동사는 were를 씁니다.',
        formula: 'If + S + V(과거) ~, S + would/could + V(원형) ~',
        exampleKo: '내가 새라면, 하늘을 날 텐데.',
        exampleEn: 'If I were a bird, I would fly in the sky.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 7,
        themeId: 2,
        title: '가정법 과거완료',
        titleEn: 'Subjunctive Past Perfect',
        description: '과거 사실의 반대를 가정할 때 씁니다. had p.p.와 would have p.p.를 씁니다.',
        formula: 'If + S + had p.p. ~, S + would/could + have p.p. ~',
        exampleKo: '네가 더 열심히 공부했더라면, 시험에 합격했을 텐데.',
        exampleEn: 'If you had studied harder, you would have passed the exam.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 8,
        themeId: 2,
        title: '혼합 가정법',
        titleEn: 'Mixed Conditionals',
        description: '과거의 일이 현재에 영향을 미치는 경우, if절은 과거완료, 주절은 would + 원형으로 씁니다.',
        formula: 'If + S + had p.p. ~, S + would + V(원형) ~ (now)',
        exampleKo: '그때 그 약을 먹었더라면, 지금 아프지 않을 텐데.',
        exampleEn: 'If I had taken the medicine then, I would not be sick now.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 9,
        themeId: 2,
        title: 'I wish / As if 가정법',
        titleEn: 'I wish / As if + Subjunctive',
        description: '현재에 대한 소망(wish + 과거), 과거에 대한 후회(wish + had p.p.), 가장(as if)을 나타냅니다.',
        formula: 'I wish + S + V(과거) / had p.p.  |  S + V + as if + S + V(과거) / had p.p.',
        exampleKo: '그녀가 여기 있었으면 좋겠다.',
        exampleEn: 'I wish she were here.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 10,
        themeId: 2,
        title: '조동사 + have p.p.',
        titleEn: 'Modal + have p.p.',
        description: '과거에 대한 후회·추측·비난을 나타냅니다. should have p.p.(했어야 했는데), must have p.p.(했음에 틀림없다) 등.',
        formula: 'S + should/must/may/can\'t + have p.p.',
        exampleKo: '너는 더 조심했어야 했다.',
        exampleEn: 'You should have been more careful.',
        problemCount: 5,
        bidirectional: false
    },
];

// ============================================================
//  THEME 3: 분사와 동명사 (문장 다듬기)
// ============================================================
const theme3Sessions: WritingSession[] = [
    {
        id: 11,
        themeId: 3,
        title: '현재분사 vs 과거분사',
        titleEn: 'Present vs Past Participle',
        description: '능동·진행의 의미면 현재분사(-ing), 수동·완료의 의미면 과거분사(-ed/p.p.)로 명사를 수식합니다.',
        formula: '명사 + V-ing (능동/진행)  |  명사 + p.p. (수동/완료)',
        exampleKo: '그 놀라운 소식이 모두를 흥분시켰다. (surprising / surprised 구별)',
        exampleEn: 'The surprising news excited everyone.',
        problemCount: 6,
        bidirectional: true
    },
    {
        id: 12,
        themeId: 3,
        title: '분사구문 (능동/수동)',
        titleEn: 'Participial Construction',
        description: '부사절을 간결하게 줄인 것입니다. 접속사와 주어를 생략하고 동사를 분사로 바꿉니다.',
        formula: 'V-ing ~, S + V ~  (능동)  |  p.p. ~, S + V ~  (수동)',
        exampleKo: '그 소식을 듣고, 그녀는 울었다.',
        exampleEn: 'Hearing the news, she cried.',
        problemCount: 6,
        bidirectional: true
    },
    {
        id: 13,
        themeId: 3,
        title: '독립 분사구문',
        titleEn: 'Absolute Participial Construction',
        description: '분사구문의 주어와 주절의 주어가 다를 때, 분사 앞에 별도 주어를 남겨두는 구문입니다.',
        formula: '명사 + V-ing/p.p. ~, S + V ~',
        exampleKo: '날씨가 좋아서, 우리는 소풍을 갔다.',
        exampleEn: 'The weather being fine, we went on a picnic.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 14,
        themeId: 3,
        title: 'with + 명사 + V-ing/p.p.',
        titleEn: 'With + O + OC (Accompaniment)',
        description: '부대상황(~한 채로, ~하면서)을 나타내는 구문입니다.',
        formula: 'with + 명사 + V-ing/p.p./형용사/전치사구',
        exampleKo: '그는 눈을 감은 채 음악을 들었다.',
        exampleEn: 'He listened to music with his eyes closed.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 15,
        themeId: 3,
        title: '동명사 관용 표현',
        titleEn: 'Gerund Idioms',
        description: '동명사를 포함한 필수 관용 표현들입니다.',
        formula: 'cannot help -ing / be used to -ing / look forward to -ing / be worth -ing / feel like -ing',
        exampleKo: '나는 그를 보자마자 웃지 않을 수 없었다.',
        exampleEn: 'I could not help laughing when I saw him.',
        problemCount: 5,
        bidirectional: false
    },
];

// ============================================================
//  THEME 4: 관계사와 접속사 (문장 확장)
// ============================================================
const theme4Sessions: WritingSession[] = [
    {
        id: 16,
        themeId: 4,
        title: '관계대명사',
        titleEn: 'Relative Pronouns (who, which, that)',
        description: '두 문장을 하나로 연결하며 명사를 수식하는 형용사절을 만듭니다.',
        formula: '선행사 + who/which/that + 불완전한 문장',
        exampleKo: '나는 파리에 살고 있는 소녀를 안다.',
        exampleEn: 'I know a girl who lives in Paris.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 17,
        themeId: 4,
        title: '관계부사',
        titleEn: 'Relative Adverbs (when, where, why, how)',
        description: '시간·장소·이유·방법을 나타내는 선행사 뒤에서 형용사절을 이끕니다. 뒤에 완전한 문장이 옵니다.',
        formula: '선행사(시/장/이/방) + when/where/why/how + 완전한 문장',
        exampleKo: '이곳이 내가 태어난 도시이다.',
        exampleEn: 'This is the city where I was born.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 18,
        themeId: 4,
        title: '관계대명사 what',
        titleEn: 'What (= the thing which)',
        description: '선행사를 포함한 관계대명사로, "~하는 것"이라는 명사절을 만듭니다.',
        formula: 'What + 불완전한 문장 = the thing(s) which ~',
        exampleKo: '네가 필요한 것은 충분한 수면이다.',
        exampleEn: 'What you need is enough sleep.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 19,
        themeId: 4,
        title: '복합관계사',
        titleEn: 'Compound Relatives (whatever, however)',
        description: 'whatever(무엇을 ~하든), however + 형/부(아무리 ~하더라도) 등 양보의 의미를 가집니다.',
        formula: 'Whatever + S + V / However + 형/부 + S + V',
        exampleKo: '아무리 바쁘더라도, 너는 운동을 해야 한다.',
        exampleEn: 'However busy you are, you should exercise.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 20,
        themeId: 4,
        title: 'so ~ that / such ~ that',
        titleEn: 'Result Clauses',
        description: '"너무 ~해서 …하다"는 결과 구문입니다. so 뒤에 형/부, such 뒤에 (a/an) + 명사가 옵니다.',
        formula: 'so + 형/부 + that + S + V  |  such + (a/an) + 명사 + that + S + V',
        exampleKo: '그 책은 너무 재미있어서 나는 밤새 읽었다.',
        exampleEn: 'The book was so interesting that I read it all night.',
        problemCount: 5,
        bidirectional: false
    },
];

// ============================================================
//  THEME 5: 도치·비교·기타 고득점 구문
// ============================================================
const theme5Sessions: WritingSession[] = [
    {
        id: 21,
        themeId: 5,
        title: '부정어 도치',
        titleEn: 'Negative Inversion',
        description: '부정어(Never, Not only, Hardly, Seldom 등)가 문두에 오면 주어와 (조)동사가 도치됩니다.',
        formula: 'Never/Not only/Hardly + (조)동사 + S + V ~',
        exampleKo: '나는 그렇게 아름다운 일몰을 본 적이 없다.',
        exampleEn: 'Never have I seen such a beautiful sunset.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 22,
        themeId: 5,
        title: 'Only + 부사구/절 도치',
        titleEn: 'Only + Adv. Inversion',
        description: 'Only + 부사(구/절)이 문두에 오면 주절이 도치됩니다.',
        formula: 'Only + 부사구/절 + (조)동사 + S + V ~',
        exampleKo: '그제서야 나는 그 진실을 깨달았다.',
        exampleEn: 'Only then did I realize the truth.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 23,
        themeId: 5,
        title: 'the 비교급, the 비교급',
        titleEn: 'The + Comparative, The + Comparative',
        description: '"~하면 할수록 더 …하다"는 비례 관계를 나타내는 구문입니다.',
        formula: 'The + 비교급 + S + V, the + 비교급 + S + V',
        exampleKo: '더 열심히 공부할수록, 더 좋은 성적을 받을 것이다.',
        exampleEn: 'The harder you study, the better grades you will get.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 24,
        themeId: 5,
        title: 'too ~ to / enough to',
        titleEn: 'Too ~ to-V / Enough to-V',
        description: '"너무 ~해서 …할 수 없다" (too) / "~할 만큼 충분히 …하다" (enough) 구문입니다.',
        formula: 'too + 형 + to-V (= so ~ that ... can\'t)  |  형 + enough + to-V',
        exampleKo: '그 상자는 너무 무거워서 들 수 없었다.',
        exampleEn: 'The box was too heavy to lift.',
        problemCount: 6,
        bidirectional: true
    },
    {
        id: 25,
        themeId: 5,
        title: 'not only A but also B / both A and B',
        titleEn: 'Correlative Conjunctions',
        description: '상관접속사 구문입니다. 병렬 구조(A와 B의 형태 일치)가 핵심입니다.',
        formula: 'not only A but (also) B  |  both A and B  |  either A or B  |  neither A nor B',
        exampleKo: '그녀는 똑똑할 뿐만 아니라 친절하기도 하다.',
        exampleEn: 'She is not only smart but also kind.',
        problemCount: 5,
        bidirectional: false
    },
    {
        id: 26,
        themeId: 5,
        title: 'It takes ~ to / used to',
        titleEn: 'It takes + Time + to-V / Used to',
        description: '"~하는 데 (시간이) 걸리다" (It takes)와 "과거에 ~하곤 했다" (used to) 구문입니다.',
        formula: 'It takes + (사람) + 시간 + to-V  |  S + used to + V(원형)',
        exampleKo: '학교에 걸어가는 데 30분이 걸린다.',
        exampleEn: 'It takes 30 minutes to walk to school.',
        problemCount: 5,
        bidirectional: false
    },
];

// ============================================================
//  THEMES ASSEMBLED
// ============================================================
export const WRITING_THEMES: WritingTheme[] = [
    {
        id: 1,
        name: 'It 구문',
        nameEn: 'It-Constructions',
        color: 'blue',
        accentHex: '#3b82f6',
        icon: '',
        sessions: theme1Sessions,
    },
    {
        id: 2,
        name: '가정법',
        nameEn: 'Subjunctive Mood',
        color: 'rose',
        accentHex: '#f43f5e',
        icon: '',
        sessions: theme2Sessions,
    },
    {
        id: 3,
        name: '분사와 동명사',
        nameEn: 'Participles & Gerunds',
        color: 'emerald',
        accentHex: '#10b981',
        icon: '',
        sessions: theme3Sessions,
    },
    {
        id: 4,
        name: '관계사와 접속사',
        nameEn: 'Relatives & Conjunctions',
        color: 'violet',
        accentHex: '#8b5cf6',
        icon: '',
        sessions: theme4Sessions,
    },
    {
        id: 5,
        name: '도치·비교·기타 고득점',
        nameEn: 'Inversion, Comparison & Advanced',
        color: 'amber',
        accentHex: '#f59e0b',
        icon: '',
        sessions: theme5Sessions,
    },
];

// Helper: get all sessions flat
export const ALL_SESSIONS: WritingSession[] = WRITING_THEMES.flatMap(t => t.sessions);

// Helper: get session by ID
export const getSessionById = (id: number): WritingSession | undefined =>
    ALL_SESSIONS.find(s => s.id === id);

// Helper: get theme by ID
export const getThemeById = (id: number): WritingTheme | undefined =>
    WRITING_THEMES.find(t => t.id === id);
