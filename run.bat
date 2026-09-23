@echo off
setlocal EnableExtensions
title IoT OTA Dashboard - Launcher
cd /d "%~dp0"

echo ==================================================
echo    IoT OTA Dashboard  -  Full Stack Launcher
echo ==================================================
echo.

REM ---------- 1. Check prerequisites ----------
set "PY=python"
where python >nul 2>nul
if errorlevel 1 set "PY=py"
where %PY% >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js 18+ and add it to PATH.
    pause
    exit /b 1
)

REM ---------- 2. First-run setup ----------
%PY% -c "import fastapi, uvicorn" >nul 2>nul
if errorlevel 1 (
    echo [setup] Installing backend dependencies...
    %PY% -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] Backend pip install failed. See messages above.
        pause
        exit /b 1
    )
)

if not exist "dashboard\node_modules" (
    echo [setup] Installing dashboard dependencies...
    pushd dashboard
    call npm install
    popd
)
if not exist "simulator\node_modules" (
    echo [setup] Installing simulator dependencies...
    pushd simulator
    call npm install
    popd
)

echo.

REM ---------- 3. Start services (skip any already running) ----------
netstat -ano | findstr /c:":8000 " | findstr /c:"LISTENING" >nul
if not errorlevel 1 (
    echo [skip] Port 8000 busy - backend already running.
) else (
    echo [start] Backend on http://localhost:8000 ...
    start "IoT OTA - Backend  :8000" cmd /k "cd /d %~dp0backend && %PY% -m uvicorn main:app --host 0.0.0.0 --port 8000"
    timeout /t 2 /nobreak >nul
)

netstat -ano | findstr /c:":5173 " | findstr /c:"LISTENING" >nul
if not errorlevel 1 (
    echo [skip] Port 5173 busy - dashboard already running.
) else (
    echo [start] Dashboard on http://localhost:5173 ...
    start "IoT OTA - Dashboard :5173" cmd /k "cd /d %~dp0dashboard && npm run dev"
)

netstat -ano | findstr /c:":3000 " | findstr /c:"LISTENING" >nul
if not errorlevel 1 (
    echo [skip] Port 3000 busy - simulator already running.
) else (
    echo [start] Simulator on http://localhost:3000 ...
    start "IoT OTA - Simulator :3000" cmd /k "cd /d %~dp0simulator && npm run dev"
)

echo.
echo [wait] Giving services a moment to boot...
timeout /t 6 /nobreak >nul

REM ---------- 4. Open both UIs ----------
start "" http://localhost:5173
start "" http://localhost:3000

echo.
echo ==================================================
echo  All services running:
echo    Backend   : http://localhost:8000   (API docs at /docs)
echo    Dashboard : http://localhost:5173   (PC-A)
echo    Simulator : http://localhost:3000   (simulated ESP32s)
echo.
echo  To stop: close each service window
echo  (or press Ctrl+C inside it).
echo  This launcher window can be closed now.
echo ==================================================
echo.
pause
