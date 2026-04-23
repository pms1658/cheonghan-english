@echo off
title CheongHan English - Deploy & Update
echo ========================================================
echo  CheongHan English - Cloud Deployment Tool (Vercel)
echo ========================================================
echo.
echo [INFO] This will upload your code to Vercel.
echo [INFO] The website address (URL) will NOT change.
echo.
echo 1. If this is your first time, it will ask you to Log In.
echo 2. Press Enter for default options (Y, Project Name, etc).
echo.

:: Run Vercel Deployment in Production Mode
call npx vercel --prod

echo.
echo ========================================================
echo  Deployment Complete!
echo  Your Permanent URL is shown above.
echo ========================================================
pause
