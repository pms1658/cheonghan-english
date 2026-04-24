@echo off
chcp 65001 > nul
title 청한영어 - Push (백업만)
echo.
echo  ┌─────────────────────────────────────┐
echo  │   청한영어 - GitHub 백업 (배포X)    │
echo  └─────────────────────────────────────┘
echo.

:: Pull first to avoid conflicts
echo  [1/2] 최신 코드 확인 중...
"C:\Program Files\Git\bin\git.exe" pull origin master --rebase
echo.

:: Commit and push
echo  [2/2] GitHub에 백업 중...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "manual-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Push 실패. 네트워크를 확인해주세요.
    pause
    exit /b 1
)
echo.
echo  ========================================
echo   GitHub 백업 완료! (배포는 안 함)
echo   배포하려면 deploy.bat 실행
echo  ========================================
pause
