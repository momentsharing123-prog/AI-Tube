@echo off
setlocal EnableDelayedExpansion
title AI-Tube Build and Push (Production)

:: ============================================================
::  AI-Tube  —  Windows Production Build & Push
::  Builds multi-arch images (amd64 + arm64) and pushes to
::  Docker Hub using Docker Buildx.
::
::  Usage:
::    windows_build_and_push.bat              (latest tags only)
::    windows_build_and_push.bat 1.0.0        (latest + version tags)
::
::  Requirements: Docker Desktop with Buildx enabled
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

set "USERNAME=momentsharing123-prog"
set "VERSION=%~1"
set "PLATFORMS=linux/amd64,linux/arm64"
set "BUILDER_NAME=ai-tube-builder"

set "VITE_API_URL=http://localhost:5551/api"
set "VITE_BACKEND_URL=http://localhost:5551"
:: Override above by setting env vars before running this script

echo.
echo  ============================================================
echo   AI-Tube  ^|  Production Build ^& Push  (multi-arch)
echo  ============================================================
echo.

:: ── Check Docker ──────────────────────────────────────────────
echo [1/5] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Docker is not running. Start Docker Desktop first.
    pause & exit /b 1
)
echo  Docker is running.
echo.

:: ── Set up Buildx builder ─────────────────────────────────────
echo [2/5] Setting up Buildx builder...
docker buildx inspect %BUILDER_NAME% >nul 2>&1
if errorlevel 1 (
    echo  Creating new builder: %BUILDER_NAME%
    docker buildx create --name %BUILDER_NAME% --use
) else (
    docker buildx use %BUILDER_NAME%
    echo  Using existing builder: %BUILDER_NAME%
)
docker buildx inspect --bootstrap
echo.

:: ── Build tags ────────────────────────────────────────────────
set "BACKEND_TAGS=-t %USERNAME%/ai-tube:backend-latest"
set "FRONTEND_TAGS=-t %USERNAME%/ai-tube:frontend-latest"
if not "%VERSION%"=="" (
    echo  Version tag: %VERSION%
    set "BACKEND_TAGS=!BACKEND_TAGS! -t %USERNAME%/ai-tube:backend-%VERSION%"
    set "FRONTEND_TAGS=!FRONTEND_TAGS! -t %USERNAME%/ai-tube:frontend-%VERSION%"
)

:: ── Build backend ─────────────────────────────────────────────
echo [3/5] Building and pushing backend ^(%PLATFORMS%^)...
docker buildx build ^
    --platform %PLATFORMS% ^
    --provenance=false --sbom=false ^
    -f "%PROJECT_ROOT%\backend\Dockerfile" ^
    %BACKEND_TAGS% ^
    --push ^
    "%PROJECT_ROOT%"
if errorlevel 1 ( echo  ERROR: Backend build failed. & pause & exit /b 1 )
echo.

:: ── Build frontend ────────────────────────────────────────────
echo [4/5] Building and pushing frontend ^(%PLATFORMS%^)...
docker buildx build ^
    --platform %PLATFORMS% ^
    --provenance=false --sbom=false ^
    --build-arg VITE_API_URL="%VITE_API_URL%" ^
    --build-arg VITE_BACKEND_URL="%VITE_BACKEND_URL%" ^
    %FRONTEND_TAGS% ^
    --push ^
    "%PROJECT_ROOT%\frontend"
if errorlevel 1 ( echo  ERROR: Frontend build failed. & pause & exit /b 1 )
echo.

:: ── Summary ───────────────────────────────────────────────────
echo [5/5] Done!
echo.
echo  Images pushed to Docker Hub:
echo    %USERNAME%/ai-tube:backend-latest
echo    %USERNAME%/ai-tube:frontend-latest
if not "%VERSION%"=="" (
    echo    %USERNAME%/ai-tube:backend-%VERSION%
    echo    %USERNAME%/ai-tube:frontend-%VERSION%
)
echo.
echo  ============================================================
echo   Build completed at: %DATE% %TIME%
echo  ============================================================
echo.
pause
endlocal
