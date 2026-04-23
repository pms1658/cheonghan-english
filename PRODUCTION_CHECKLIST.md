# 🚀 상품화 전 필수 체크리스트

상품화/외부 배포 전에 반드시 확인해야 할 항목들입니다.

---

## 🔒 1. Firebase 보안 규칙 (최우선!)

**현재 상태:** `allow read, write: if true` (개발용 — 누구나 접근 가능)

**해야 할 것:**
1. 학생 로그인을 Firebase Auth로 전환 (현재는 학생ID만 입력)
2. Firestore 규칙을 인증 기반으로 변경:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ 이 작업 없이 배포하면 **누구든 데이터를 삭제/변조**할 수 있음!

---

## 🔑 2. 환경변수 보안

- [ ] `.env.local`의 Firebase API 키가 Git에 포함되지 않는지 확인
- [ ] 프로덕션용 Firebase 프로젝트를 별도로 생성 (개발/프로덕션 분리)

---

## 📋 3. 기능 점검

- [ ] 학생 회원가입/로그인 시스템 (Firebase Auth 기반)
- [ ] 비밀번호 변경/초기화 기능
- [ ] 관리자 권한 분리 (일반 교사 vs 슈퍼 관리자)

---

*이 파일은 2026-03-19에 생성되었습니다.*
