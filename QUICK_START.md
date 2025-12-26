# Supabase 환경 변수 설정 가이드

## .env.local 파일에 아래 내용을 추가하세요:

파일 위치: `c:\Users\Daniel Park\Desktop\hagwon-lms\.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xqkkjqaxhorgcrsgaclx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OpEhvlztwqj4Yjpltb2rlQ_5qpKLHOy
```

기존 Gemini API 키는 그대로 두고, 위 2줄을 추가하시면 됩니다.

---

## 다음 단계: Supabase 데이터베이스 초기화

### 1. Supabase SQL Editor 열기
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2. Schema SQL 실행
1. **New Query** 버튼 클릭
2. `supabase-schema.sql` 파일 내용 전체 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (또는 Ctrl+Enter)

### 3. 확인
- **Table Editor** 메뉴로 이동
- 8개 테이블이 생성되었는지 확인:
  - users
  - vocabulary_classes
  - vocabulary_sets
  - vocabulary_words
  - passages
  - scores
  - sentence_analyses
  - class_students

### 4. 테스트 데이터 확인
Schema에 포함된 시드 데이터 확인:
- `users` 테이블: admin, student1, student2, student3
- `vocabulary_classes` 테이블: "고3 A반"
- `class_students` 테이블: 학생 2명 등록됨

---

## 개발 서버 시작

모든 설정이 완료되면:

```bash
npm run dev
```

브라우저 콘솔에서 Supabase 연결 오류가 없는지 확인하세요.
