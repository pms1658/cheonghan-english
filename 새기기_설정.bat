@echo off
chcp 65001 > nul
title CheongHan - New Device Setup
echo.
echo  ========================================
echo   CheongHan English - New Device Setup
echo  ========================================
echo.
echo  [Install these first]
echo   1. Node.js : https://nodejs.org (LTS)
echo   2. Git     : https://git-scm.com/download/win
echo.
echo  Press any key when ready...
pause > nul
echo.

echo  [1/4] Cloning from GitHub...
"C:\Program Files\Git\bin\git.exe" clone https://github.com/pms1658/cheonghan-english.git
cd cheonghan-english
echo.

echo  [2/4] Setting up Git user...
"C:\Program Files\Git\bin\git.exe" config user.email "pms1658@gmail.com"
"C:\Program Files\Git\bin\git.exe" config user.name "Daniel Park"
echo  [OK] Git user configured!
echo.

echo  [3/4] Installing packages... (2-3 min)
call npm install
echo.

echo  [4/4] Almost done!
echo.
echo  ========================================
echo   Copy .env.local from your main PC
echo   (via USB or KakaoTalk)
echo   and put it in this folder.
echo.
echo   Scripts:
echo    pull.bat      - Get latest code
echo    start_app.bat - Dev server
echo    deploy.bat    - Deploy + backup
echo    push.bat      - Backup only
echo  ========================================
pause
