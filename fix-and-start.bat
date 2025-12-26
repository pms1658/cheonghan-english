@echo off
echo ========================================
echo  완전 초기화 후 재설치
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 서버 프로세스 종료...
taskkill /F /IM node.exe /T 2>nul

echo.
echo [2/5] 기존 설치 파일 삭제...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
if exist .next rmdir /s /q .next

echo.
echo [3/5] npm 캐시 정리...
call npm cache clean --force

echo.
echo [4/5] 패키지 새로 설치... (1-2분 소요)
call npm install

echo.
echo [5/5] 개발 서버 시작...
echo.
echo 브라우저에서 http://localhost:3000 을 열어주세요!
echo.
echo ========================================

call npm run dev

pause
