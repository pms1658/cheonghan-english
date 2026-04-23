@echo off
chcp 65001 > nul
title CheongHan - Pull
echo ========================================================
echo  Pull latest code from GitHub
echo ========================================================
echo.
"C:\Program Files\Git\bin\git.exe" pull
echo.
echo [Done] Updated to latest code!
pause
