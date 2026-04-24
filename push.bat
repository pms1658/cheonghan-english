@echo off
chcp 65001 > nul
title CheongHan - Push
echo.
echo  ========================================
echo   CheongHan English - GitHub Backup Only
echo  ========================================
echo.

echo  [1/2] Pulling latest first...
"C:\Program Files\Git\bin\git.exe" pull origin master --rebase
echo.

echo  [2/2] Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "manual-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Push failed. Check network.
    pause
    exit /b 1
)
echo.
echo  ========================================
echo   GitHub backup done! (No deploy)
echo   To deploy: run deploy.bat
echo  ========================================
pause
