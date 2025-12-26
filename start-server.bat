@echo off
echo ========================================
echo  청한영어 LMS 서버 시작중...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 패키지 설치 확인중...
call npm install --silent

echo.
echo [2/2] 개발 서버 시작중...
echo.
echo 브라우저에서 http://localhost:3000 을 열어주세요!
echo 서버를 종료하려면 Ctrl+C 를 누르세요.
echo.
echo ========================================

call npm run dev

pause
