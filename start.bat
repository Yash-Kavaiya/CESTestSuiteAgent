@echo off
setlocal enabledelayedexpansion

title TestSuiteAgent Launcher

echo.
echo  =============================================
echo   TestSuiteAgent - Starting Services
echo  =============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed
    echo  Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Display versions
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo  Node.js: %NODE_VER%
echo  npm:     v%NPM_VER%
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"

:: Check and install backend dependencies
if not exist "%SCRIPT_DIR%backend\node_modules" (
    echo  [INFO] Installing backend dependencies...
    cd /d "%SCRIPT_DIR%backend"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
    echo.
)

:: Check and install frontend dependencies
if not exist "%SCRIPT_DIR%frontend\node_modules" (
    echo  [INFO] Installing frontend dependencies...
    cd /d "%SCRIPT_DIR%frontend"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
    echo.
)

echo  [OK] Dependencies ready
echo.
echo  Starting services...
echo.

:: Start Backend in a new window
echo  [BACKEND] Starting on http://localhost:3001
start "TestSuiteAgent - Backend" cmd /k "cd /d %SCRIPT_DIR%backend && npm run dev"

:: Wait for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend in a new window
echo  [FRONTEND] Starting on http://localhost:5173
start "TestSuiteAgent - Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && npm run dev"

echo.
echo  =============================================
echo   Services Started Successfully!
echo  =============================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend UI:  http://localhost:5173
echo.
echo   [TIP] Close the Backend/Frontend windows
echo         to stop the servers.
echo  =============================================
echo.
echo  Press any key to close this launcher...
pause > nul
