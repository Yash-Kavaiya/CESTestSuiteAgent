@echo off
echo ============================================
echo   Dialogflow CX Testing Tool - Startup
echo ============================================
echo.

:: Start Backend in a new window
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend in a new window
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   Servers Starting...
echo ============================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   Close this window or press any key to exit.
echo   (Servers will continue running in their windows)
echo ============================================
pause > nul
