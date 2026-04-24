@echo off
chcp 65001 > nul
title 청한영어 - Pull (동기화)
echo.
echo  ┌─────────────────────────────────────┐
echo  │   청한영어 - 최신 코드 가져오기     │
echo  └─────────────────────────────────────┘
echo.

:: Git Pull
echo  [1/2] GitHub에서 최신 코드 가져오는 중...
"C:\Program Files\Git\bin\git.exe" pull origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Pull 실패 - 충돌이 있을 수 있습니다.
    echo      수동으로 해결하거나, 로컬 변경사항을 먼저 커밋해주세요.
    pause
    exit /b 1
)
echo  [OK] 최신 코드 동기화 완료!
echo.

:: npm install (새 패키지가 있을 수 있음)
echo  [2/2] 패키지 동기화 중...
call npm install --silent
echo  [OK] 패키지 동기화 완료!

echo.
echo  ========================================
echo   동기화 완료! 이제 작업을 시작하세요.
echo   개발서버: start_app.bat 실행
echo  ========================================
pause
