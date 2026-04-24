@echo off
chcp 65001 > nul
title CheongHan - Deploy
echo.
echo  ========================================
echo   CheongHan English - Deploy + Backup
echo  ========================================
echo.

echo  [1/3] Pulling latest code...
"C:\Program Files\Git\bin\git.exe" pull origin master --rebase
if %errorlevel% neq 0 (
    echo.
    echo  [!] Pull failed - resolve conflicts first.
    pause
    exit /b 1
)
echo.

echo  [2/3] Backing up to GitHub...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "auto-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push origin master
if %errorlevel% neq 0 (
    echo.
    echo  [!] Push failed. Check network.
    pause
    exit /b 1
)
echo  [OK] GitHub backup done!
echo.

echo  [3/3] Deploying to Vercel...
call npx vercel --prod --yes
echo.

echo  ========================================
echo   Deploy + Backup Complete!
echo   GitHub: https://github.com/pms1658/cheonghan-english
echo   Website URL is shown above.
echo  ========================================
pause
