@echo off
chcp 65001 > nul
title 청한영어 - 새 기기 설정
echo.
echo  ┌─────────────────────────────────────┐
echo  │   청한영어 - 새 기기 초기 설정      │
echo  └─────────────────────────────────────┘
echo.
echo  [사전 설치 필요]
echo.
echo   1. Node.js : https://nodejs.org (LTS)
echo   2. Git     : https://git-scm.com/download/win
echo.
echo  설치 완료했으면 아무 키나 누르세요...
pause > nul
echo.

:: Step 1: Clone
echo  [1/4] GitHub에서 코드 다운로드 중...
"C:\Program Files\Git\bin\git.exe" clone https://github.com/pms1658/cheonghan-english.git
cd cheonghan-english
echo.

:: Step 2: Git config
echo  [2/4] Git 사용자 설정 중...
"C:\Program Files\Git\bin\git.exe" config user.email "pms1658@gmail.com"
"C:\Program Files\Git\bin\git.exe" config user.name "Daniel Park"
echo  [OK] Git 사용자 설정 완료!
echo.

:: Step 3: npm install
echo  [3/4] 패키지 설치 중... (2~3분 소요)
call npm install
echo.

:: Step 4: .env.local
echo  [4/4] 거의 완료!
echo.
echo  ========================================
echo   마지막 단계: .env.local 파일 복사
echo.
echo   메인 PC에서 .env.local 파일을
echo   USB/카카오톡으로 가져와서
echo   이 폴더에 넣어주세요.
echo.
echo   (API 키가 들어있어 GitHub에 안 올라감)
echo  ========================================
echo.
echo  완료 후 사용법:
echo   pull.bat     - 최신 코드 받기
echo   start_app.bat - 개발서버 실행
echo   deploy.bat   - 배포 + 백업
echo   push.bat     - 백업만 (배포X)
echo  ========================================
pause
