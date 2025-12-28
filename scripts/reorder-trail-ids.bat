@echo off
REM 重新排序 trail_bill 集合中的 trailId
REM 
REM 使用方法：
REM scripts\reorder-trail-ids.bat
REM 
REM 或者指定環境變量：
REM set MONGODB_URI=mongodb://your-connection-string
REM set DB_NAME=your-db-name
REM scripts\reorder-trail-ids.bat

echo 🚀 開始重新排序 trail_bill 中的 trailId...

REM ✅ 檢查 Node.js 是否安裝
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 Node.js，請先安裝 Node.js
    exit /b 1
)

REM ✅ 設置腳本路徑
set SCRIPT_DIR=%~dp0
set SCRIPT_FILE=%SCRIPT_DIR%reorder-trail-ids.js

REM ✅ 檢查腳本文件是否存在
if not exist "%SCRIPT_FILE%" (
    echo ❌ 錯誤：找不到腳本文件 %SCRIPT_FILE%
    exit /b 1
)

REM ✅ 提示環境變量（如果未設置）
if "%MONGODB_URI%"=="" (
    echo ⚠️  警告：未設置 MONGODB_URI 環境變量，將使用默認值
    echo    提示：可以通過環境變量設置：set MONGODB_URI=mongodb://your-connection-string
)

if "%DB_NAME%"=="" (
    echo ⚠️  警告：未設置 DB_NAME 環境變量，將使用默認值
    echo    提示：可以通過環境變量設置：set DB_NAME=your-database-name
)

REM ✅ 執行腳本
node "%SCRIPT_FILE%"

if %errorlevel% neq 0 (
    echo.
    echo ❌ 腳本執行失敗
    exit /b 1
)

echo.
echo ✅ 腳本執行完成

