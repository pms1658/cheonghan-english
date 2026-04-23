@echo off
chcp 65001 > nul
title CheongHan - Push
echo ========================================================
echo  Backup code to GitHub
echo ========================================================
echo.
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "manual-backup: %date% %time%"
"C:\Program Files\Git\bin\git.exe" push
echo.
echo [Done] Backed up to GitHub!
pause
