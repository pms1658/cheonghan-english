@echo off
chcp 65001 > nul
title CheongHan - Pull
echo.
echo  ========================================
echo   CheongHan English - Pull Latest Code
echo  ========================================
echo.

echo  [1/2] Pulling latest code from GitHub...
"C:\Program Files\Git\bin\git.exe" pull origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Pull failed. Commit local changes first.
    pause
    exit /b 1
)
echo  [OK] Code synced!
echo.

echo  [2/2] Syncing packages...
call npm install --silent
echo  [OK] Packages synced!
echo.

echo  ========================================
echo   Sync complete! Ready to work.
echo   Dev server: run start_app.bat
echo  ========================================
pause
