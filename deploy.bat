@echo off
setlocal EnableDelayedExpansion
title AI-Tube Deploy

:: ============================================================
::  AI-Tube  —  One-Click Production Deploy
::  Builds fresh images and starts containers on port 6001
:: ============================================================

set "PROJECT_ROOT=%~dp0"
set "COMPOSE_FILE=%PROJECT_ROOT%docker\docker-compose.prod.yml"
set "ENV_FILE=%PROJECT_ROOT%.env"
set "UPLOADS_DIR=E:\Youtube Download\uploads"
set "DATA_DIR=E:\Youtube Download\data"
set "BACKEND_CONTAINER=ai-tube-prod"
set "FRONTEND_CONTAINER=ai-tube-prod-web"
set "APP_URL=http://localhost:6001"

echo.
echo  ============================================================
echo   AI-Tube  ^|  Production Deploy
echo  ============================================================
echo.

:: ── 1. Check Docker is running ────────────────────────────────
echo [1/6] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker is not running.
    echo  Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo  Docker is running.
echo.

:: ── 2. Create data directories ────────────────────────────────
echo [2/6] Creating data directories...
if not exist "%UPLOADS_DIR%" (
    mkdir "%UPLOADS_DIR%"
    echo  Created: %UPLOADS_DIR%
) else (
    echo  OK: %UPLOADS_DIR%
)
if not exist "%DATA_DIR%" (
    mkdir "%DATA_DIR%"
    echo  Created: %DATA_DIR%
) else (
    echo  OK: %DATA_DIR%
)
echo.

:: ── 3. Generate .env if missing ───────────────────────────────
echo [3/6] Checking environment config...
if not exist "%ENV_FILE%" (
    echo  Generating new .env with random secrets...

    :: Generate random hex strings for secrets using PowerShell
    for /f %%i in ('powershell -NoProfile -Command "[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace('-','')"') do set "JWT_SECRET=%%i"
    for /f %%i in ('powershell -NoProfile -Command "[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace('-','')"') do set "CSRF_SECRET=%%i"

    (
        echo JWT_SECRET=!JWT_SECRET!
        echo CSRF_SECRET=!CSRF_SECRET!
        echo PUID=1000
        echo PGID=1000
        echo MYTUBE_API_ENABLED=true
        echo MYTUBE_API_TOKEN=
    ) > "%ENV_FILE%"

    echo  Created: .env ^(JWT_SECRET and CSRF_SECRET auto-generated^)
) else (
    echo  OK: .env already exists.
)
echo.

:: ── 4. Stop and remove old containers ────────────────────────
echo [4/6] Removing old containers...
docker rm -f %BACKEND_CONTAINER% >nul 2>&1 && echo  Removed: %BACKEND_CONTAINER% || echo  Not found: %BACKEND_CONTAINER%
docker rm -f %FRONTEND_CONTAINER% >nul 2>&1 && echo  Removed: %FRONTEND_CONTAINER% || echo  Not found: %FRONTEND_CONTAINER%
echo.

:: ── 5. Build and start ────────────────────────────────────────
echo [5/6] Building images and starting containers...
echo  This may take a few minutes on first run.
echo.
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 (
    echo.
    echo  ERROR: Docker Compose failed. Check the output above.
    echo.
    pause
    exit /b 1
)
echo.

:: ── 6. Show API token ─────────────────────────────────────────
echo [6/6] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo  API access key (save this for AI agent use^):
echo  -----------------------------------------------
docker logs %BACKEND_CONTAINER% 2>&1 | findstr /i "API access key"
echo  -----------------------------------------------
echo.
echo  If the key is blank, wait a moment then run:
echo    docker logs %BACKEND_CONTAINER% ^| findstr "API access key"
echo.

:: ── Done ──────────────────────────────────────────────────────
echo  ============================================================
echo   Deploy complete!
echo   Open: %APP_URL%
echo  ============================================================
echo.
pause
endlocal
