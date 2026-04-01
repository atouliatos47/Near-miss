@echo off
cd /d "%~dp0"
echo ========================================
echo   Clamason Observation Logger
echo ========================================
echo.

REM Find node.exe
if exist "node-v24.14.1-win-x64\node-v24.14.1-win-x64\node.exe" (
    set NODE_PATH=node-v24.14.1-win-x64\node-v24.14.1-win-x64
) else (
    echo Node.exe not found!
    pause
    exit /b
)

echo Starting server...
echo.

REM Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo ========================================
echo   Logger:  http://%LOCAL_IP%:3008/log
echo   Admin:   http://%LOCAL_IP%:3008/admin
echo   QR Code: http://%LOCAL_IP%:3008/qr
echo ========================================
echo.
echo Opening admin dashboard...
timeout /t 2 /nobreak >nul
start http://%LOCAL_IP%:3008/admin

"%NODE_PATH%\node.exe" server.js
pause