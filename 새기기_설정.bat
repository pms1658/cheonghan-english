@echo off
chcp 65001 > nul
title CheongHan - New Device Setup
echo ========================================================
echo  CheongHan English - New Device Setup
echo ========================================================
echo.
echo  [Prerequisites] Install these first:
echo.
echo  1. Node.js  : https://nodejs.org (LTS version)
echo  2. Git      : https://git-scm.com/download/win
echo.
echo  Press any key when ready...
pause > nul
echo.
echo --------------------------------------------------------
echo  [1/3] Downloading code from GitHub...
echo --------------------------------------------------------
"C:\Program Files\Git\bin\git.exe" clone https://github.com/pms1658/cheonghan-english.git
cd cheonghan-english
echo.
echo --------------------------------------------------------
echo  [2/3] Installing dependencies... (2-3 min)
echo --------------------------------------------------------
call npm install
echo.
echo --------------------------------------------------------
echo  [3/3] Almost done!
echo --------------------------------------------------------
echo.
echo  Last step: Copy .env.local file
echo.
echo  Get .env.local from your main PC
echo  (via USB or KakaoTalk) and put it in this folder.
echo.
echo  (API keys are in this file - not stored on GitHub)
echo.
echo ========================================================
echo  Setup complete! Run start_website.bat to start.
echo ========================================================
pause
