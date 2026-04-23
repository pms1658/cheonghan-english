@echo off
echo CheongHan English System Starting...
echo.
echo 1. Keep this window OPEN.
echo 2. The browser will open automatically.
echo.

:: Start the browser slightly delayed to ensure server picks up
start "" "http://localhost:3000"

:: Start the Next.js Server
npm run dev

pause
