@echo off
chcp 65001 > nul
title CheongHan English - Deploy
echo ========================================================
echo  CheongHan English - Deploy + Backup
echo ========================================================
echo.

:: Step 1: GitHub Backup
echo [1/2] GitHub Backup...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "auto-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push
echo [OK] GitHub Backup Done!
echo.

:: Step 2: Vercel Deploy
echo [2/2] Vercel Deploy...
call npx vercel --prod

echo.
echo ========================================================
echo  Deploy + Backup Complete!
echo  GitHub: https://github.com/pms1658/cheonghan-english
echo  Website URL is shown above.
echo ========================================================
pause
