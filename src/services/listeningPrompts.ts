/**
 * 듣기세트 (Listening Set) AI 프롬프트
 * 수능/모의고사 영어 듣기평가 + 독해문제 AI 생성용
 */

import { GRADE_LABELS } from './geminiPrompts';

// ══════════════════════════════════════
// 공통 규칙
// ══════════════════════════════════════

const SCRIPT_FORMAT_RULES = `
## 대본(Script) 작성 규칙
- 화자는 반드시 M(Man/남성), W(Woman/여성), N(Narrator/한국어) 중 하나
- N은 한국어 지시문/상황 설명에만 사용 (lang: "ko")
- M과 W의 대사는 반드시 영어 (lang: "en")
- 각 script 라인: { "speaker": "M"|"W"|"N", "text": "...", "lang": "ko"|"en" }
- script 첫 번째 줄은 반드시 N이 한국어로 문제 지시문을 읽는 것
  - 예: { "speaker": "N", "text": "1번. 다음을 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.", "lang": "ko" }
- 문번호 + instruction을 하나의 문장으로 합쳐서 N이 읽음
`;

function getCommonRules(avoidTopics?: string[]): string {
    let rules = `
## 공통 규칙
- 모든 응답은 반드시 유효한 JSON으로 반환
- 선택지는 반드시 5개
- correctAnswer는 0~4 (0-indexed)
- explanation은 한국어로 상세하게
- 난이도는 실제 수능/모의고사 수준 엄수
- **대본 분량**: 최근 수능 출제 경향을 반영하여, 대본은 충분히 길고 복잡해야 합니다.
  - 독백(1,3번): 최소 10~14문장 (120~180 words)
  - 대화(2,5,6,7,8,9,11,12,13,14,15번): 최소 8~12턴 (100~160 words)
  - 긴 대화(13,14,15번): 최소 10~14턴 (150~200 words)
  - 16,17번 장문: 최소 14~18문장 (200~280 words)
- **대화 자연스러움**: 단순 정보 교환이 아니라, 갈등/고민/제안/거절/재제안 등 대화 전개가 있어야 합니다
- **어휘 수준**: 고등학교 수준 어휘 사용, 지나치게 쉬운 표현 지양
- **정답근거 출제 경향 (소프트 가이드라인)**: 각 문제 유형별 출제 경향 힌트는 실제 수능에서 자주 나타나는 패턴입니다. 대략 70~80% 정도 이 경향을 참고하되, 매번 기계적으로 동일하게 배치하지 마세요. 자연스러운 변형을 주어 학생이 패턴만으로 정답을 유추할 수 없도록 하세요.

## ★ AI 어색함 차단 (필수)
다음은 AI가 습관적으로 남발하는 비현실적 표현입니다. 절대 대본에 사용하지 마세요:
- 금지: "That's a great idea!", "That sounds wonderful!", "I completely understand.", "Absolutely!", "Great question!", "I couldn't agree more.", "That makes sense!", "Indeed!"
- 금지: 대화 첫 턴에 바로 문제/고민을 꺼내는 구조 (예: "I have a problem about...")
- 금지: 양쪽 화자가 번갈아가며 완벽하게 동의만 하는 단조로운 구조
- 권장: 자연스러운 머뭇거림("Well...", "Hmm, let me think..."), 가벼운 반론("Are you sure about that?"), 맥락에서 자연스럽게 드러나는 문제 상황
- 권장: 현실적 반응("Oh, really? I didn't know that.", "That's harder than I thought.", "I'm not sure we can do that.")
`;
    if (avoidTopics && avoidTopics.length > 0) {
        rules += `
## 중복 방지 (필수)
다음 주제/소재는 이전 회차에서 이미 사용되었으므로 반드시 피하세요:
${avoidTopics.map(t => `- ${t}`).join('\n')}
완전히 다른 주제와 배경, 등장인물, 상황을 사용하세요.
`;
    }
    return rules;
}

const TIMING_RULES = `
## 문제 간 간격 (gapAfterSeconds)
- 1~10번: 10초 (답 고르기 + 다음 지시문)
- 11~12번: 8초 (짧은 대화)
- 13~14번: 10초 (긴 대화)
- 15번: 12초 (상황 파악)
- 16~17번: playTwice=true, 1회 후 5초, 2회 후 15초
`;

// ══════════════════════════════════════
// Batch 1: 듣기 1~5번
// ══════════════════════════════════════

export function getListeningBatch1Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English listening test problem generator.
Generate 5 listening problems for problems #1 through #5.

Target Level: ${gradeDesc}

${SCRIPT_FORMAT_RULES}
${getCommonRules(avoidTopics)}

## ★ 소재/상황 다양성 가이드 (매번 다르게 - 절대 학교 행사·동아리 소재만 반복하지 말 것)

### 1번 (목적 파악) 소재 풀 — **9개 기출 전체 분류:**
**W (6/9)**: 동물 동물원/유사 관련 / 스포츠 경기 관련 / 꽃 및 식물 관련 / 학교 행정 공지 / 학교 안내 / 스마트기기 관련
**M (3/9)**: 수족관 관련 / 무대 춤/공연 관련 / 명상 및 수면 앱/케어 관련
→ M/W 없이 다양하게: 스포츠 해설 / 학교 방송 / 동물 축제 안내 / 환경 캠페인 / 지역 문화 / 브랜드 팝업 활동
→ **실제 수능 소재 (9개)**: 수족관(즉 M) / 동물(주 W) / 축구리그(W) / 꽃(주 W) / 학교 제도(W) / 댄스/공연(M) / 스마트워터(W) / 명상수면(M) / 학교행정(W)

### 2번 (의견 파악) 소재 풀 — 아래 중 무작위 선택:
- 재택근무 효율성 / 소셜 미디어 사용 제한 / 전통 시장 보존 vs 현대화
- 반려동물 공공장소 허용 / 채식 위주 급식 도입 / 자동화로 인한 직업 변화
- 지역 공원 재개발 / 디지털 교과서 전환 / 무인 점포 확산

### 3번 (요지 파악) 소재 풀 — 아래 중 무작위 선택:
- 실패 경험의 학습 가치 / 디지털 기기 없는 시간의 중요성 / 다양한 관점 수용의 필요성
- 느린 여행의 의미 / 작은 습관의 누적 효과 / 감사 표현이 관계에 미치는 영향
- 창의성 발휘를 위한 여백의 필요성 / 완벽주의의 부작용 / 지역 사회 참여의 가치

## 각 문제 유형 상세

### 1번: 목적 파악 (purpose)
- instruction: "다음을 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오." (또는 여자)
- M 또는 W가 청중에게 일방적으로 말하는 독백 형식
- 선택지: 한국어 5개 (목적 후보)
- 대본 8~10문장 (실제 수능 기준 — 너무 길게 생성하지 말 것)

- ★ 아래 3가지 포맷 중 하나를 **무작위로** 선택하여 생성:

**[Format A] 학교/공공장소 공식 안내방송** (가장 빈출)
  문장1: 인사 — "Good morning/afternoon, [청중 호칭]." 또는 "Hello, everyone at [장소]." 또는 "Visitors, may I have your attention please?"
  문장2: 자기소개 — "This is [이름], your [직함]." 또는 "This is your [직함], [이름]."
  문장3: ★ 목적 = 정답 근거 (아래 표현 중 하나 사용 — 절대 4번째로 미루지 말 것)
    - "I want to inform you that [내용]."
    - "I'd like to announce that we're looking for [모집 내용]."
    - "This announcement is to inform [청중] of [내용]."
    - "we kindly request that you [행동]."
    - "I want to ask all [그룹] to [행동]."
    - "So, I want to ask [그룹] to [행동]." (문장3이 배경이고 문장4가 목적인 경우만 허용)
  문장4~7: 이유·세부사항·일정·당부 설명
  마지막 전: ★ 목적 재반복 — "Once again, please [be aware that / keep in mind that / don't forget that] [목적 요약]." (평가원 6~9월 공통 패턴)
  마지막: "Thank you." 또는 "Thank you for your cooperation." 또는 "Sorry for the inconvenience."

**[Format B] 방송/SNS/유튜브 광고** (viewers 대상, 빈출)
  문장1: "Hello, viewers!" 또는 "Hello, viewers. It's [이름]. Welcome back to [채널/프로그램]."
  문장2: 수사적 질문 — "Are you looking for...?" / "Are you too busy to...?" / "Do you want to...?"
  문장3: 즉각 솔루션/홍보 — "Then, [제품/서비스/행사] is perfect for you." 또는 "come and join [행사명]." 또는 "[서비스명] can save you time and energy."
  문장4~7: 세부내용 (날짜, 혜택, 기능, 가격 등)
  마지막 전: CTA — "Why don't you try...?" / "Sign [them/yourself] up" / "Don't miss out on..."
  마지막: "Don't miss this great opportunity!" 또는 "Thank you for watching."

**[Format C] 매장 내 안내방송** (고객 대상, 가끔 출제)
  문장1: "Good afternoon/morning, valued customers."
  문장2: "Thank you for visiting our [매장명]."
  문장3: ★ 목적 = 정답 — "We're excited to let you know that [이벤트/할인행사]."
  문장4~7: 행사 혜택, 상품 정보, 추가 혜택 설명
  마지막 전: 재강조 — "Don't miss these great [상품] deals..." / "So, please check the event schedule."
  마지막: "As always, we're happy you're choosing to shop with us." 또는 유사 친밀한 마무리

- ★ CRITICAL 공통 규칙:
  (1) Format A/C: 반드시 세 번째(또는 네 번째) 문장에서 정답 근거 등장
  (2) Format A: "Once again, ..." 패턴으로 마지막 직전에 목적 재반복 (평가원 고빈출)
  (3) Format B: 자기소개 없이 바로 수사적 질문으로 시작 — 자기소개 넣지 말 것
  (4) 절대 금지: "Good morning, everyone. I'm happy to be here..." 식의 불필요한 인트로 늘리기

### 2번: 의견 파악 (opinion)
- instruction: "대화를 듣고, 남자의 의견으로 가장 적절한 것을 고르시오." (또는 여자)
- M/W 일상 대화, 한 사람(의견 화자)이 특정 주제/활동에 대한 의견을 표현하고 상대방이 납득하는 구조
- 선택지: 한국어 5개
- 대본 정확히 **10~12턴** (의견 화자 5~6턴, 상대방 5~6턴)

- ★ 대화 구조 (필수 - 9개 기출 공통 패턴):
  턴1: 상대방 또는 의견 화자 → 가벼운 관찰/질문/인사 (의견 없음, 상황 열기)
    예: "Hey, your workspace looks so different!" / "How's your running these days?"
    또는: 의견 화자가 제안 + "What do you think?"로 시작해 본인 의견 유도 가능
  턴2: 상대방 또는 의견 화자 → 상황 설명/맥락 제공
  턴3~4: ★ **의견 화자의 두 번째 의미 있는 발화에서 첫 의견 등장** (9개 기출 전부 이 패턴)
    - 의견 표현 실제 패턴 (아래 중 하나 사용):
      · "I think [의견]." (가장 빈출)
      · "I find that [경험 기반 의견]."
      · "As far as I know, [사실형 의견]."
      · "You know what? I think [의견]." (자연스러운 전환 포함)
      · "[사실처럼 직접 주장]." (예: "Overconsuming protein is unhealthy.")
      · "What about [제안]? That way, [이유]." (제안형)
  턴5: 상대방 → ★ 반드시 반박/의문 제기 (9개 기출 100% 이 패턴)
    - 유형: "Really? How so?" / "How could that help?" / "What if [반례]?" / 반대 의견 직접 제시
  턴6: 의견 화자 → 근거 1 제시 (종종 "But I actually..." / "Fast tempo music can..." 형태)
  턴7: 상대방 → 부분 동의 or 추가 질문 ("That sounds interesting." / "I can see that.")
  턴8: 의견 화자 → 근거 2 제시 ("Also, ..." 로 시작하는 경우 많음)
  턴9: 상대방 → 더 동의 ("I've never thought about it like that." / "That makes sense.")
  턴(마지막-1): ★ 의견 화자 → **의견 재진술** (정답 근거 두 번째 등장)
    - "So, [의견 재진술]." (Scripts 6, 5, 1 — 가장 빈출)
    - "Yeah. I'm sure [결과 예측]." (Scripts 8, 9)
    - "I do think [의견 강조]." (Script 7)
    - 공통점: 첫 의견과 동일한 핵심 주장을 다른 표현으로 restate
  마지막 턴: ★ 상대방 → **반드시 짧은 동의로 마무리** (9개 기출 100% 이 패턴)
    - "Okay. I'll try it." / "Okay. Then let's suggest it to her." / "I see. I should try it."
    - 절대 의견 화자의 발화로 끝나지 말 것

- ★ CRITICAL 규칙:
  (1) 의견 화자의 첫 의견 → "I think" 또는 사실형 주장으로 시작
  (2) 상대방은 반드시 의견에 반박/의문을 제기한 후 납득하는 흐름
  (3) 의견 화자가 "So, ..." 또는 "I'm sure ..." 로 의견을 한 번 더 재진술
  (4) 마지막 줄은 항상 상대방의 짧은 동의 (1~2문장)
  (5) 금지: 처음부터 끝까지 의견 화자와 상대방이 동의만 하는 구조 — 반드시 반박 턴 포함

### 3번: 요지 파악 (gist)
- instruction: "다음을 듣고, 남자가 하는 말의 요지로 가장 적절한 것을 고르시오." (또는 여자)
- 한 화자(M 또는 W)가 청중에게 일방적으로 말하는 독백 형식 (조언, 팁, 강연)
- 선택지: 한국어 5개
- 대본 정확히 **9~10 문장** (실제 수능 기준 — 더 길게 생성하지 말 것)

- ★ 아래 4가지 포맷 중 하나를 **무작위로** 선택:
  **[Format A] YouTube/SNS 채널** (9개 기출 중 4개 — 가장 빈출)
    문장1: "Hello, viewers! I'm [이름] and welcome back to my channel, [채널명]."
    문장2: 수사적 질문으로 문제 제시 — "Have you ever felt like...?" / "Do you ever...?"
  **[Format B] 라디오/팟캐스트**
    문장1: "Hello, listeners. This is [프로그램명]." 또는 "Hello, everyone. I'm [이름] from [프로그램]."
    문장2: 청취자의 사례 또는 일반적 문제 제시
  **[Format C] 세미나/워크샵/강연 (오프라인)**
    문장1: "Good morning/afternoon, [청중]. I'm [이름] from [소속]."
    문장2~3: 간단한 자기소개 + 문제 상황 제시 ("I've heard many of you are struggling with...")
  **[Format D] 학교 내 전문가 강연** (가끔 출제)
    문장1: "Good afternoon, students. I'm [이름], your [직책]."
    문장2: 조건부 문제 제시 ("If you become anxious when..., I have a useful tip for you.")

- ★ 대본 구조 (필수 - 9개 기출 공통 패턴):
  [인사+소개]: 1~2 문장 (포맷에 따라 다름)
  [문제 제시]: 1~2 문장 — 청중의 공통 고충, 수사적 질문, 역접("But recently...")으로 문제 설정
  [★ 전환 표현 + 요지 첫 등장]: 1~2 문장 — **3~6번째 문장 사이** (풀이법 가이드 확인)
    전환 표현 9가지 실제 패턴:
    · "If this is true for you, you need..." (조건부)
    · "But you know what? [요지]." (구어 역접)
    · "But recently,... If that's your case, [요지]." (역접+조건)
    · "However, there's one simple and effective way... [요지]." (역접+예고)
    · "Here's a tip. / I have a useful tip for you. [요지]." (직접 예고)
    · "If so, here's a simple tip... [요지]." (조건+예고)
    · "Even though [통념], I strongly believe that [요지]." (역접+강한 주장)
    · "Today, I'd like to share a helpful tip with you. [요지]." (공식 예고)
    · "If you [상황], I have a useful tip for you. [요지]." (조건+예고)
  [이유/근거]: 2~3 문장 — 예시, 메커니즘 설명, "For example, Also, Furthermore" 활용
  [★ 요지 재진술]: 1 문장 — 마지막에서 2~3번째 위치
    재진술 패턴 (아래 중 하나):
    · "So, [요지 재진술]." (가장 빈출 — Scripts 4, 5, 8)
    · "So, the next time you..., why not [요지]?" (수사적 재진술)
    · "How about / Why not [요지]?" (권유형)
    · "Next time..., try to [요지]." (행동 권고형)
    · "make sure to [요지]." (명령형 권고)
  [마무리]: 1 문장 — 매체에 맞는 outro
    · YouTube: "I hope this helps." / "Thanks for watching and don't forget to subscribe."
    · 라디오: "Stay tuned!" / "I'll be back with more tips next time!"
    · 세미나: "Give it a try and see the difference."
    · 학교: 자연스러운 마무리

- ★ CRITICAL 규칙:
  (1) "Therefore", "In conclusion", "Thus"로 시작하는 마무리 금지 — 부자연스럽고 미출제
  (2) 요지는 반드시 **해결책 형태** ("you need to...", "can help you...", "[행동]은 [효과]")
  (3) 전환 표현 없이 갑자기 요지가 나오는 것 금지 — 반드시 예고/역접 표현 선행
  (4) 요지 재진술은 "So, ..."로 시작하거나 수사적 질문/행동 권고 형태로
  (5) 스크립트 길이: 9~10 문장 (14문장 이상 생성 금지)

### 4번: 그림 내용 일치 (picture)
- instruction: "대화를 듣고, 그림에서 대화의 내용과 일치하지 않는 것을 고르시오."
- M/W가 특정 장소/사진을 보며 5가지 요소를 순서대로 묘사하는 대화
- 선택지: ① ~ ⑤ 번호 (그림 속 요소에 대응)
- 대본에서 5가지 요소를 순서대로 묘사, **1개만 그림과 불일치 → 반드시 ⑤번째(마지막) 요소**
- ★ 출제 경향: **5번째(마지막) 요소 = 정답** (9개 기출 전부 이 패턴 확인)

- ★ 대화 트리거 — 아래 2가지 중 하나 선택:
  **[Type A] 사진 공유** (4/5 — 더 빈출)
    M 또는 W가 스마트폰/사진을 보여주며 시작
    트리거 패턴: "I have a picture of [장소] on my smartphone. Do you want to see it?" / "Here's a picture of [장소]." / "I took a picture of [장소]. Come take a look!"
    → **[Pause]** 태그: 9개 기출 중 4개에만 등장 — 선택사항 (없어도 됨)
      [Pause] 사용 시 위치: 사진 보는 순간 직전 or 직후
      예: "Let me see. [Pause] Oh, look at the..." / "Yes, they do. [Pause] Here's a photo on their website."
  **[Type B] 실제 공간에서 함께 관찰** (1/5 — 가끔)
    실제로 같은 공간에 있어서 직접 묘사
    [Pause] 없음, 처음부터 자연스럽게 요소 묘사 시작
    예: "I've finished decorating this section. / I like that banner on the wall."

- ★ 장소 유형 풀 (다양하게 선택 — 매번 다른 장소, 9개 기출 전부 다른 장소 사용):
  실내: 연극/공연 무대 / 도서관·독서실 / 카페·레스토랑 / 매장 디스플레이 / 수유실·유아시설 / 교실·강의실 / 전시장
  실외: 공원·광장 / 야외 벼룩시장 / 해변·수변 공간 / 철도·기차역 박물관 / 옥상·테라스 / 캠핑장
  어린 시절 사진, 여행 사진 등 추억 공유 포맷도 가능

- ★ 요소 설명에 쓰이는 묘사 어휘 유형:
  모양: "cone-shaped", "heart-shaped", "leaf-shaped", "round", "star-shaped"
  패턴: "flower-patterned", "stripe-patterned", "star-patterned", "striped"
  수량: "two paintings", "three chairs", "three beach balls", "two flowerpots"
  위치: "under the chair", "in the left corner", "next to the box", "between the windows", "in front of the window"

- ★ 대본 구조 (필수):
  도입부 (1~2턴): 트리거 — 어디서/무엇을 보는지 간결하게 설정
    예(Type A): "I took a picture of the new reading room. Come take a look!" / "[Pause] Oh, look at the table in front of the window!"
    예(Type B): "I've finished decorating the camping gear section." / "I like that banner on the wall."
  요소 묘사 (5세트): 각 요소를 순서대로 자연스럽게 묘사 — 한 사람 언급 → 상대방 반응 or 다음 요소로 전환
    리액션 표현 (실제 기출): "It looks great!", "It's so cute!", "I love its design!", "Wow, they look great.", "It's so unique."
    추가 정보 패턴 (자연스러움 강화): "Where did you get that?" → "I bought it at a flea market." / "What's [X] for?" → "That's for [이유]."
    ⑤번 요소 자연 도입 패턴 (마지막 요소를 자연스럽게 꺼낼 때):
      "By the way, is that a [X]?" / "Oh, those [X]s look comfortable." / "Look at the [X]!"
  마무리 (1~2턴): 요소 묘사와 무관한 자연스러운 화제 전환으로 마무리
    예: "By the way, you're going to come see my play, right?" / "Why don't you bring your kids next weekend?" / "I'll definitely visit when I have the chance."

- **pictureDescription**: 그림에 들어가야 할 장면을 상세히 영어로 묘사 (이미지 생성용)
  - 예: "A café interior with a leaf-shaped mirror on the wall. A painting is hanging between two windows. Two flowerpots are on the shelf. A star-patterned tablecloth covers the table. A round rug is on the floor."
- **pictureElements** (필수): 그림 속 5개 요소를 배열로 제공 (SVG 렌더링용)
  - 예: [
      { "number": "①", "item": "Leaf-shaped mirror on wall", "position": "top-left" },
      { "number": "②", "item": "Painting between windows", "position": "top-center" },
      { "number": "③", "item": "Two flowerpots on shelf", "position": "right" },
      { "number": "④", "item": "Star-patterned tablecloth", "position": "center" },
      { "number": "⑤", "item": "Round rug on floor", "position": "bottom-center" }
    ]
  - position: "top-left" | "top-center" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom-center" | "bottom-right"
- **CRITICAL RULE**: ⑤번 요소가 대화 내용과 그림이 불일치하는 정답. 불일치 유형은 반드시 선 그림에서 시각적으로 확인 가능한 것: 수량(3개 vs 2개), 모양(round vs square), 위치(left vs right), 패턴(striped vs plain), 텍스트 레이블. 색상·시간·숫자로만 표현되는 요소는 사용 금지.
- needsMemo: false
- 대본 10~12턴

### 5번: 할 일 파악 (task)
- instruction: "대화를 듣고, 여자가 남자에게 부탁한 일로 가장 적절한 것을 고르시오."
- M/W가 행사/준비 진행 상황을 함께 점검하며, **한 명이 직접 할 일**을 마지막에 선언하는 구조
- 선택지: 한국어 5개
- 대본 정확히 **10~12턴**

- ★ 대화 구조 (필수 - 9개 기출 공통 패턴):
  **[패턴 A] D-Day 전 to-do 점검** (8/9 — 압도적 빈출)
    도입: "[Event] is just [시간] away." / "[Event] is coming up in [기간]."
    점검: "Did you [A]?" → "Yes, I already did." / "I've already [p.p.]" (완료 항목들 교차 확인)
    마지막: 아직 안 한 일 발견 → 주인공이 "I'll [동사] [목적어] [시간]." 선언
    마무리: 상대방의 짧은 긍정 ("Thanks." / "Perfect!" / "Good idea!")
  **[패턴 B] 진행 중인 이벤트에서 점검** (1/9 — 가끔)
    도입: "[Event] is going well, isn't it?"
    완료 항목 공유 → 아직 할 일 발견 → "Not yet. I'll [동사]."
    마무리: 상대방 긍정적 마무리

- ★ 이벤트 유형 풀 (다양하게 선택):
  이사 준비 / 학교 행사(체육대회·교육 프로그램) / 클럽 파티 / 워크샵·세미나 / 박물관·현장학습 / 사진대회 / 여행 패키지 준비 / 가게·이벤트 오픈 준비

- ★★ 정답 Signal 규칙 (9/9 완벽 일치 — 절대 지킬 것):
  **정답 = 주인공(M 또는 W)이 말하는 마지막 "I'll [동사]" 문장**
  실제 기출 9가지 표현 패턴:
  · "I'll do it right now." (즉시)
  · "I'll contact him this afternoon." / "I'll handle that this afternoon." (오늘 오후)
  · "I'll do it tonight." (오늘 밤)
  · "I'll bring it tomorrow." (내일)
  · "I'll make a handout about him right away." (바로)
  · "Not yet. I'll take care of it." (not yet + I'll 패턴)
  · "Not yet. I'll announce the winners..." (not yet + I'll 패턴)
  · "Not yet. I'll handle that this afternoon." (not yet + I'll 패턴 — 3/9 가장 빈출)
  · "Right. I'll do that this afternoon." (상대방 제안에 동의 후 선언)

- ★ 답 유도 패턴 (자연스러운 답 유도 방법):
  · "I almost forgot." + "I'll [할 일]." (Scripts 2, 3)
  · "Not yet. Thanks for reminding me. I'll take care of it." (Script 4)
  · 상대방 제안 → "Right. / Okay. I'll do that." (Scripts 5, 9)
  · 자연스럽게 말하다가 "Oh, it's at my [장소]. I'll bring it [시간]." (Script 6)

- ★ 오답 디스트랙터 패턴 (반드시 포함):
  (1) 이미 완료된 항목들 여러 개 언급 — "Yes, I already did." / "I've already printed them out."
  (2) 상대방(정답 아닌 사람)의 할 일이 정답 앞 또는 뒤에 하나 더 언급되는 경우 있음
  → 학생이 "아, 저게 답 아닐까?" 헷갈리게 만드는 역할

- ★ CRITICAL 규칙:
  (1) 정답 할 일은 반드시 **구체적인 단일 행동** (전화하기, 인쇄하기, 주문하기, 가져오기, 자료만들기)
  (2) "I'll [동사] [목적어]"는 대화의 **마지막 2~3번째 교환**에서 등장
  (3) 정답 선언 이후 상대방이 짧은 마무리 발화로 끝냄 ("Thanks." / "Perfect!" 등)
  (4) 정답 화자(M or W)의 마지막 "I'll"이 정답 — 중간에 나오는 "I'll"은 오답 처리됨
  (5) "부탁" 구조 (X) → 주인공이 **스스로 결정하고 선언**하는 구조 (O)

Return JSON array of 5 problems:
\\\`\\\`\\\`json
[
    {
        "number": 1,
        "type": "purpose",
        "instruction": "다음을 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.",
        "script": [
            { "speaker": "N", "text": "1번. 다음을 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.", "lang": "ko" },
            { "speaker": "M", "text": "Good morning, everyone.", "lang": "en" },
            ...
        ],
        "choices": ["한국어 선택지1", "한국어 선택지2", ...],
        "correctAnswer": 0,
        "explanation": "한국어 해설...",
        "points": 2,
        "needsMemo": false,
        "gapAfterSeconds": 10
    },
    {
        "number": 4,
        "type": "picture",
        "instruction": "대화를 듣고, 그림에서 대화의 내용과 일치하지 않는 것을 고르시오.",
        "script": [...],
        "choices": ["①", "②", "③", "④", "⑤"],
        "correctAnswer": 2,
        "explanation": "대화에서 시계가 다른 시간을 가리킨다고 했으므로 ③이 불일치",
        "points": 2,
        "needsMemo": false,
        "gapAfterSeconds": 10,
        "pictureDescription": "A detailed English description of the scene..."
    },
    ...
]
\\\`\\\`\\\`
`;
}

// ══════════════════════════════════════
// Batch 2: 듣기 6~10번
// ══════════════════════════════════════

export function getListeningBatch2Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English listening test problem generator.
Generate 5 listening problems for problems #6 through #10.

Target Level: ${gradeDesc}

${SCRIPT_FORMAT_RULES}
${getCommonRules(avoidTopics)}

## ★ 소재/상황 다양성 가이드 (매번 다르게)

### 6번 (금액 계산) 소재 풀 — 아래 중 무작위 선택:
- 온라인 강의 패키지 구매 (개인+그룹 옵션, 수량 할인)
- 캠핑 장비 대여 (품목 선택, 기간별 가격, 보험료 추가)
- 공연 티켓 예매 (좌석 등급, 패키지 할인, 수수료)
- 헬스장 등록 (월정액 vs 횟수권, 락커 추가, 첫 달 할인)
- 사진 인화 서비스 (사이즈별 단가, 수량 할인- ★★ 정답 (불일치 항목) 원리 (핵심!)：
  **선택지 1개가 실제 스크립트 내용과 다름 — 다음 3가지 방식으로 왜곡:**
  **(1) 수치 변경**: 숫자/날짜/퍼센트/기간이 살짝 다름 (가장 빈출)
      예: "Over 20 celebrities" → "10명 이상의 유명인"
          "eight weeks" → "10주"
          "six locations" → "다섯 곳"
          "children under 2" → "3세 미만"
          "two days" → "3일"
  **(2) 조건 변경**: 무료↔유료, 필수↔선택, 포함↔불포함
      예: "brochures are provided for free" → "브로셔를 유료로 구매"
          "not refundable" → "환불 가능"
          "not bring camping equipment" → "캠핑 장비 지참 필요"
  **(3) 관계/대상 변경**: A→B를 B→A로, 또는 주체 바꾸기
      예: "inform you by text message" → "이메일로 알려준다"
          "apply as a team" → "개인으로 신청 가능"�사 안내

## 각 문제 유형 상세

### 6번: 금액 계산 (calculation)
- instruction: "대화를 듣고, [여자/남자]가 지불할 금액을 고르시오." → **W 지불 6/9, M 지불 3/9**
  - W 지불: 2025 6월, 2025 9월, 2026 6월, 2026 9월, 2025 수능 등 다수
  - M 지불: 2024 6월, 2024 9월, 2026 수능
  → 생성 시 W 지불을 더 자주 선택할 것
- **[3점] 고정** (points: 3 — 항상)
- M/W 구매자가 판매자(상점/안내소)와 대화하며 최종 결제 금액을 계산하는 구조
- 선택지: 금액 5개 (영어, $ 단위) — **실제 범위: $22~$220** (회차마다 다양)
  - 소액: ["$22", "$30", "$37", "$47", "$50"] / 중액: ["$54", "$60", "$72", "$80", "$90"]
  - 고액: ["$100", "$150", "$180", "$200", "$220"]
- needsMemo: true (학생이 계산해야 함)
- 대본 정확히 **10~13턴**


- ★ 장소/소재 풀 (9개 기출 장소 — 다양하게 선택):
  음식점(샐러드바/카페) / 박물관·미술관 입장권 / 기프트샵·선물가게 / 촬영지·테마파크 / 약국·생활용품점 / 전통마을·관광지 / 청소용품점 / 반려동물용품점 / 할인마트·가전제품점
  → **"카페/마트"처럼 단순한 소재는 위 예시처럼 구체적 맥락으로 설정할 것**

- ★ 대화 구조 (필수 - 9개 기출 공통 패턴):
  도입: 판매자 환영 → 구매자 원하는 것 표현
  1차 구매 확정: 가격 안내 (tier 또는 단일가) → 구매자 수량/옵션 결정
  2차 아이템/서비스 제안: 판매자가 추가 제안 → 구매자 accept (추가구매)
  [선택적] 3번째 옵션 제안 → 구매자 DECLINE (오답 유발용 거절)
  주문 요약: "So, that's [items], right?" → 구매자 확인
  할인 적용: 할인 유형에 따라 처리 (아래 참고)
  마무리: "Here's my credit card." / "I'll pay with my credit card."

- ★ 할인 유형 풀 (랜덤하게 하나 선택 — 반드시 정확히 구현):
  **[A] 10% 비율 쿠폰** (구매자 제시): "Can I use this 10% discount coupon?" → "Yes, you can."
  **[B] 10% 자동 프로모션/행사**: "you get 10% off for our [X] promotion" / "10% discount. Today is a weekday."
  **[C] 고정액 쿠폰 ($X off)**: "Can I use a coupon?" → [Pause] "Yes, you get $[X] off the total."
  **[D] 고정액 멤버십 ($X off)**: "Can I get a member discount?" → "Sure. You'll get $[X] off your total purchase."
  **[E] 할인 없음 (거절/제외)**: 추가옵션이나 멤버십 제안을 구매자가 거절
  **[F] ★ 쿠폰 거절 (25년 수능 신경향)**: 구매자가 쿠폰 제시 → [Pause] "I'm sorry. You cannot use this coupon because it isn't valid anymore." → 정가 그대로 계산 (오답 유발 최강)

- ★★ 오답 유발 장치 (반드시 1~2개 포함):
  (1) **티어 가격 혼동**: senior($20) vs regular($30), organic($30) vs regular($20), small/medium/large
  (2) **선택지 거절**: 추가 서비스/멤버십 제안 → 구매자 "No, thank you. Just [이것만] please."
  (3) **조건 확인**: "Is it cheaper for [특정 조건]?" → "No, same price." (senior 등 특수 조건)
  (4) **쿠폰 거절**: [Pause] 후 "I'm sorry, this coupon is no longer valid." → 할인 없음
  (5) **무료 옵션 선택**: "All [X] come with [Y] for free. But you need to pay $[Z] extra for [premium Y]." → 구매자 "I'll just take the free one."

- ★ CRITICAL 계산 규칙:
  (1) 정답은 반드시 정수 금액 ($X 형태, 소수점 없음)
  (2) 선택지 5개는 $5~$10 간격으로 설정, 정답 포함
  (3) 계산이 어렵지 않아야 함: 최대 2개 아이템 × 수량 ± 할인
  (4) 정답을 JSON의 correctAnswer 필드에 정확히 반영할 것

### 7번: 이유 파악 (reason)
- instruction: "대화를 듣고, 여자/남자가 [이벤트]에 [할 수 없는/참석하지 못한] 이유를 고르시오."
- 주인공(M 또는 W)이 특정 **이벤트 불참석** 이유를 상대방에게 설명하는 대화
- 선택지: 한국어 5개
- 대본 정확히 **10~13턴**

- ★ 대화 구조 (필수 - 9개 기출 공통 패턴):
  **[구조 A] 이벤트 초대/발견 후 불참 선언** (8/9):
    도입: 상대방이 이벤트 언급/초대 → 주인공: "I wish I could, but I can't." / "I'd love to, but I can't today."
    오답 추측 세트: 상대방이 추측 → 주인공 부정 (아래 참고)
    직접 질문: "Then, why can't you...?" / "What is it then?" / "Can you tell me what's going on?"
    ★ 진짜 이유 선언 → 상대방 짧은 반응으로 마무리
  **[구조 B] 이미 불참한 사건 사후 이유 묻기** (1/9 — Script 1):
    도입: 상대방: "I didn't see you at [이벤트] yesterday."
    → 이후 구조 A와 동일

- ★ 오답 추측 세트 (핵심! — 반드시 정확히 구현):
  **[패턴 기본] 오답 2개** (7/9 — 일반):
    오답 1 추측: "Is it because [오답1]?" → 주인공: "No, [간단한 부정 + 이유]."
    오답 2 추측: "Then, is it because [오답2]?" → 주인공: "No, / Not really. [부정]."
    직접 질문 → **★ 진짜 이유**
  **[패턴 심화] 오답 3개** (2/9 — 25년 최신 트렌드):
    오답 3개를 차례로 추측 → 각각 부정 → 직접 질문 or 힌트 → 진짜 이유
    예: Script 7, 9 (25년 6월, 수능)

- ★★ 오답 부정 표현 실제 패턴 (9개 기출):
  · "No, it's not that. [부연]."
  · "No, I'm fine." / "Not at all."
  · "Not really. [설명]."
  · "No, I already [p.p.] it [시간]." (이미 완료)
  · "No, that's on [다른 날]." (날짜 불일치)
  · "It's nothing like that. I already [p.p.]."
  · "Actually, [반박 사실]." ← ★★ 25년 최신 트릭: "Actually"가 **오답 앞**에 사용됨! (Script 7)

- ★★★ 정답 Signal — "Actually" 패턴 (가장 중요):
  **5/9에서 "Actually,"로 시작하는 문장이 정답**  
  실제 사용 패턴:
  · "Actually, I have to join a science debate competition that day." (Script 2)
  · "Actually, I need to visit the police station." (Script 3)
  · "Actually, on that day I have to go to an audition for a musical." (Script 5)
  · "Actually, I'm going to see a baseball game on that day." (Script 6)
  · "Actually, I'm going to a concert with my mom." (Script 8)

  **단, "Actually"가 항상 정답은 아님 — 조심!**
  · Script 7: "Actually, I have the day off." → **오답** (M의 부정 설명)
  → 진짜 정답이 아닌 경우에도 "Actually"가 사용되는 최신 트렌드 (25년)

  기타 정답 표현:
  · "The simple truth is that I'm attending my sister's wedding that day." (Script 4)
  · "A conversation with a client took longer than I had planned." (Script 1 — 전환 없음)
  · "I promised my little brother I'd help him with his homework this afternoon." (Script 7 — 전환 없음)
  · "I have an early business meeting that overlaps with the tea club." (Script 9 — 전환 없음)

- ★ 직접 질문 표현 풀 (정답 바로 직전):
  · "Then, why couldn't you come to the [이벤트]?"
  · "What is it then?"
  · "So, why not today?"
  · "Then, why can't you participate?"
  · "So why can't you go to the [이벤트]?"
  · "Can you tell me what's going on?"
  · "Something else must have come up then." (힌트성 진술 → 주인공이 직접 답)

- ★ 이유 유형 풀 (다양하게 — 예측 불가한 것이 좋음):
  일정 충돌 (대회, 오디션, 결혼식, 야구경기, 콘서트, 비즈니스 미팅)
  예상보다 오래 걸린 약속 (클라이언트 미팅 연장)
  가족 관련 약속 (남동생 숙제, 엄마와 콘서트)
  → 학생이 예측하기 어려운, 구체적이고 독특한 이유가 좋음

- ★ 포맷:
  일반 대화: 8/9 (기본)
  **[Cell phone rings.] 전화 통화** (1/9 — 24년 6월): 도입부에 "[Cell phone rings.]" 삽입

- ★ 마무리 패턴:
  짧은 긍정적 반응 + 덕담: "I hope your team wins." / "That's awesome!" / "Have a good time there."

### 8번: 세부사항 언급 파악 (detail_mentioned)
- instruction: "대화를 듣고, [이벤트명]에 관해 언급되지 않은 것을 고르시오."
- 이벤트/행사/프로그램에 대한 세부 정보 4개는 언급, **1개만 언급 안 됨** → 정답
- 선택지: 한국어 5개 (이벤트 세부 정보 카테고리)
- 대본 정확히 **10~13턴**

- ★ 대화 유형 (9개 기출):
  **[유형 A] 가족/부부/친구 일반 대화** (7/9 — 압도적 빈출):
    한 사람이 이벤트 발견/알게 됨 → 상대방에게 소개 → Q&A로 정보 교환
    도입: "Did you hear that [이벤트]?" / "I saw a poster/flyer about [이벤트]."
  **[유형 B] 전화 통화** (2/9):
    [Cell phone rings.] = 친구 간 통화 (이벤트 소개)
    [Telephone rings.] = 공식 예약 전화 (확인/예약 과정에서 정보 수집)

- ★ 정보 유출 방식 (3가지 — 다양하게 사용):
  **[방식 1] Q&A형** (가장 많음):
    "When is it?" / "Where will it be held?" / "Is there an admission fee?" → 차례로 확인
  **[방식 2] [Pause] 검색/확인형** (3/9):
    "Let me search for more information on my phone. [Pause] Oh, it says..."
    "[Tapping sounds] Oh, the admission fee is $12 per person."
    [Pause] 이후 발견되는 정보 = 대화 중 자연스럽게 추가되는 사실
  **[방식 3] 플라이어/공지/웹사이트 같이 읽기형** (3/9):
    "Look at this / Here's the flyer." → 함께 읽으며 항목 확인
    "It says we need to... And they're only accepting..."

- ★ 선택지 정보 카테고리 풀 (9개 기출 전체 — 매번 5개 선택):
  **날짜/시간 관련**: 날짜(구체적) / 기간(시작~종료) / 시작 시간 / 모집 마감일
  **장소 관련**: 개최 장소 / 하이라이트 장소 / 전시 위치
  **비용 관련**: 입장료 / 참가비 / 등록비
  **인물 관련**: 특별 강연자 / 주요 출연자 / 후원 기관
  **혜택/보상**: 기념품 / 경품 / 특별 혜택 / 할인 쿠폰
  **신청 관련**: 신청 방법 / 등록 방법 / 참여 방법
  **프로그램**: 주요 프로그램/내용 / 수업 내용 / 특별 강연
  **제한/조건**: 금지 물품 / 자격 조건 / 참가 인원 제한
  → 매 회 다른 카테고리 5개 조합 사용 / 정답(미언급 아이템)는 ②~⑤ 범위에 배치

- ★★ 정답 (언급 안 된 항목) 배치 규칙:
  **(1) 선택지 ①번은 정답이 아님** (9개 기출 모두 동일)
      → ①번은 대화 초반에 명확히 언급되는 항목으로 배치 (확인 쉬운 정보)
  **(2) 정답은 선택지 중간~후반** (②~⑤)에 위치
  **(3) 언급 안 된 항목은 대화에서 자연스럽게 "넘어간" 것:**
    - 항목 자체가 있을 법한데 아무도 묻지 않음 (예: 시작시간, 입장료)
    - 대화에서 관련 주제가 나올 법했지만 다른 주제로 전환됨
  **(4) 언급된 4개 항목은 대화 순서대로 자연스럽게 나와야 함**

- ★ 이벤트 소재 풀 (9개 기출 + 다양하게):
  기술 전시회 / 책 사인회 / 예약 공연(연극·뮤지컬) / 독서 행사 /
  스포츠 우승 축하 행사 / 수족관 특별 이벤트 / 아트 워크샵 /
  야외 도서관 행사 / 보물찾기·레크리에이션 대회
  → 구체적인 이벤트명 (고유명사)을 instruction에 포함시킬 것

- ★ CRITICAL 규칙:
  (1) 선택지 5개의 카테고리가 대화 주제와 자연스럽게 연결되어야 함
  (2) 정답 항목은 선택지에는 적혀 있지만 대화 스크립트 어디에도 언급하지 말 것
  (3) 언급된 4개 항목은 스크립트에서 명확한 수치/사실로 제시할 것 (날짜, 가격, 장소명 등)

### 9번: 내용 일치/불일치 (detail_match)
- instruction: "다음을 듣고, [주제]에 관한 내용과 일치하지 않는 것을 고르시오."
- **★ 8번과 완전히 다른 포맷: 대화(X), 1화자 독백(monologue)만 사용**
- 5~8개 세부 사실을 나열 → 선택지 5개 중 **1개가 내용과 불일치** = 정답
- 선택지: 한국어 5개 (스크립트의 주요 사실을 각 선택지로 변환)
- 대본 **단일 단락 100~150 words** (길이가 9번 중 가장 긴 편)

- ★ 화자 유형 (9개 기출 최종 — 다양하게 선택):
  **[A] 라디오/뉴스 발표** (6/9 — 압도적 빈출):
    "Hello, listeners. [I'm [이름] from [기관].] [Are you looking for / I'm pleased to announce / I'd like to tell you about]..."
  **[B] 학교/기관 오리엔테이션** (1/9):
    "Welcome to [program]. I'm [이름], [직책]. Let me provide some general guidelines..."
  **[C] 안내방송** (1/9):
    "Attention, [passengers / visitors]. We would like to introduce..."
  **[D] 학교 안내** (1/9):
    "Good morning, students and parents. I'd like to tell you about..."

- ★ 주제/소재 풀 (9개 기출 전체):
  분실물 서비스/웹사이트 / 환경 자원봉사 행사 / 관광 워킹투어 /
  브랜드 시식 이벤트 / 호텔·기관 인턴십 오리엔테이션 /
  서커스·공연 / 야외 캠프(청소년) / 정원·꽃 축제 / 법원 견학 프로그램
  → 공통점: 구체적인 **고유명사 이름**이 지문 title에 포함됨

- ★ 세부 정보 나열 구조:
  1. 주제 소개 (1~2문장)
  2. 세부 정보 5~7개를 **자연스러운 문장 흐름**으로 나열:
     날짜/기간 / 장소 / 시간 / 가격/비용 / 참가 방법 / 특전/혜택 / 조건/자격 /
     금지사항 / 결과/채용 / 화자 소속 / 참가 인원 제한 / 제공 물품 / 후원기관
  3. 행동 촉구 마무리: "Book it now!" / "Come and join us!" / "I look forward to seeing you!"

- ★★ 정답 (불일치 항목) 원리 (핵심!):
  **선택지 1개가 실제 스크립트 내용과 다름 — 다음 3가지 방식으로 왜곡:**
  (1) **수치 변경**: 숫자/날짜/퍼센트/기간이 살짝 다름 (가장 빈출)
      예: "Over 20 celebrities" → "10명 이상의 유명인"
          "eight weeks" → "10주"
          "six locations" → "다섯 곳"
          "children under 2" → "3세 미만"
          "two days" → "3일"
  (2) **조건 변경**: 무료↔유료, 필수↔선택, 포함↔불포함
      예: "brochures are provided for free" → "브로셔를 유료로 구매"
          "not refundable" → "환불 가능"
          "not bring camping equipment" → "캠핑 장비 지참 필요"
  (3) **관계/대상 변경**: A→B를 B→A로, 또는 주체 바꾸기
      예: "inform you by text message" → "이메일로 알려준다"
          "apply as a team" → "개인으로 신청 가능"

- ★★ 정답 배치 규칙:
  **(1) 선택지 ①번은 정답이 아님** (스크립트 초반 내용 = 확인 쉬움)
  **(2) 정답은 ②~⑤ 중 하나 — 주로 중간~후반 내용**
  **(3) 불일치 항목은 반드시 스크립트에서 명확히 언급된 사실 기반으로 만들 것**
      → 애매하거나 추론해야 하는 항목을 불일치로 만들면 안 됨

- ★ 마무리 표현 풀 (9개 기출 — 반드시 감성적 행동 촉구로 끝낼 것):
  · "Join us for a breathtaking night of excitement!"
  · "Sign up today for an incredible trip to the past."
  · "Don't miss this wonderful opportunity!"
  · "Spend time in the beautiful gardens and take home special memories."
  · "I look forward to seeing you all there!"
  · "Book it now on our website!"
  · "Come and enjoy the wonderful tastes of our new doughnuts."

- ★ CRITICAL 규칙:
  (1) 독백(monologue) 포맷 — 절대 대화 형식 사용 금지
  (2) 선택지 5개는 스크립트의 실제 사실을 **한국어로 요약**한 진술로 구성
  (3) 정답 선택지는 스크립트의 해당 사실을 **위의 3가지 방식 중 하나**로 살짝 왜곡
  (4) 정답 이외 4개 선택지는 스크립트와 **완벽히 일치**해야 함
  (5) 스크립트에서 "정답이 될 사실"은 명확하게 수치/조건으로 서술할 것

### 10번: 도표 파악 (chart_listen)
- instruction: "다음 표를 보면서 대화를 듣고, [구매자]가 [구매할 상품]을 고르시오."
- M/W가 5개 옵션 비교표를 보면서 조건 **4개**를 차례로 제시해 최종 1개 선택
- **chartData** 필드에 도표 데이터를 JSON으로 제공:
  - type: "table"로 고정
  - **5개 옵션(행) × 4개 속성(열)** — 정확히 이 크기 유지
  - 선택지: ① ~ ⑤ (표의 각 행에 대응)
- needsMemo: false
- 대본 **12~16턴**

- ★ 도입 패턴 (5가지 — 다양하게 선택):
  **[A] 화면 발견형**: "What are you looking at on your tablet/laptop?" → 도움 제안
  **[B] 직접 요청형**: "Could you help me?" → M: "Sure. What do you need?" → "Let me see. There are five options on your computer."
  **[C] 전단지/포스터 발견형**: "It's a flyer from [가게명], Mom." → W: "Can you help me choose?"
  **[D] 대화 중 필요 발생형**: 일상대화 → "So, I've been looking for a [상품]. Can you help me?" → 도움 제공
  **[E] 직접 추천 요청형**: "I'm looking for a [상품]. Among these five..., which would you recommend?"

- ★★★ 핵심 구조 (9/9 완벽 일치):
  **탈락 3번 → "[두 옵션 남음 표현]" → 마지막 조건 → 최종 선택**
  
  [조건1] 탈락: 1~2개 옵션 제거
  [조건2] 탈락: 추가 1개 옵션 제거
  [조건3] 탈락: 추가 1개 옵션 제거
  → [두 옵션 남음 표현] (아래 풀 참고)
  [조건4] 최종 선택: 남은 2개 중 1개 결정 = 정답
  ※ Script 6은 "두 옵션" 명시 없이 M이 직접 추천으로 안내 (예외 1/9)

- ★ 속성(조건) 유형 풀 (9개 기출 전체):
  가격/예산(Price/Budget) - "less than $X a month" / "wouldn't spend more than $X" / "too expensive" — **8/9 등장**
  재료(Material) - "I don't recommend plastic" / "harder to wash" / "metal gets too cold"
  색상(Color) - "I don't want the same color" / "I don't like the red one"
  무게/크기(Weight/Size) - "wasn't strong enough" / "not large enough to carry equipment"
  수량(Quantity) - "at least [N]개 필요" → N개 미만 탈락 (**계산형** — Script 9)
  요일(Day) - "Mondays don't work for me"
  학년 제한(Grade) - "We're in 2nd grade, so I cannot take this one"
  디자인/외형(Design) - "look cuter" / "my nephew's favorite" / "looks old-fashioned"
  기능 유무(Yes/No Feature) - Gift Box / Phone Stand / Equipment Provided / Fingerprint / Water Resistance
  스포츠 종목(Sport Type) - "Anything but baseball"
  학습 포커스(Learning Focus) - "I need to learn a lot of new vocabulary" (**긍정적 선택형** — Script 7)
  부속품 포함(Accessory Included) - "comes with a plant growing guide" (**추천형** — Script 6)

- ★ 조건 유형 (4가지 방식):
  **[탈락형]** (가장 많음): "I don't want X" / "X is out" — 해당 항목 제거
  **[상한 탈락형]**: "not more than $X" → 상한 초과 탈락
  **[긍정 선택형]**: "I need X" → X 있는 것만 남김 (Script 7 어휘 집중)
  **[계산형]**: "아내+아들+나 = 3명 → 최소 3개 필요" → 계산 후 기준 설정 (Script 9)
  **[제3자 의견형]**: "my wife doesn't like packaging waste" → 가족/타인 취향이 결정 요인 (Script 9)

- ★ 조건 순서 규칙 (9개 기출 전체):
  **가격이 반드시 첫 번째 조건이 아님** — 순서 다양함 (8/9 가격 포함, 1/9 가격 없음)
  - Script 1 쿠키커터: Shape → Price → Material → Color
  - Script 2 스포츠: Sport → Grade → Day → Equipment (가격 없는 유일한 케이스)
  - Script 3 카트: Price → Weight → Color → Handle Material
  - Script 4 연필꽂이: Price → Material → Design → Phone Stand
  - Script 5 도어록: Price → Case Material → Color → Fingerprint
  - Script 6 씨앗키트: Price(최고가) → Plant Types(수량) → Pot Material → Guide(추천형)
  - Script 7 학습앱: Budget → Level → Focus(어휘) → Learning Material(신문)
  - Script 8 스포츠가방: Price → Size → Pockets(수량) → Water Resistance
  - Script 9 버터나이프: Price → Handle Material → Knives(계산) → Gift Box
  → 조건 순서는 chartData 속성 열 순서와 반드시 일치시킬 것

- ★ 탈락 표현 풀 (다양하게 사용):
  · "[X] is too [형용사]. So this one won't be any good."
  · "Then, I don't want to get the [X] ones."
  · "This one is out."
  · "That day doesn't work for me."
  · "[재료] gets too [문제점] in [상황]."
  · "That wasn't strong enough."

- ★ "두 옵션 남음" 표현 풀 (9개 기출 전체 — 한 가지만 선택):
  · "Then you have two options left." (Script 1)
  · "Now you have two options." (Script 2)
  · "Now, there are two options left." (Script 3)
  · "Well, you have two options left." (Script 4)
  · "Now, we're down to these two." (Script 5)
  · [생략] M이 직접 추천으로 안내 — "I think the one that... would be helpful for you." (Script 6 예외)
  · "Alright, so you have two options left that would work." (Script 7)
  · "Okay. Now, you have two options left." (Script 8)
  · "That leaves two options." (Script 9)

- ★ 최종 선택 표현 풀:
  · "Yellow is my favorite color, so I'll buy the yellow set."
  · "So I'll take this one."
  · "Then, let's get the other model. I'll order it now."
  · "I'll order it now."
  · "Sounds like a good choice. I'll order this one."

- ★ CRITICAL — chartData 설계 규칙:
  (1) 4개 탈락 조건과 chartData 속성이 **1:1 대응**되어야 함
  (2) 정답 행은 조건4 이후 유일하게 남는 옵션
  (3) datasets 순서 = 대화에서 조건 등장 순서와 일치
  (4) 탈락되는 옵션이 대화에서 명확히 제거되어야 함 (표와 대화 완벽 일치)

chartData 형식 (반드시 datasets 4개):
{
    "title": "Online English Course Options",
    "type": "table",
    "labels": ["Option A", "Option B", "Option C", "Option D", "Option E"],
    "datasets": [
        { "label": "Duration", "data": ["4 weeks", "6 weeks", "4 weeks", "8 weeks", "6 weeks"] },
        { "label": "Price", "data": ["$50", "$80", "$60", "$100", "$70"] },
        { "label": "Level", "data": ["Beginner", "Intermediate", "Beginner", "Advanced", "Intermediate"] },
        { "label": "Group Size", "data": ["5", "10", "8", "15", "10"] }
    ]
}
(Note: for table type, datasets.data can be string[] instead of number[]. datasets MUST have exactly 4 items.)

Return JSON array of 5 problems. EVERY problem MUST have ALL these fields:
- "number": integer (6, 7, 8, 9, or 10)
- "type": string
- "instruction": Korean instruction string for N to read
- "script": array of {speaker, text, lang} objects (N reads instruction first in Korean, then M/W converse)
- "choices": array of 5 strings
- "correctAnswer": 0~4
- "explanation": Korean explanation
- "points": 2
- "needsMemo": boolean
- "gapAfterSeconds": 10
- For #10: include "chartData" object

DO NOT omit any field. DO NOT return problems without choices.
`;
}

// ══════════════════════════════════════
// Batch 3: 듣기 11~15번
// ══════════════════════════════════════

export function getListeningBatch3Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English listening test problem generator.
Generate 5 listening problems for problems #11 through #15.

Target Level: ${gradeDesc}

${SCRIPT_FORMAT_RULES}
${getCommonRules(avoidTopics)}

## ★ 소재/상황 다양성 가이드 (매번 다르게)

### 11~12번 (짧은 응답) 소재 풀 — 극히 일상적이고 짧은 교환:
- 친구 간: 주말 계획 변경, 물건 빌리기, 영화 추천
- 가족 간: 저녁 메뉴 결정, 심부름 부탁, 여행 계획
- 지인 간: 모임 시간 조율, 길 안내, 분실물 문의
- 선생님-학생: 과제 확인, 자료 대출, 행사 참여
- 11번과 12번은 반드시 다른 소재와 상황을 사용할 것

### 13~14번 (긴 응답) 소재 풀 — 문제가 자연스럽게 전개되는 상황:
- 팀 프로젝트 발표 준비 중 의견 충돌 / 인턴십 지원서 작성 고민
- 부모님 선물 준비하다 예산 초과 / 친구 이사 돕느라 다른 약속 조정
- 좋아하는 수업이 시간표 충돌 / 알바 면접과 학교 행사 겹침
- 공모전 작품 주제 선정 고민 / 교환학생 지원 자격 조건 확인
- 13번과 14번은 반드시 다른 소재와 상황, 다른 성별 조합을 사용할 것

### 15번 (상황 말하기) 소재 풀 — 구체적이고 공감 가능한 상황:
- 친구가 발표 자료를 잘못 파악했을 때 / 도서관 예약 규칙을 몰랐던 친구에게
- 선생님이 과제 기간을 연장해줄 것 같을 때 / 팀원이 회의 시간을 잘못 알고 있을 때
- 공연 티켓을 대신 구해준 친구에게 감사 전달 / 길을 잃은 외국인 여행객을 돕는 상황

## 각 문제 유형 상세

### 11번: 적절한 응답 (response_short)
- instruction: "대화를 듣고, [여자/남자]의 마지막 말에 대한 [남자/여자]의 응답으로 가장 적절한 것을 고르시오."
- **★ 기본 구조: 3턴 + 빈칸 (9/9 완벽 일치)**
  화자A (1~2문장) → 화자B (1~2문장) → 화자A (1문장, 결정적) → **화자B: ________**
- 선택지: 영어 5개 (마지막 응답 후보)
- gapAfterSeconds: 8

- ★ 관계 패턴 (9개 기출 전체 — 가족 多, 비가족도 등장):
  **가족 (5/9)**: 부부 "Honey" / 부모-자녀 "Dad/Mom" / 조부모-손녀 "Grandpa"
  **친구/동료 (2/9)**: 이름으로 부름 "Jane", "Tony"
  **선생님-학생 (1/9)**: "Ms. Baker, Harry"
  **병원직원-환자 (1/9)**: 접수처 직원 - 환자 "Mr. Lee"
  → 가족이 과반(5/9)이지만 비가족도 충분히 출제됨

- ★ 도입 효과음 (선택적 사용):
  **[Cell phone rings.]**: 전화 도입 — 대화 시작 전 등장 (1/9, Script 9)
  → 전화 도입이면 W: "Hello, [이름]. I'm [상황]." 형식으로 시작

- ★ 마지막 말 유형 (7가지 — 다양하게 선택):
  **[A] 직접 제안형**: "Would you like to...?" → 수락/거절 응답
  **[B] 정보 제공+호소형**: "[사실 알림]. Oh, [상대 관심사]!" → 감정+행동 의사
  **[C] 요청형**: "Could you do X while I do Y?" / "Can you watch her until I arrive?" → 수락
  **[D] 상황 반전 정보형**: "[예상 뒤엎는 사실]." → 안도+기존 계획 유지 ★[3점]
  **[E] 수락 응답형**: "Sure, I can do that. I'm free [시간]." → 감사
  **[F] 뒤늦은 중요 정보형**: "I should have told you that [알레르기/중요사항]." → 기존 행동 변경 ★[3점]
  **[G] 이미 완료 보고형**: "Actually, I already did [요청사항], and [긍정결과]." → 칭찬+다음 행동 수락

- ★ [3점] 패턴 (3종류):
  (1) **상황 반전형 [D]**: 행동의 이유가 사라짐 → "컨퍼런스 취소 = 예약 변경 불필요"
  (2) **뒤늦게 중요 정보형 [F]**: 이미 완료된 행동에 문제 발생 → "이미 주문한 케이크 = 알레르기 성분"
  (3) **전문 상황 정보 요청형 [C]**: "The doctor said I need to... but I forgot [시간/규칙]. Could you tell me again?" → 구체적 정보 제공 응답 필요

- ★ 사운드 효과 풀 (실제 기출 3종):
  · **[Tapping sound]**: 스마트폰 앱 탭핑 — "[Let me check the app.] [Tapping sound] [결과]."
  · **[Typing sounds]**: 컴퓨터/키보드 타이핑 — "[Let me check.] [Typing sounds] [결과]."
  · **[Cell phone rings.]**: 전화 도입 — 대화 가장 앞에 단독 배치

- ★ 선택지 설계:
  정답: 대화 흐름에 자연스럽게 이어지는 것 (수락/감사/안도/정보제공/계획 변경 의사)
  오답 4개: 대화 맥락과 살짝 어긋나거나 다른 상황의 응답
  → 선택지는 짧고 자연스러운 1~2문장 영어

### 12번: 적절한 응답 (response_short2)
- 11번과 완전히 동일 형식 — **화자 성별만 반대**
- gapAfterSeconds: 8

- ★ 관계 패턴 (5개 기출):
  **가족**: 부녀 "Dad" (Script 2)
  **부부**: "Honey" (Script 5)
  **친구**: 이름 호칭 "Clark/Tina", "Andy/Lisa" (Scripts 3, 4)
  **학부모-선생님**: "Ms. Davis, Kevin's father" (Script 1)

- ★ 사운드 효과 추가 발견:
  **[Cell phone rings.]**: 전화 도입 (Script 1) — 11번과 동일
  **[Pause]**: 확인/탐색 행동 (Script 5): "Let me check. [Pause] Oh, we forgot..."
  → [Pause]는 화자가 눈으로 확인하거나 잠시 생각하는 행동을 나타냄

- ★ 마지막 말 유형 (9가지 — 11번과 겹치지 않게 선택):
  **[H] 결석/지장 통보형**: "Kevin has a fever, so I don't think he can go." → 이해+공감+절차 안내
  **[I] 조언 구하기형**: "do you think I should bring my little blanket?" → 앞 대화의 힌트 연결해서 긍정 조언
  **[J] 거절/불참 통보형**: "I'm afraid I can't make it. [이유]." → 아쉬움 표현+격려
  **[K] 대안 제안형**: "Why don't you [다른 방법]?" → 수락+감사+행동 의사
  **[L] 아이디어 제안형**: "how about making a [계획/도구]?" → 동의+실행 의사 [3점 가능]
  **[M] 걱정 해소+제안형**: "Don't worry. [해소]. So why don't we take it?" → 안도+수락
  **[N] 당부/상기형 [3점]**: "don't forget to take the medicine twice a day as the doctor said." → 이해+확인
  **[O] 위치/정보 제공형**: "You can find the key on the coffee table in our living room." → 감사+확인
  **[P] 결정 도움형 [3점]**: "only [A] has X. [추가 정보]." → 앞에서 제시한 기준+당 정보 매칭

- ★ 관계 패턴 (9개 기출 전체):
  부부: Scripts 5, 6 ("Honey")
  부녀/부자: Scripts 2, 8 ("Dad")
  어머니-아들: Script 7 ("Mom")
  친구: Scripts 3 (Clark/Tina), 4 (Andy/Lisa), 9 (Jenny/Jamie)
  학부모-선생님: Script 1 (Ms. Davis)

- ★★ 11번-12번 연계성 핵심 규칙:

  **[규칙1] 정답 근거 위치 교차 배치 (가장 중요!)**
  **[앞에 힘 실리는 유형]** — 2번째 턴이 핵심 단서, 마지막 말은 구체화:
  - [I] 조언 구하기형: 2턴에서 "warm 필요" → 3턴 W: "blanket 가져갈까?" → M이 자신의 2번째 말 연결해서 답
  - [M] 걱정 해소형: 2턴에서 "beginner라 걱정" → 3턴 W: "true beginners 대상" → 앞 걱정 해소 연결
  - [P] 결정 도움형 [3점]: 2번째 W: "direct bus 기준" → 3턴 M: "Rosemary만 있음" → 앞 기준+뒤 정보 매칭 필요

  **[뒤에 힘 실리는 유형]** — 마지막 말 자체가 핵심:
  - [H],[J],[K],[L]: 통보/거절/제안 → 마지막 말에 집중
  - [N] 당부형 [3점]: "twice a day" 등 구체적 지시 사항이 핵심
  - [O] 위치 정보형: "key on the coffee table" 등 마지막 말 전체가 핵심

  **11번 단서 위치 → 12번 권장 유형:**
  11번 마지막 말 뒷부분 집중(뒤) → 12번은 [앞에 힘] 유형 ([I],[M],[P]) 권장
  11번 마지막 말 앞부분/전체 집중(앞) → 12번은 [뒤에 힘] 유형 ([H],[J],[K],[N],[O]) 권장
  - **연속 같은 위치 금지**: 11번-12번 모두 마지막 말에만 단서 집중 X

  **[규칙2] 관계 다양성**
  - 11번이 가족이면 12번은 비가족(친구/선생님/학부모 등) 권장
  - 같은 관계 유형 연속 사용 금지

  **[규칙3] 3점 규칙**
  - 11번이 [3점]이면 12번은 2점 (역도 성립)
  - [3점]은 상황 맥락 전체 이해 또는 반전 요소 포함

  **[규칙4] 마지막 말 유형 비중복**
  - 11번의 마지막 말 유형([A]~[G])과 12번([H]~[L])이 다를 것
  - 같은 "요청형"이나 "수락형"이 연속 사용되면 난이도·맥락이 단조로워짐

  **[규칙5] 사운드 효과 비중복**
  - 11번에서 [Tapping sound] 썼으면 12번은 [Pause] 또는 효과음 없이

### 13번: 적절한 응답 - 긴 대화 (response_long)
- instruction: "대화를 듣고, [여자/남자]의 마지막 말에 대한 [남자/여자]의 응답으로 가장 적절한 것을 고르시오."
- **대화 9~12턴 + 빈칸** (9/9 범위 — Script 8이 9턴으로 최단, 최대 12턴)
- 선택지: 영어 5개
- gapAfterSeconds: 10
- **[3점] 비율: 3/9 (33%)** — 2024 수능, 2025 6월, 2025 수능
  - [2점] 비율: 6/9 — 2024 6월, 2024 9월, 2025 9월, 2026 6월, 2026 9월, 2026 수능
  - ★ **14번과 동시에 [3점] 가능** (2025 수능: 13번+14번 모두 [3점]) — 11/12번과 다름!
  - 13번이 [3점]일 경우 14번도 [3점]이 될 수 있음 (단, 드문 케이스)

- ★ 관계 패턴 (9개 기출 전체):
  **친구 (4/9 최다)**: 동년배 친구 이름 호칭 — Rachel/Kevin, Rachel/Benjamin, Diane/Dennis, Shaun/Grace
  **서비스-고객 (3/9)**: 옷수선 직원↔고객 (Script 2), 아카데미 직원↔수강신청자 (Script 5), 가구회사 직원↔고객 (Script 9)
  **가족 (1/9)**: 어머니-아들 (Script 1)
  **동료-동료 (1/9)**: 교사-교사 Mr./Ms. 호칭 (Script 4)
  → 친구+서비스 관계가 7/9 — 13번은 편안한 관계 OR 업무 관계가 주류

- ★ 도입 패턴:
  **[Cell phone rings.] (4/9 최다)**: 친구 간 전화 (Scripts 2, 4, 6, 7)
  **[Telephone rings.] (2/9)**: 고객→업체 전화 (Scripts 5, 9)
  **일반 대화 (3/9)**: 면대면 (Scripts 1, 3, 8)

- ★ 사운드 효과 풀 (13번 전용 3종):
  · [Mouse clicking sound]: 데이터/시스템 확인 중 (Script 5: W가 수강 정원 확인)
  · [Typing sound]: 직원이 고객 정보 검색 중 (Script 9: M이 주문 내역 확인)
  → [Mouse clicking sound] vs [Typing sound]: 둘 다 조회/확인이지만 표현이 다름 — 혼용하지 말 것

- ★ 대본 구조 (5/5 공통 패턴 — 갑작스러운 문제 제기 금지):
  **[1~3턴] 상황 소개/도입**: 누가 어디서 무엇을 하고/있는지 자연스럽게 제시
    예: "some former graduates came to our school" / "your pants are ready to be picked up"
  **[4~7턴] 진행 & 장애물 등장**: 흐름 속에서 장애물/한계가 2회 등장
    장애물 1: W가 일요일에 가겠다고 함 → M: "We're closed on Sundays."
    장애물 2: W: 6:30에 끝남, 조금 늦을 것 같다 → M: "It's alright. I can wait."
    ★ 장애물은 **절대 "I have a problem"으로 직접 말하지 않음** — 상황에서 자연스럽게 드러남
  **[8~10턴] 정보 좁히기/해결 탐색**: 대안을 찾거나 다음 단계를 확인하는 과정
  **[마지막 2턴] 최종 상황 → 빈칸 응답**:
    마지막 전 턴: 최종 정보/제안/감정 제공
    빈칸: 그에 대한 자연스러운 응답

- ★★★ 정답 유형 (9가지 — 기존 "해결책 제시형 O"는 틀림!)
  **(1) 행동 의사형**: "Thanks, I'll ask Mr. Scott about it." — 다음 행동 계획 제시
  **(2) 감사형**: "Thank you so much. I'll try to get there before 7." — 배려에 감사
  **(3) 격려/설득형 [★특수]**: "It's never too late to pursue your dream." — 포기/한계에 맞서 격려
  **(4) 확인 행동 의사형**: "I'll check with him and let you know." — 확인 후 답하겠다
  **(5) 계획 확인형**: "I'll register first thing on Monday." — 일정 확인 후 실행 계획
  **(6) 기뻐함+계획 확인형**: "Great! Then it should be perfect for the auction." — 확신 표현에 기뻐함
  **(7) 동의+감탄형**: "That's a great idea! Oscar will love it." — 창의적 제안에 적극 동의
  **(8) 이해+행동 의사형**: "You're right. I'll try to post more frequently." — 원칙/조언 이해 후 실행 의사
  **(9) 처리 안내형 [3점]**: "Then we'll send just the replacement part to you." — 고객 선택 확인 후 다음 단계

- ★ 마지막 말 유형 (9가지):
  **[α] 제3자 추천형**: "Mr. Scott might be able to help you find out more." → (1) 행동 의사
  **[β] 배려/안심 표현형**: "It's alright. I can wait until you arrive." → (2) 감사
  **[γ] 포기/한계 표현형 [3점]**: "I think it's too late for that." → (3) 격려/설득
  **[δ] 가능성 궁금해하기형**: "I wonder if he's available on that day." → (4) 확인 행동 의사
  **[ε] 정책/일정 안내형**: "Registration starts next Monday." → (5) 계획 확인
  **[ζ] 안심/확신 표현형**: "Not to worry. It's only been used two or three times." → (6) 기뻐함
  **[κ] 창의적 대안 제안형**: "why don't we get him a gift card for a cafe?" → (7) 동의+감탄
  **[λ] 일반 원칙 설명형**: "When people subscribe, they expect to see new content." → (8) 이해+행동 의사
  **[μ] 선택 좁히기형 [3점]**: "so I don't need a whole chair kit." → (9) 처리 안내

- ★ [3점] 특징 (3/9 해당):
  (Script 1): 전공 탐색 → 단계적 좁히기 → 마지막에 제3자 추천 → M의 수락 의사 파악 필요
  (Script 3): M의 경험(60대에 꿈 이룸) + W의 포기 → M이 경험 기반으로 격려 — 격려 내용이 M 자신의 상황과 일치해야 함
  (Script 9): M이 두 가지 옵션 제시 → W가 "전체 키트 불필요" 좁힘 → M이 올바른 선택(부품만) 확인 처리 필요

- ★ 선택지 설계 (CRITICAL):
  정답: 위 (1)~(5) 중 상황에 맞는 유형
  오답 1개: 공감만 하고 행동 없는 응답 (예: "That sounds really disappointing.")
  오답 1개: 다른 화제로 전환하는 응답
  오답 1개: 맥락상 이미 불가능하거나 어긋나는 응답
  오답 1개: 상대방의 말을 오해/왜곡한 응답
  → **"정답 = 해결책 제시형"이 아님에 주의!** 격려/감사/계획 모두 정답 가능

### 14번: 적절한 응답 - 긴 대화 (response_long2)
- instruction: "대화를 듣고, [여자/남자]의 마지막 말에 대한 [남자/여자]의 응답으로 가장 적절한 것을 고르시오."
- **대화 10~13턴 + 빈칸** (5/5 범위 — 13번보다 평균 더 긺! 최단 10턴, 최장 13턴)
- 선택지: 영어 5개
- gapAfterSeconds: 10
- [3점]: **Scripts 4, 5, 6, 7, 8, 9 — 6/9 = 67%** (14번은 [3점]이 압도적으로 많음!) / 2점: Scripts 1, 2, 3

- ★ 관계 패턴 (9개 기출 전체):
  **가족 (2/9)**: 삼촌-조카딸 Script 1 ("Uncle Louis/Claire"), 할아버지-손녀 Script 5 ("Grandpa/Kristen")
  **부부 (1/9)**: Script 2 ("Honey")
  **친구 (2/9)**: 학생회장 친구 Will/Kate Script 7, 편식 고민 친구 Jake/Anna Script 9
  **서비스-고객 (2/9)**: 서점 직원-고객 Script 3, 약국 직원-고객 Script 4
  **업무 전화 (1/9)**: 심사위원 요청자(M)↔자리(W) Script 6 (Mr. Scott / Dr. Wilson)
  **권위 관계 (1/9)**: 기숙사 사감(W)-학생(M) Script 8 (Ms. Burke / Dustin)
  → 가족+부부 = 3/9, 친구+기타 = 6/9 — 13번(친구 4/9)과 다른 분포!

- ★ 도입 패턴 (★★13번과 정반대!):
  **면대면 (6/9 압도적)**: 도입 효과음 없이 시작 (Scripts 2, 3, 4, 5, 7, 9)
  **[Cell phone rings.] (2/9)**: Scripts 1(삼촌→조카), 8(사감→학생)
  **[Telephone rings.] (1/9)**: Script 6 (심사위원 요청 업무 전화)
  → **13번 전화 6/9 ↔ 14번 면대면 6/9** — 정확히 역전! 생성 시 반드시 대조 배치

- ★ 사운드 효과 (14번 3종):
  · [Cell phone rings.]: Scripts 1, 8 (도입)
  · [Telephone rings.]: Script 6 (업무 전화 도입)
  · [Typing sound]: Script 3 (서점 직원 재고 시스템 확인) — 13번 Script 9와 동일
  → 14번은 시스템 확인 [Typing sound]만 동일, [Mouse clicking]은 없음

- ★ 14번 대본 구조 특이점 (13번과 비교):
  **[1~3턴] 일상 상황 도입**: 13번보다 더 자연스러운 일상 진입
    예: "Are you busy this weekend?" / "May I help you?" / "You seem worried."
  **[4~8턴] 주제 탐색 & 장애물**:
    Script 3: 원하는 책 품절 → 다른 지점 확인 요청 → 1권 남음but 홀드 불가
    Script 4: 안약 증상 대화 → 현재 안약 효과 있지만 미해결 → 더 강한 것 필요 → 처방 필요
    → **정보 탐색 과정이 구체적이고 단계적**
  **[마지막 2~3턴] 핵심 정보/제안 → 응답**:
    마지막 전 턴이 정답의 핵심 단서

- ★★★ 정답 유형 (9가지):
  **(1) 수락+이행 약속형**: "Of course! I'll make sure to take him for a walk every day." — 부탁 수락
  **(2) 동의+실행 계획형**: "Great! Let's look up the event details." — 함께 할 계획 수립
  **(3) 빠른 행동 의사형**: "Then I'll go straight there after work." — 제한 있지만 바로 행동
  **(4) 차선책 수용+계획형 [3점]**: "I see. Then I'll make an appointment with my doctor." — 장애물 인식 후 대안 계획
  **(5) 수락+기쁨형 [3점]**: "That sounds great! I'll join you this evening." — 함께하자는 초대에 기쁘게 수락
  **(6) 감사+기다리겠다형 [3점]**: "Thank you. I'll be waiting for your call." — 일정 확약에 감사+기다림
  **(7) 확인+수행 약속형 [3점]**: "Got it. I'll make sure to do that." — 체크리스트 완료 후 수행 확인
  **(8) 즉각 행동 의사형 [3점]**: "I'll move it right away." — 긴급 상황 인식 후 즉시 행동 (나중이 아니라 지금!)
  **(9) 동의+실행 의사형 [3점]**: "All right. I'll try it with her this weekend." — 성공 사례 듣고 실행 결심

- ★ 마지막 말 유형 (9가지):
  **[ν] 추가 요청/부탁형**: "Do you think you can take him for a walk once a day?" → (1) 수락+이행 약속
  **[ξ] 공감+제안 마무리형**: "Exactly. I think we should do it." → (2) 동의+실행 계획
  **[ο] 제한+정보 제공형**: "there's one copy left there, but unfortunately we can't hold it for you." → (3) 빠른 행동
  **[π] 처방/절차 안내형 [3점]**: "you need a prescription from a doctor." → (4) 차선책 수용+의사 방문
  **[ρ] 함께 활동 초대형 [3점]**: "Why don't you join me? You know I ride a bike every evening." → (5) 수락+기쁨
  **[σ] 구체적 일정 확약형 [3점]**: "I'll let you know by the end of the day." → (6) 감사+기다리겠다
  **[τ] 마지막 항목 추가형 [3점]**: "Just one more thing. Be sure to thank everyone for their participation." → (7) 확인+수행 약속
  **[υ] 긴급 상황 설명형 [3점]**: "a fire drill will be happening soon... problem getting through the hallways." → (8) 즉각 행동
  **[φ] 성공 사례+권유형 [3점]**: "It was a success with my son... You should do it this weekend." → (9) 동의+실행 의사

- ★ [3점] 특징 (6/9 해당 — 14번에 가장 많음 = 67%):
  **[3점] 시험**: 2024 6월, 2025 9월, 2026 6월, 2026 9월, 2026 수능, 2025 수능
  **[2점] 시험**: 2024 9월, 2024 수능, 2025 6월
  (Script 4 안약): 약함→효과 미비→강한 것 필요→처방 필요 → 전체 단계 이해 후 "의사 예약" 결심
  (Script 5 자전거): 코딩 실패+불안→자신감 부족→엔도르핀→혼자 타기 싫음→할아버지 초대 → 맥락 전체 파악 후 기쁨으로 수락
  (Script 6 심사위원): 원하지만 스케줄 충돌→먀팅 변경 여부 확인안 됨→오늘 중 알려주겠다 → 단계적 협상 파악 후 기다림
  (Script 7 학생회장): 회의 절차 몇 가지를 순서대로 이해 → "한 가지 더" 마지막 항목 (참석자 감사) 이해
  (Script 8 기숙사): "Do you mind if I move it later?" → W: "공 훈련 곳 있으니 나중엔 안 됨" → M: "지금 당장" (나중 아니라 즉시)
  (Script 9 편식): 딸 편식→함께 요리 제안→의심→필자 아들 성공 사례 제시→편식 개선 확인 → 성공사례 연결하여 실행 결심

- ★★ 13번-14번 연계성 핵심 규칙:
  **[역전 규칙1] 도입:**
  13번이 [Cell phone rings.] 사용 → 14번은 면대면(도입 없음) 우선
  13번이 면대면 → 14번은 [Cell phone rings.] 가능
  **[역전 규칙2] 관계:**
  13번이 친구 → 14번은 가족/부부 또는 서비스-고객 우선
  13번이 서비스-고객 → 14번은 가족/친구 우선
  **[역전 규칙3] 마지막 말 유형:**
  13번 [α]~[μ] 유형 사용 → 14번은 [ν]~[φ] 중 다른 유형 사용
  **[일치 규칙] 선택지 설계:**
  정답 유형 (1)~(9)는 13번과 같은 번호 유형이 연속 사용되지 않도록 할 것

### 15번: 상황에 적절한 말 (situation)
- instruction: "다음 상황 설명을 듣고, [이름A]가 [이름B]에게 할 말로 가장 적절한 것을 고르시오."
- **[3점] 8/9 — 거의 항상 [3점]!** / 2점 예외: Script 9 (Olivia→Andy, 자전거 답사)
- 선택지: 영어 5개 ([이름A]가 [이름B]에게 할 말)
- gapAfterSeconds: 12

- ★★ 해설자 성별 (CRITICAL — "N(한국어)"는 완전히 틀린 설명!):
  **M(남자)이 영어로 설명 (6/9)**: Scripts 1, 2, 3, 6, 7, 9
  **W(여자)가 영어로 설명 (3/9)**: Scripts 4, 5, 8
  → **해설자도 M 또는 W — 항상 영어로 3인칭 상황 설명!**
  → 절대 "N"이 한국어로 설명하지 않음!

- ★ 관계 패턴 (9개 기출 전체):
  **친구/학우 (4/9)**: Script 2 (Jack→Amy 동아리), Script 3 (Jake→Yuna 등산), Script 5 (Roger→Monica 친구), Script 9 (Olivia→Andy 학우)
  **가족 (3/9)**: Script 4 (Jason→Kathy 아버지-딸), Script 6 (Sophia→Jack 남매), Script 8 (Jake→Rachel 부부)
  **권위/동료 (2/9)**: Script 1 (Kate→Professor Lee 학생-교수), Script 7 (Steven→Anna 교사-교사 동료)
  → 이름: 짧고 친숙한 영어 이름 / Professor+성씨 = Script 1만

- ★ 대본 구조 (9/9 공통 패턴 — **총 8~12문장**):
  **[1~2문장] A와 B 소개**: 누구인지, 어떤 관계인지
    예: "Jake and Yuna are members of a climbing club." / "Roger and Monica are close friends."
  **[3~5문장] 배경 상황**: 어디서 무엇을 하고 있는지 구체적으로
    예: "They're visiting a national park..." / "Monica has two dogs, and one of them gave birth..."
  **[6~8문장] 문제/장애물 등장 + A의 의도**:
    예: "Jake looks at the photos and notices that the rock is not in them."
    → A의 의도 직접 서술: **"So[,] [A] wants to [ask/tell/suggest (to) B] [that/if/to] [의도]."**
    → ★★★ **"So" 패턴이 9/9 전부 등장!** — 이 문장이 정답의 핵심 근거!
    → 형식1 (쉼표O): "So, Sophia wants to suggest to Jack that..."
    → 형식2 (쉼표X): "So Jake wants to ask Yuna to..."
  **[마지막 문장] 고정 형식**:
    → "In this situation, what would [A] most likely say to [B]?" — **항상 이 형식!**
    → "So, [A] wants to say to [B]" 단독 사용 금지 — 반드시 "In this situation..." 뒤에 붙음

- ★★★ 말 유형 (9가지):
  **[a] 일정 변경 요청형 [3점]**: "Is it possible to swap my presentation date with another student?"
    → 취소가 아닌 "다른 학생과 바꾸기" 조건 필수
  **[b] 안심+일정 변경 제안형 [3점]**: "Don't worry. We can push back our meeting."
    → 안심 + 대안(날짜 변경) 동시 제시
  **[c] 조건 포함 재촬영 요청형 [3점]**: "Could you take another photo of me with the rock in the background?"
    → "바위 포함" 조건이 반드시 들어가야 정답
  **[d] 행동 요청/지시형 [3점]**: "Shake the dust off your clothes before you get in the car."
    → 차 청결 맥락 이해 + 구체적 행동 지시
  **[e] 조건부 수락형 [3점]**: "I'd love to, but I need to check with my roommate first."
    → 원하지만(개 키우고 싶음) 선행 조건(룸메이트 동의) 파악 필수
  **[f] 더 이른 시간 제안형 [3점]**: "We need to leave much earlier than 6 p.m."
    → Jack의 6시 제안 인지 + 보안줄/사진/기념품점 이유 파악 후 "훨씬 더 일찍" 제안
  **[g] 상대 의견에 추가 제안형 [3점]**: "We should also include books that students are interested in."
    → Anna의 기준(전문가 추천)은 알되, 학생 관심 도서 추가 제안
  **[h] 구체적 해결책 제안형 [3점]**: "Why don't you photograph the recipes with your cell phone?"
    → 단순 "보관해"가 아닌 "휴대폰으로 사진" 구체적 방법 포함
  **[i] 대안적 방법 제안형 (2점)**: "I think we should visit the historical sites ourselves on our bikes."
    → Andy의 인터넷 방법을 알고 + 직접 자전거 답사라는 대안 제시

- ★ [3점] 메커니즘 공통 원리:
  → **오답 = 상황의 일부만 파악한 응답**:
    Script 1 오답: "Can I skip the presentation?" (취소 vs 교환)
    Script 3 오답: "Could you take my photo again?" (바위 조건 빠짐)
    Script 5 오답: "I'd love to take the puppy!" (룸메이트 조건 빠짐)
    Script 6 오답: "We should leave at 6 p.m." (Jack의 제안 그대로 반복)
    Script 8 오답: "Keep the recipes in a safe place." (휴대폰 사진 방법 빠짐)
  → **정답 = "So, [A] wants to..." 문장에 명시된 A의 정확한 의도 전달**

- ★ 선택지 설계 (CRITICAL):
  정답: 상황 전체 맥락 + A의 의도를 **조건까지 포함하여** 정확히 전달하는 문장
  오답 1개: 상황은 비슷하지만 핵심 조건이 빠진 응답
  오답 1개: A의 상황에서 B가 할 법한 말 (화자 혼동 유발)
  오답 1개: 맥락상 과도하거나 어긋난 요청
  오답 1개: 전혀 다른 상황의 말
  → **정답은 반드시 상황에서 언급된 조건/이유가 반영되어야 함**


Return JSON array of 5 problems. EVERY problem MUST have ALL these fields:
- "number": integer (11, 12, 13, 14, or 15)
- "type": string
- "instruction": Korean instruction string for N to read
- "script": array of {speaker, text, lang} objects (N reads instruction, then dialogue, ending before the last response)
- "choices": array of 5 ENGLISH strings (the possible responses)
- "correctAnswer": 0~4
- "explanation": Korean explanation
- "points": 2
- "gapAfterSeconds": 8 for 11-12, 10 for 13-14, 12 for 15

DO NOT omit any field. DO NOT return problems without choices. All choices MUST be in English.
`;
}

// ══════════════════════════════════════
// Batch 4: 듣기 16~17번 (세트/장문)
// ══════════════════════════════════════

export function getListeningBatch4Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English listening test problem generator.
Generate 2 LONG listening problems: #16 and #17. These are played TWICE (playTwice: true).

Target Level: ${gradeDesc}

${SCRIPT_FORMAT_RULES}
${getCommonRules(avoidTopics)}
${TIMING_RULES}

## ★★★ 16~17번 유형 핵심 (9개 기출 완전 분석)

### 기본 구조
- 하나의 긴 강의 대본을 공유 (16번과 17번이 같은 대본)
- playTwice: true (두 번 재생)
- 대본: **M 또는 W가 학생들에게 강의/발표하는 독백 형식** (절대 대화 형식 금지)
- 총 분량: **15~20문장 (최소 220 words, 권장 250~280 words)**

---

### ★ 해설자 성별 (9개 기출 전체):
  **W(여자) 강의 (6/9)**: Scripts 1(곤충), 2(동물수면), 3(업사이클링), 6(미래식량), 7(탄소감축), 9(실험식물)
  **M(남자) 강의 (3/9)**: Scripts 4(사진술), 5(빠른동물), 8(인체변화)
  → **W가 압도적으로 많음(6/9)** — M은 3/9로 가끔

### ★ 인사말 패턴 (9개 기출 전체 — 4가지 변형):
  **"Hello, students."**: 6/9 — Scripts 1,2,3,4,6,9 (압도적 빈출!)
  **"Good morning, students."**: 1/9 — Script 5
  **"Good afternoon, students."**: 1/9 — Script 8
  **"Hello, everyone."**: 1/9 — Script 7 (students 없음!)
  → 기본은 "Hello, students." (6/9) / 나머지 3개는 각 1/9씩

### ★ 강의 도입 패턴 (공통):
  **[인사]** → **[주제 도입]** → **[오늘 주제 명시]**
  - 질문형: "Have you ever wondered...?" / "Do you know how...?"
  - 배경형: "As you know, [관련 배경].  So, today..."
  - 직접형: "Today, we're going to learn about..."
  - 전시 연결형 (Script 3만): "Last week, we learned about [X]. Today, I'll focus on [Y]."
  → 주제는 반드시 **인사 직후 1~3번째 문장 내**에 명확히 제시!

### ★★★ 본문 순서 표지어 (9개 기출 완전 분석):
  **표준 패턴 (7/9)**: First → Second → Next 또는 Third → Finally 또는 Lastly
  **예외 패턴 1 (Script 7 — 1/9)**:
    → **첫 번째 국가를 표지어 없이 직접 언급** → "Also" → "Next" → "Lastly"
    → "First" 없이 바로 스웨덴 사례 서술, 두 번째에 "Also" 사용
  **예외 패턴 2 (Script 8 — 1/9)**:
    → **"First of all"** ("First"가 아닌 "First of all") → Second → Third → Lastly
  ★ 세 번째 항목: "Next" 5/9 vs "Third" 4/9 (거의 반반)
  ★ 네 번째 항목: "Finally" 5/9 vs "Lastly" 4/9 (거의 반반)

### ★★★ 마무리 패턴 (9개 기출 — 3가지 유형!):
  **[A] "Now, let's watch a video[...]" (6/9)**: Scripts 1,2,3,4,5,6
    변형: "Now, let's watch a video." / "...a video clip." / "...a video showing..." / "...a video about..."
  **[B] "Now, let's look at some photos[...]" (1/9)**: Script 8만
    → "Now, let's look at some photos that illustrate these amazing changes."
  **[C] "After a short break, we'll [다음 내용]" (2/9)**: Scripts 7, 9
    → "After a short break, we'll explore the world's biggest carbon polluters."
    → "After a short break, we'll look at other plants that are good for science experiments."
  ★ 기존 "항상 video로 끝남" 규칙은 틀림! 2/9는 [C] 패턴, 1/9는 [B] 패턴

---

### 16번: 주제 파악 (long_topic)
- instruction: "다음을 듣고, [남자/여자]가 하는 말의 주제로 가장 적절한 것을 고르시오."
- 선택지: **한국어 5개** (주제 후보)
- 점수: **2점**
- 정답 근거: 강의 초반 1~3번째 문장에서 "Today, we're going to..." 또는 "Today, I'd like to talk about..." 형식으로 직접 제시
- ★ 오답 설계:
  - 오답 1개: 주제가 너무 좁은 것 (열거된 4가지 항목 중 하나만 언급)
  - 오답 1개: 주제가 너무 넓은 것 (관련 상위 분야 전체)
  - 오답 2개: 비슷한 분야지만 강의에서 다루지 않은 것

### 17번: 언급되지 않은 것 파악 (long_detail)
- instruction: "[강의 대상]에 관해 언급되지 않은 것을 고르시오." (또는 "[항목들] 중 언급되지 않은 것은?")
- 선택지: **한국어 5개** (열거된 4가지 항목 + 언급 안 된 1가지)
- 점수: **2점**
- ★★ 정답 위치 경향:
  - **①번(1번 선택지)이 정답인 경우는 극히 드뭄** — 강의 초반에 바로 언급되기 때문
  - **②~⑤번 중에서 정답** (특히 ③, ④ 빈출)
  - 정답 항목: 강의 주제와 관련되어 나올 법하지만 실제로 언급하지 않은 것
    예: 곤충 행동 강의인데 → 나비(butterfly)는 언급 안 함 (바퀴벌레/모기/개미/파리만 언급)

---

### ★ 16~17번 주제 풀 (9개 기출 완전 분류):

**[자연/생물] (기출 4/9 — 최빈출!)**: Scripts 1,2,5,9
  기출: 비 오는 날 곤충 행동 / 동물 수면 패턴 / 빠른 동물의 신체적 특징 / 과학실험용 식물
  확장: 해양 생물의 발광 / 조류 이동 패턴 / 동물 위장술 / 식충식물의 특징

**[환경/지속가능성] (기출 2/9)**: Scripts 6,7
  기출: 미래 식량 부족 대비 음식 4종 / 탄소 감축 국가 사례 4개국
  확장: 플라스틱 대안 소재 / 도시 농업 / 물 부족 해결 사례

**[기술/응용] (기출 2/9)**: Scripts 3,4
  기출: 건축에서의 업사이클링 사례 / 사진술의 실용적 활용 분야
  확장: 3D프린팅 의학 응용 / 재생에너지 기술 / AI 창작 도구

**[신체/의학] (기출 1/9)**: Script 8
  기출: 인류 역사 속 인체 부위 변화 4가지 (jaws/necks/legs/heels)
  확장: 운동이 뇌에 미치는 영향 / 수면 단계와 기능 / 면역 강화 습관

**[심리/사회/문화] (기출 0/9 — 미출제 → 새 소재 가능)**
  확장: 인지 편향 유형 / 기억 향상 방법 / 고대 문명 건축 기법 / 언어 변천사

---

### ★ 실제 기출 지문 구조 예시:

**[표준형 — Script 2: 동물 수면]** W / "Hello, students." / First→Second→Next→Finally / "video clip"
  [인사] "Hello, students. As you know, sleep is common to all animals..."
  [주제] "Today, we'll learn what makes animals sleep differently."
  [First] "First, what animals eat ... Elephants sleep only three to four hours a day."
  [Second] "Second, temperature ... bats sleep during the day to avoid overheating."
  [Next] "Next, another factor is the fear ... sheep generally sleep closely together."
  [Finally] "Finally, the living environment. ... flamingos sleep standing up."
  [마무리] "Now, let's watch a video clip."

**[예외형A — Script 7: 탄소감축]** W / "Hello, everyone." / (없음)→Also→Next→Lastly / "After a short break"
  [인사] "Hello, everyone. Today, we'll start by discussing how different countries..."
  [1번째] (First 없이) "...Sweden was the first country to introduce carbon pricing..."
  [Also] "Also, Denmark is working to source at least half of its energy needs from renewables..."
  [Next] "Next, Hungary plans to generate 90% of its energy from carbon-free sources..."
  [Lastly] "Lastly, France is aiming to achieve a net zero carbon economy by 2050..."
  [마무리] "After a short break, we'll explore the world's biggest carbon polluters."

**[예외형B — Script 8: 인체변화]** M / "Good afternoon, students." / "First of all"→Second→Third→Lastly / "look at photos"
  [인사] "Good afternoon, students. Have you ever wondered why our bodies are the way they are?"
  [주제] "Today, we're going to learn about the changes in the human body over the history of humans."
  [First of all] "First of all, human jaws gradually became smaller..."
  [Second] "Second, human necks got thinner..."
  [Third] "Third, human legs got longer..."
  [Lastly] "Lastly, human heels became thicker..."
  [마무리] "Now, let's look at some photos that illustrate these amazing changes."


Return JSON array of 2 problems:
\`\`\`json
[
    {
        "number": 16,
        "type": "long_topic",
        "instruction": "다음을 듣고, [남자/여자]가 하는 말의 주제로 가장 적절한 것을 고르시오.",
        "script": [
            { "speaker": "N", "text": "16번과 17번은 두 번 들려줍니다.", "lang": "ko" },
            { "speaker": "N", "text": "16번. 다음을 듣고, 남자가 하는 말의 주제로 가장 적절한 것을 고르시오.", "lang": "ko" },
            { "speaker": "M", "text": "Hello, students. [15~20문장 강의 전체 — First/Second/Next/Finally 4항목 + Now, let's watch a video.로 마무리]", "lang": "en" }
        ],
        "choices": [
            "features that allow certain animals to achieve high speeds",
            "effects of environmental changes on animal behaviors",
            "the behavior of various insects on a rainy day (정답 예시)",
            "survival strategies of endangered animals",
            "hunting patterns of animals genetically close to humans"
        ],
        "correctAnswer": 2,
        "explanation": "강의 초반 'Today, ...' 문장에서 주제가 명확히 제시됨.",
        "points": 2,
        "playTwice": true,
        "gapAfterSeconds": 10,
        "linkedProblemId": "prob_17"
    },
    {
        "number": 17,
        "type": "long_detail",
        "instruction": "언급된 [동물/나라/신체부위/식물/분야] 중 아닌 것은?",
        "script": [],
        "choices": ["cheetah", "iguana (정답 예시 — 영어 단어)", "falcon", "swordfish", "dragonfly"],
        "correctAnswer": 1,
        "explanation": "강의에서 cheetah, falcon, swordfish, dragonfly는 언급됨. iguana는 언급되지 않음.",
        "points": 2,
        "playTwice": true,
        "gapAfterSeconds": 10,
        "linkedProblemId": "prob_16"
    }
]
\`\`\`

CRITICAL RULES:
1. 강의 본문에 **정확히 4개 항목**만 열거 (First/Second/Next or Third/Finally or Lastly)
2. 마무리는 3가지 중 하나 (6/9 → "Now, let's watch a video..." / 1/9 → "Now, let's look at some photos..." / 2/9 → "After a short break, we'll...")
3. **16번 선택지: 반드시 영어 표현 5개** (한국어 절대 금지!)
   예: "the behavior of various insects on a rainy day" / "practical use of photography in various fields"
4. **17번 선택지: 반드시 영어 단어 5개** (동물명 / 나라명 / 신체부위명 / 식물명 / 분야명 등)
   예: ["cheetah", "falcon", "iguana", "swordfish", "dragonfly"]
5. **17번 instruction 형식**: "언급된 [카테고리] 중 아닌 것은?"
   - 동물이면: "언급된 동물이 아닌 것은?" / "언급된 곤충이 아닌 것은?"
   - 나라면: "언급된 나라가 아닌 것은?"
   - 신체부위면: "언급된 신체 부위가 아닌 것은?"
   - 식물이면: "언급된 식물이 아닌 것은?"
   - 분야면: "언급된 분야가 아닌 것은?"
6. 17번 정답은 ①번(0번 인덱스)이 되지 않도록 할 것
7. 16번과 17번 script는 반드시 동일 대본 공유 (17번 script는 빈 배열 [] 허용)
`;
}

// ══════════════════════════════════════
// Batch 5: 독해 18~20번
// ══════════════════════════════════════

export function getReadingBatch5Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English reading comprehension problem generator.
Generate 3 reading problems: #18, #19, #20. Each has its OWN SEPARATE passage.

Target Level: ${gradeDesc}

${getCommonRules(avoidTopics)}

## 각 문제 유형 상세

### 18번: 글의 목적 (r_purpose)
- instruction: "다음 글의 목적으로 가장 적절한 것을 고르시오."
- 선택지: 한국어 5개 (글을 쓴 목적 — "~하려고" 형식)
- sentences: 지문을 문장 단위로 분리한 string 배열

- ★ 형식 분류 (9개 기출 전체):
  **[편지/이메일] (7/9)**: "Dear [수신자]," 또는 "Dear [직함]," 시작 / Sincerely, [이름] [직함] 마무리
    예: Dear Valued Members, / Dear Rosydale City Marathon Racers, / Dear Students,
  **[SNS/유튜브 포스트] (2/9)**: "Hello, everyone!" / "@[닉네임]" 형태, 서명 없음
    예: 2025 6월(Toon Skills Company 블로그), 2026 수능(Ethan 유튜브 채널)

- ★ 지문 구조 (9/9 공통 — 2/3지점 목적 표현 등장):
  **[1~2문장] 자기소개·배경**: 발신자 소개, 글을 쓰게 된 배경, 상황 설명
    예: "My name is Danielle Hamilton, and I am the principal of Techville High School."
    예: "I recently visited the Lambsford History Foundation's exhibition about the Qukkon Gold Rush."
  **[중간] 2/3지점**: ★ 목적 표현 등장 (아래 표현 중 하나 반드시 사용)
    **핵심 최다빈출**: "would like to [동사원형]" (9개 기출 중 가장 자주 등장)
    **기타 빈출**:
    · "I am writing to [inform/request/invite/ask/encourage/announce]"
    · "we are asking for [volunteers/support/participation]"
    · "(please) let me know / request / want / ask / need / offer / hope / inform / urge"
    · "I would be grateful if you could [행동]"
    · 인과/역접 연결사 후: "therefore, thus, but, however" 뒤에 목적 서술
    · 명령문 형식: "Please [행동]."
    · 의문문 형식: "Could you [행동]?"
  **[마지막] 마무리**: 감사, 기대, 행동 촉구 + 서명

- ★ 선지 설계 원칙:
  (1) 정답 선지: 목적 표현에 사용된 핵심 단어를 그대로 포함 (세부내용 해석 불필요)
      예: "would like to invite" → 선지: "행사에 초대하려고"
  (2) 오답 선지: 지문에 언급된 세부 정보를 목적처럼 보이도록 변형
  (3) "~하려고" 형식 5개 모두 동일

- ★ 소재 풀 (9개 기출 전체):
  크루즈 충성고객 할인 프로모션 / 학교 앞 도로공사 교통봉사 요청 /
  공원 재개장 행사 초대 / 웹툰 온라인 강좌 홍보 / 동아리 개설 제안서 요청 /
  마라톤 취소 공지 / 자원봉사 가이드 문의 / 유튜브 댓글 자제 요청 / 강의실 변경 안내
  → 확장: 공공기관 공지 / 지역 행사 초대 / 후원 요청 / 정책 변경 안내 등

### 19번: 심경 변화 (r_mood)
- instruction: "다음 글에 드러난 [이름]의 심경 변화로 가장 적절한 것은?"
  (또는 "다음 글에 드러난 'I'의 심경 변화로 가장 적절한 것은?")
- 지문: 3인칭 또는 1인칭 서사 (180~220 words)
- 선택지: 영어 5개 (감정A → 감정B 형식)

- ★ 심경 변화 방향 (9개 기출 전체):
  **[부정 → 긍정] (7/9 압도적)**: anxious→relieved / worried→relieved / nervous→relieved /
    confused→pleased / disappointed→excited / disappointed→thrilled / frustrated→grateful
  **[긍정 → 부정] (2/9)**: confident→disappointed / relaxed→indifferent(부정)
  → **생성 시 부정→긍정을 기본으로, 70%에 해당**

- ★ 지문 구조 (9/9 공통):
  **[전반부]** 첫 번째 심경 표현 → 부정적 상황 묘사
  **[전환점]** 중간 어느 지점에서 상황 반전 (예상치 못한 사건/정보)
    전환 마커: "Just then," / "Suddenly," / "All of a sudden," / "To her/his surprise,"
  **[후반부]** 두 번째 심경 표현 → 긍정적 결말

- ★ 빈출 심경 표현 마커 (이 단어들로 심경 위치 파악):
  **물리적 반응**: felt, heart (beat fast/sink/race), breath, sweat, smile, sigh, tears
  **인지 반응**: realized, noticed, thought, wondered, couldn't believe
  → 지문에 이 단어들을 **반드시 2회 이상** 자연스럽게 포함

- ★ 선지 설계 (9개 기출 패턴):
  **정답 위치**: ① 5/9 최다 / ② 1/9 / ③ 2/9 / ④이하 1/9
  → 정답을 ①에 배치하는 경우가 가장 많지만, ②~③도 자주 사용
  **감정 단어 풀**:
  · 부정: anxious, worried, nervous, confused, frustrated, disappointed, angry, bored, jealous, embarrassed, indifferent
  · 긍정: relieved, delighted, pleased, excited, thrilled, calm, hopeful, grateful, joyful, satisfied, amazed
  **오답 설계**: 나머지 4개는 긍정(+)/부정(-) 방향이 정답과 같거나 반대가 섞이도록
    예: 정답 긍정→긍정→X / 오답에 부정→부정, 긍정→부정 섞기

- ★ 소재 풀 (9개 기출):
  공항 탑승 긴박 상황 / 여행 취소 후 반전 / 차 수리비 걱정 후 안도 /
  첫 출근 버스 위기 / 고향 방문 후 추억 장소 발견 / 레스토랑 예약 실패 /
  낚시 끝에 대어 포획 / 과학 프로젝트 위기 후 해결 / 교수에게 칭찬 받는 순간

### 20번: 필자의 주장 (r_claim)
- instruction: "다음 글에서 필자가 주장하는 바로 가장 적절한 것을 고르시오."
- 지문: 비문학 학술적 주장/의견 글 (150~200 words)
- 선택지: 한국어 5개 — **전부 "~해야 한다" / "~이 중요하다" / "~이 필요하다" 형식**

- ★ 지문 구조 (9개 기출 기반):
  **[첫 1~2문장]**: 통념/현상 제시 또는 문제 상황 도입
    예: "We almost universally accept that playing video games is at best a pleasant break."
  **[중간]**: 역접 연결사 + 반론 or 구체적 근거/예시 전개
    역접 마커: "However," / "But," / "Yet," / "Nevertheless,"
    예시 마커: "For example," / "For instance," / "Consider" → 이 부분은 가볍게 처리
  **[마지막 1~2문장]**: ★ 핵심 주장 (최근 트렌드: 마지막 문장에 정답 근거 집중)
    · 금지 표현: "Therefore,", "Thus,", "Hence,", "In conclusion,", "As a result,"
    · 자연스러운 마무리 (서술형으로 주장 녹이기):
      "What truly matters is..." / "The key lies in..." / "It is [adj] that we..."
    · **This, That 대명사 등장 시**: 반드시 앞 문장과 연결되도록 서술
      (이를 통해 마지막 문장만으로 답을 바로 고를 수 없는 구조 만들기)
    · 마지막 문장 핵심 어휘 2~3개가 정답 선지에 포함되어야 함

- ★ 선지 설계:
  정답: 지문 전체 주장을 한국어로 의역 ("~해야 한다" 형식)
  오답 4개: 지문 속 단어를 교묘하게 사용하되 의미 왜곡
    오답 패턴: ① 지엽적 세부내용 → 주장처럼 보이게 / ② 방향 반전 / ③ 과도한 일반화

- ★ 소재 풀 (9개 기출):
  소셜미디어 팩트체킹 책임 / 교육 게임 개발 / 기업 문화 명확한 기준 /
  전문화의 장단점과 크로스도메인 / 교사-학생 관계 접근 / 걱정 습관 관리 /
  현대 음악가의 언어 기여 인정 / 기업 행동과 직원 교육 / 드라마/스토리텔링 영향

Return JSON array of 3 problems with fields: number, type, passage, question, choices, correctAnswer, explanation, points, sentences.

CRITICAL RULES:
- Every problem MUST include "passage" (the full English text, 150~220 words minimum)
- Every problem MUST include "question" (Korean instruction text)
- Every problem MUST include "sentences" (passage split by sentences)
- The passage must be substantial and realistic, NOT placeholder text
`;
}

// ══════════════════════════════════════
// Batch 6: 독해 25~28번 (도표/안내문)
// ══════════════════════════════════════

export function getReadingBatch6Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English reading comprehension problem generator.
Generate 4 reading problems: #25 (chart), #26 (person description), #27 (notice mismatch), #28 (notice match).

Target Level: ${gradeDesc}

${getCommonRules(avoidTopics)}

## 각 문제 유형 상세

### 25번: 도표 (r_chart)
- question: "다음 도표의 내용과 일치하지 않는 것은?"
- 도표 제목, 데이터, 출처를 chartData 필드에 제공
- passage: 도입문 1문장 + ①~⑤ 번호가 매겨진 영어 설명문을 하나의 문단으로 작성
- choices: ["①", "②", "③", "④", "⑤"] (번호만)
- sentences: passage를 기준으로 분리한 배열

★ 도표 고도화 규칙 (필수):

1. **차트 유형 (9개 기출 실제 분포 — 반드시 준수):**
   - **"grouped_bar" (그룹 막대): 7/9 압도적** ← 가장 자주 선택
     예: Male vs Female / VR vs AR / 연도별 2~3개 시리즈 비교
   - "stacked_bar" (누적 막대): 1/9 (EU-28 관광 유형)
   - "table" (표): 1/9 (대학 등록률 인종별×연도별)
   - "line" / "pie": 9개 기출에서 미출제 → 생성 가능하나 드물게
   → **생성 시 grouped_bar를 기본으로 선택할 것**

2. **비교 시리즈**: 반드시 2개 이상 데이터 시리즈 (Male/Female, 연도2개, VR/AR 등)
   - labels: 국가명 or 연령대 or 제품 카테고리 (4~6개)
   - datasets: 2~3개 시리즈

3. **라벨(labels)**: 구체적이고 현실적인 항목명
   - 좋은 예: ["South Korea", "Canada", "Japan", "Switzerland"]
   - 좋은 예: ["From 25 to 34", "From 35 to 44", "From 45 to 54"]

4. **데이터 복잡도**: 정수 or 소수점 1자리
   - 좋은 예: [77, 70, 74, 67, 57, 46] (VR/AR 퍼센트처럼)

5. **정답 설계 (핵심!):**
   - ★★★ **정답은 절대 ①(0번 인덱스)이 되면 안 됨** (9개 기출 역대 0/9)
   - 정답은 ②~⑤ 중 하나에 배치 (③④⑤ 선호)
   - 정답 문장: 사실 2개 포함 — 앞은 맞고 뒤가 미묘하게 틀림
     예: "In Japan, the % of VR was greater than 60% (✓67>60 맞음), and...AR lower than Switzerland (✗ 46>43 틀림)"
   - 왜곡 유형: **비교급/최상급** 오류 / **배수·분수** 오류 / **증가↔감소** 반전
   - 오답 ① 문장: 가장 명확하고 확인하기 쉬운 사실로 작성

6. **지문 스타일**: 격식체 영어
   - 도입문: "The above graph shows..." / "The table above shows..."
   - 각 문장은 ① ② ③ ④ ⑤ 번호로 시작
   - 비교급: -er/less/more than / 최상급: the -est / 배수: twice, double, triple

7. **빈출 표현 풀 (선지 작성 시 필수):**
   비교/최상급: -er/less/more than, the -est, as ~ as
   분수/배수: half, quarter, one-서수, twice, double, triple, 숫자 times, 숫자 folds
   증가: increase, rise, grow, enhance, improve, exceed, incline
   감소: decrease, reduce, fall, shrink, diminish, decline
   합계/모두: combined, total, together, compound, all
   기타: between, among, difference, gap, still, remain, expected, while, as for, account for, take up,
         respectively, compared with, each, A follow B = B (being) followed by A



chartData 형식:
{
    "title": "Participation Rates in Volunteer Activities by Age Group in 2022",
    "type": "bar"|"line"|"pie"|"stacked_bar",
    "labels": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    "datasets": [
        { "label": "Male", "data": [23.4, 31.7, 28.9, 35.1, 22.6, 15.3] },
        { "label": "Female", "data": [28.1, 35.2, 33.4, 38.7, 27.9, 18.8] }
    ],
    "unit": "%",
    "source": "National Statistics Office, 2023"
}

### 26번: 인물 설명 불일치 (r_desc_mismatch)
- question: "[인물이름]에 관한 다음 글의 내용과 일치하지 않는 것은?"
- 지문: 실존 인물 소개글 (150~200 words)
- 선택지: 한국어 5개 (1개만 불일치)

- ★ 인물 분류 (9개 기출 전체):
  **미국인 (5/9)**: Will Rogers, Charles Rosen, Charles H. Townes, Dick Enberg, Max Kleiber
  **유럽인 (3/9)**: György Kepes(헝가리), Jean Renoir(프랑스), Claude Shannon(미국이지만 스위스 출생)
  **기타 (1/9)**: Mary Budd Rowe(미국 여성)
  → 주로 20세기 실존 인물 (1850~1990년대 생/몰)
  → 예술가, 과학자, 운동/스포츠, 작가, 교육자 등 다양

- ★ 불일치 왜곡 방식 (9개 기출):
  **날짜/순서 왜곡** (가장 많음): "박사 받기 전에 Bell Labs"(실제 후) / "생전에 동상 설치"(실제 사후)
  **장소 왜곡**: Zurich(실제 다른 도시) / Harlem(실제 다른 장소)
  **조건/방향 왜곡**: "미국에 돌아온 후 50편 이상"(실제 수 다름) / 수상 연도 오류

- ★★ 정답 배치 규칙:
  **①번은 절대 정답이 되면 안 됨** (9개 기출 역대 0/9)
  정답: ②~⑤ 중 배치 (③④⑤ 선호)
  ①번 선지: 가장 명확하고 확인하기 쉬운 사실 (생년, 국적, 직업 등)

- ★ 선지 설계 패턴 (5개 순서):
  ① 출생/국적/가족 관련 기본 사실
  ② 초기 경력/교육 관련
  ③ 중기 업적/활동 관련
  ④ 후기 업적/수상/출판 관련
  ⑤ 사망/유산/사후 관련

### 27번: 안내문 불일치 (r_notice_mismatch)
- question: "[행사명]에 관한 다음 안내문의 내용과 일치하지 않는 것은?"
- 지문: 행사/프로그램 안내문 형식
- 선택지: 한국어 5개 (1개만 불일치)

- ★★★ **passage 형식 규칙 (절대 준수)**:
  - passage는 **순수 텍스트(plain text)** 로만 작성 — HTML/XML 태그 절대 금지!
  - **<h1>, <h2>, <p>, <br>, <div>, <ul>, <li>, <strong>, <em>** 등 꺽쇠(< >) 포함 태그 일절 사용 불가
  - 제목은 줄 맨 앞에 그냥 쓰기 (예: "Summer Animal Rescue Volunteering")
  - 섹션 구분은 줄바꿈(\n) + 섹션명: 형태로 (예: "Schedule:\n- June 5 ~ July 20")
  - 항목 나열은 대시(-)나 • 로 (예: "- Registration fee: $30\n- Age: 14 and above")
  - 특이사항은 * 로 (예: "* For more information, visit our website.")

- ★ 안내문 구조 (9개 기출 전체):
  **제목**: [행사명] (굵게, 짧고 구체적)
  **섹션 구분**: 아래 섹션 중 3~5개 사용
    Schedule / Dates / Site & Dates / Meeting Time & Place /
    Requirements / Participants / Ages & Level /
    Activities / Tasks / Details / Course Options /
    Registration & Cost / How to Apply / Application /
    Notes / Transportation / Awards / Prizes
  **특이사항(*)**: "* On rainy days..." / "* For more information..."

- ★ 불일치 왜곡 방식 (9개 기출):
  **숫자 변경** (가장 많음): 횟수(2번→3번), 시간(2:30pm→1pm), 인원(10명→다른 수)
  **조건 변경**: 온라인 신청↔오프라인 직접 / 무료↔유료 / 포함↔불포함
  **대상 변경**: 특정 학년만↔전체 / 나이 조건 변경
  **방법 변경**: 직접 제출↔우편 / QR코드↔이메일

- ★★ 정답 배치 규칙:
  **①번은 절대 정답이 되면 안 됨** (9개 기출 역대 0/9)
  → **⑤④③②① 역순으로 살펴보는 풀이법 반영** → ③④⑤ 위치에 주로 배치
  ①번 선지: 제목이나 주제처럼 가장 명확한 사실로 작성

- ★ 소재 풀 (9개 기출):
  여름 동물 구조 봉사 / 대학 캠퍼스 방문 / 농구 캠프 / 국립공원 투어 /
  정글 요가 숙박 / 문화 공예품 공모전 / 보트 투어 / 교통 패스 카드 / 학교 대회

### 28번: 안내문 일치 (r_notice_match)
- question: "[행사명]에 관한 다음 안내문의 내용과 일치하는 것은?"
- 지문: 행사/프로그램/대회 안내문 (27번과 다른 소재)
- 선택지: 한국어 5개 (1개만 일치)
- ★★★ passage 형식: **27번과 동일 규칙** — HTML 태그(< >) 절대 금지, 순수 텍스트만 사용

- ★ 28번은 27번과 **완전히 다른 소재** 사용 필수

- ★★ 정답 배치 규칙:
  **①번은 절대 정답이 되면 안 됨** (9개 기출 역대 0/9)
  정답: ③④⑤ 위치에 주로 배치
  ①번 선지: 안내문 내용과 명확히 불일치하는 사실

- ★ 일치/불일치 설계 원칙:
  정답 선지: 안내문의 세부 사실을 정확히 반영 (숫자, 조건, 방법 포함)
  오답 선지: 안내문 내용과 살짝 다른 수치/조건 (예: 날짜 오류, 포함↔불포함)
  → **선지 순서와 안내문 섹션 순서는 동일** (위에서 아래로 대응)

- ★ 소재 풀 (9개 기출):
  지리학 현장 학습 / 웹툰 공모전 / 어린이 미술 강좌 / 사진 공모전 /
  마스코트 디자인 대회 / 과학 게임 행사 / 동영상 공모전 / 볼링 시즌 패스 / 눈 축제

Return JSON array of exactly 4 problems. Each MUST have: number, type, question, passage, choices, correctAnswer, explanation, points, sentences.
Problem 25 MUST include "chartData". All choices for 26, 27, 28 must be in KOREAN.
`;
}

// ══════════════════════════════════════
// Batch 7: 독해 43~45번 (장문 세트)
// ══════════════════════════════════════

export function getReadingBatch7Prompt(grade: string, avoidTopics?: string[]): string {
    const gradeDesc = GRADE_LABELS[grade] || GRADE_LABELS['3'];

    return `You are a Korean CSAT English reading comprehension problem generator.
Generate a LONG PASSAGE SET: problems #43, #44, #45. All 3 problems share ONE passage.

Target Level: ${gradeDesc}

${getCommonRules(avoidTopics)}

## 장문 세트 규칙 (43~45번)

### 소재/장르 (9개 기출 전체)
- **항상 일상 생활 스토리** (9/9): 쇼핑, 아웃도어(하이킹/자전거), 친구 만남, 가족 행사, 마켓 방문
  - 9개 실제 소재: Garcia(의상 쇼핑) / Helen(중고 식물 구매) / Ellen(생일선물 쇼핑) / Sean(산행) /
    Emma&Clara(자전거 해변) / Mia(독서 클럽) / Mike(야구 관람) / Ethan(등산 재킷 회수) / Cathy&Laura(파머스마켓)
- **등장인물**: 항상 2~3명 (주인공 + 조력자/상점직원/가족)
- **★★★ 결말**: **반드시 행복한/긍정적 결말** (9/9 — 풀이법: 장문은 암울한 기운을 주지 않기 위해 행복한 결말로 끝남)
- **이니셜 (a)~(e)**: 대명사 (he/she/his/her/I/my 등) — 5개 중 4개는 동일 인물, 1개만 다른 인물

### 지문 작성 절차 (반드시 이 순서대로)
1. 이야기글 전체를 300~400 words로 작성 (등장인물 2~3명, 사건 전개)
2. 전체 글을 4개 단락으로 분할: **(A) 도입부, (B), (C), (D)**
   - 각 단락 70~100 words
   - (A)는 항상 배경 설명 + 등장인물 소개로 시작
   - (D)는 반드시 행복한 결말로 마무리
3. paragraphs 배열에는 항상 (A)(B)(C)(D) 라벨 순으로 출력
4. correctOrder = 올바른 읽기 순서 (43번 정답)

### ★★★ 43번: 순서 배열 (r_long_order)
- question: "주어진 글 (A)에 이어질 내용을 순서에 맞게 배열한 것으로 가장 적절한 것은?"

- **선택지 9/9 항상 고정** (절대 변경 불가):
  choices: ["(B)-(D)-(C)", "(C)-(B)-(D)", "(C)-(D)-(B)", "(D)-(B)-(C)", "(D)-(C)-(B)"]
  → ① ② ③ ④ ⑤ 순서 고정

- **★★ 정답 ①번 금지** (9개 기출 + 풀이법: "①은 정답으로 출제될 확률이 거의 없으므로 배제")
  correctAnswer는 **1, 2, 3, 또는 4** (인덱스 기준) — 절대 0 금지
  → 즉 선지 ②③④⑤ 중 하나가 정답

- **올바른 순서 설계**: (A) 이후 전개가 자연스럽게 이어지도록
  - 마지막 단락은 반드시 **행복한 결말** (Happy ending)
  - 연결 단서: 전환 표현("Finally", "Just then", 시간 표현 등)

### ★★★ 44번: 지칭 추론 (r_long_reference)
- question: "밑줄 친 (a)~(e) 중에서 가리키는 대상이 나머지 넷과 다른 것은?"

- **선택지 9/9 항상 고정** (절대 변경 불가):
  choices: ["(a)", "(b)", "(c)", "(d)", "(e)"]

- **★★ 정답 ①번(a) 금지** (풀이법: "①은 정답으로 출제될 확률이 거의 없으므로 배제")
  correctAnswer는 **1, 2, 3, 또는 4** (인덱스 기준) — 절대 0 금지

- **(a)~(e) 배치 규칙 (★★★ 가장 중요 — 43번 정답 유출 방지)**:
  - (a)~(e)는 반드시 **표시 순서(A)(B)(C)(D) 기준으로 알파벳순**이어야 함
  - 즉, paragraphs 배열의 첫 번째 단락(A)에 (a)가 포함되고, 두 번째 단락(B)에 (b) 또는 (c)가 포함되는 식
  - **★★★ 절대 금지**: (a)가 correctOrder의 첫 번째 단락에, (b)가 두 번째에... 이런 식으로 배치하면 안 됨!
    → 그렇게 하면 학생이 (a)~(e) 순서만 보고 43번 정답을 알 수 있음
  - **올바른 방법**: 이야기를 완성한 뒤, paragraphs 배열(항상 A→B→C→D 순)에서 등장하는 대명사에 순서대로 (a)(b)(c)(d)(e) 부여
  - 예시: paragraphs가 (A)(B)(C)(D)이고 correctOrder가 (C)-(B)-(D)이면:
    (A)에서 첫 대명사 → (a), (B)에서 대명사 → (b), (C)에서 대명사 → (c)(d), (D)에서 대명사 → (e)
    이렇게 하면 올바른 읽기 순서(A→C→B→D)에서는 (a)→(c)(d)→(b)→(e)로 섞여서 43번 정답 유출 불가
  - 5개 모두 같은 성별 대명사 사용 (he/she/his/her — 단, 5개 중 1개는 다른 인물)
  - 4개 = 주인공 / 1개 = 다른 인물 (조력자, 상대방 등)
  - 정답인 1개: 문맥상 명확히 다른 인물을 가리킴

### ★★★ 45번: 내용 불일치 (r_long_match)
- question: "윗글의 내용과 일치하지 않는 것은?"
- 선택지: 한국어 5개

- **★★ 정답 ①번 금지** (풀이법: "①은 정답으로 출제될 확률이 거의 없으므로 배제")
  correctAnswer: **1, 2, 3, 또는 4** (인덱스) — 절대 0 금지

- **선택지 순서 = (A)→(B)→(C)→(D) 단락 순서** (글 내용 순서와 일치)
  - ① = (A) 단락 내용
  - ② = (B) 단락 내용
  - ③ = (C) 단락 내용
  - ④ = (D) 단락 내용 or ③~④ 혼합
  - 선지와 단락 대응이 반드시 순서와 일치해야 함

- **불일치 설계**: 세부 사실 1개를 미묘하게 왜곡
  (숫자, 시간, 장소, 관계, 행동 중 하나)

### 풀이법 반영 — AI 생성 시 필수 준수
1. (D) 단락이 마지막 → 반드시 Happy ending으로 끝날 것
2. (a)~(e) 이니셜은 앞뒤 맥락으로 파악 가능하도록 자연스럽게 배치
3. 45번 선지 순서 = 단락 순서 (풀이법 7단계 활용 가능하게)
4. 정답 ①번 배제 (43·44·45번 모두)

Return JSON array of exactly 3 problems. Each must have: number, type, question, passage, longPassageGroup: true, choices, correctAnswer, explanation, points.
Problem 43 MUST have "paragraphs" array. Problem 44 MUST have "referenceMarkers".
Return ONLY valid JSON array.
`;
}


// ══════════════════════════════════════
// 4번 그림 이미지 생성 프롬프트
// ══════════════════════════════════════

export function getPictureImagePrompt(pictureDescription: string): string {
    return `Create a simple, clean line drawing illustration for an English listening test.
The drawing should be in black and white only. Do NOT include any numbers, labels, or text annotations (①②③④⑤ etc.) in the image. Numbers will be added separately as overlays.

Scene description: ${pictureDescription}

Style: Simple line art, like a textbook illustration. Each element should be clearly visible and distinguishable. No numbers, no text, no annotations.`;
}

// ══════════════════════════════════════
// TTS 스크립트 타입 & 상수
// ══════════════════════════════════════

export type ScriptLineShape = {
    speaker: 'M' | 'W' | 'N';
    text: string;
    lang?: string;
};

/** 오프닝 안내방송 */
export const OPENING_SCRIPT: ScriptLineShape[] = [
    {
        speaker: 'N',
        text: '청한영어 모의고사 영어듣기평가입니다. 이제 문제지 표지를 넘기시기 바랍니다.',
        lang: 'ko'
    },
];

/** "문제지 표지를 넘기시기 바랍니다" 후 대기 시간 (초) */
export const PAGE_TURN_DELAY_SECONDS = 3;

/** 문제지 넘긴 후 듣기 시작 전 안내 */
export const LISTENING_START_SCRIPT: ScriptLineShape[] = [
    {
        speaker: 'N',
        text: '그러면 지금부터 영어 영역 듣기 평가를 시작하겠습니다.',
        lang: 'ko'
    },
    {
        speaker: 'N',
        text: '1번부터 17번까지는 듣고 답하는 문제입니다. 1번부터 15번까지는 한 번만 들려주고, 16번부터 17번까지는 두 번 들려줍니다. 방송을 잘 듣고 답을 하시기 바랍니다.',
        lang: 'ko'
    },
];

// ══════════════════════════════════════
// 듣기 종료 멘트
// ══════════════════════════════════════

/** 15번 끝난 후 16~17번 안내 */
export const LONG_SET_INTRO_SCRIPT: ScriptLineShape[] = [
    {
        speaker: 'N',
        text: '이제 16번과 17번입니다. 16번과 17번은 두 번 들려줍니다. 잘 듣고 물음에 답하시기 바랍니다.',
        lang: 'ko'
    },
];

/** 1회 재생 후 → 2회 재생 전 안내 */
export const REPLAY_INTRO_SCRIPT: ScriptLineShape[] = [
    {
        speaker: 'N',
        text: '다시 한번 들려드립니다.',
        lang: 'ko'
    },
];

/** 독해 문제 기본 출제 순서 */
export const DEFAULT_READING_ORDER: number[] = [18, 19, 20, 25, 26, 27, 28, 43, 44, 45];

/** 듣기→독해 전환 대기 시간 (초) */
export const TRANSITION_DELAY_SECONDS = 60;

/** 듣기 전체 종료 멘트 */
export const TRANSITION_SCRIPT: ScriptLineShape[] = [
    {
        speaker: 'N',
        text: '이상으로 듣기 평가를 마칩니다. 수고하셨습니다. 17번까지의 답을 확인하시고, 나머지 문항을 계속 풀어 주시기 바랍니다.',
        lang: 'ko'
    },
];