@echo off
setlocal EnableDelayedExpansion
title AI-Tube Build and Push (Test)

:: ============================================================
::  AI-Tube  —  Windows Test Build & Push
::  Builds amd64-only test images and pushes to Docker Hub.
::  Faster than the production script — no multi-arch emulation.
::
::  Usage:
::    windows_build_and_push_test.bat
::
::  Requirements: Docker Desktop
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

set "USERNAME=momentsharing123-prog"
set "PLATFORM=linux/amd64"

set "VITE_API_URL=http://localhost:5551/api"
set "VITE_BACKEND_URL=http://localhost:5551"

set "BACKEND_TAG=%USERNAME%/ai-tube:backend-test"
set "FRONTEND_TAG=%USERNAME%/ai-tube:frontend-test"
set "BACKEND_TAG_AMD64=%USERNAME%/ai-tube:backend-test-amd64"
set "FRONTEND_TAG_AMD64=%USERNAME%/ai-tube:frontend-test-amd64"

echo.
echo  ============================================================
echo   AI-Tube  ^|  Test Build ^& Push  (amd64 only)
echo  ============================================================
echo.

:: ── Check Docker ──────────────────────────────────────────────
echo [1/4] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Docker is not running. Start Docker Desktop first.
    pause & exit /b 1
)
echo  Docker is running.
echo.

:: ── Build backend ─────────────────────────────────────────────
echo [2/4] Building backend ^(%PLATFORM%^)...
docker build ^
    --platform %PLATFORM% ^
    -f "%PROJECT_ROOT%\backend\Dockerfile" ^
    -t %BACKEND_TAG_AMD64% ^
    "%PROJECT_ROOT%"
if errorlevel 1 ( echo  ERROR: Backend build failed. & pause & exit /b 1 )

echo  Tagging as: %BACKEND_TAG%
docker tag %BACKEND_TAG_AMD64% %BACKEND_TAG%

echo  Pushing: %BACKEND_TAG_AMD64%
docker push %BACKEND_TAG_AMD64%
echo  Pushing: %BACKEND_TAG%
docker push %BACKEND_TAG%

echo  Cleaning up local backend images...
docker rmi %BACKEND_TAG_AMD64% >nul 2>&1
docker rmi %BACKEND_TAG% >nul 2>&1
echo.

:: ── Build frontend ────────────────────────────────────────────
echo [3/4] Building frontend ^(%PLATFORM%^)...
docker build ^
    --platform %PLATFORM% ^
    --build-arg VITE_API_URL="%VITE_API_URL%" ^
    --build-arg VITE_BACKEND_URL="%VITE_BACKEND_URL%" ^
    -t %FRONTEND_TAG_AMD64% ^
    "%PROJECT_ROOT%\frontend"
if errorlevel 1 ( echo  ERROR: Frontend build failed. & pause & exit /b 1 )

echo  Tagging as: %FRONTEND_TAG%
docker tag %FRONTEND_TAG_AMD64% %FRONTEND_TAG%

echo  Pushing: %FRONTEND_TAG_AMD64%
docker push %FRONTEND_TAG_AMD64%
echo  Pushing: %FRONTEND_TAG%
docker push %FRONTEND_TAG%

echo  Cleaning up local frontend images...
docker rmi %FRONTEND_TAG_AMD64% >nul 2>&1
docker rmi %FRONTEND_TAG% >nul 2>&1
echo.

:: ── Summary ───────────────────────────────────────────────────
echo [4/4] Done!
echo.
echo  Test images pushed to Docker Hub:
echo    %BACKEND_TAG%
echo    %FRONTEND_TAG%
echo    %BACKEND_TAG_AMD64%
echo    %FRONTEND_TAG_AMD64%
echo.
echo  ============================================================
echo   Build completed at: %DATE% %TIME%
echo  ============================================================
echo.
pause
endlocal
