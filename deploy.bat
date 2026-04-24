@echo off
chcp 65001 > nul
title 청한영어 - Deploy (배포 + 백업)
echo.
echo  ┌─────────────────────────────────────┐
echo  │   청한영어 - 배포 + GitHub 백업     │
echo  └─────────────────────────────────────┘
echo.

:: Step 1: GitHub Backup
echo  [1/3] 최신 코드 확인 중...
"C:\Program Files\Git\bin\git.exe" pull origin master --rebase
if %errorlevel% neq 0 (
    echo.
    echo  [!] 원격 저장소와 충돌이 발생했습니다.
    echo      충돌을 해결한 후 다시 실행해주세요.
    pause
    exit /b 1
)
echo.

echo  [2/3] GitHub에 백업 중...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "auto-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Push 실패. 네트워크를 확인해주세요.
    pause
    exit /b 1
)
echo  [OK] GitHub 백업 완료!
echo.

:: Step 2: Vercel Deploy
echo  [3/3] Vercel 배포 중...
call npx vercel --prod --yes
echo.

echo  ========================================
echo   배포 + 백업 완료!
echo   GitHub: https://github.com/pms1658/cheonghan-english
echo   웹사이트 주소는 위에 표시됩니다.
echo  ========================================
pause
