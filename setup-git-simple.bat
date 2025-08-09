@echo off
echo 🧹 清理 Android Gradle 緩存文件...
echo.

echo 📁 刪除 Gradle 緩存目錄...
if exist "Android_app\gradle-8.0-bin" (
    rmdir /s /q "Android_app\gradle-8.0-bin"
    echo ✅ 已刪除 gradle-8.0-bin
)

if exist "Android_app\.gradle" (
    rmdir /s /q "Android_app\.gradle"
    echo ✅ 已刪除 .gradle
)

if exist "Android_app\build" (
    rmdir /s /q "Android_app\build"
    echo ✅ 已刪除 build
)

if exist "Android_app\app\build" (
    rmdir /s /q "Android_app\app\build"
    echo ✅ 已刪除 app\build
)

echo.
echo 📦 刪除 APK 文件...
del /q *.apk 2>nul
echo ✅ 已刪除 APK 文件

echo.
echo 🎉 清理完成！
echo.

echo 📦 初始化 Git 倉庫...
git init

echo 📝 添加文件到暫存區...
git add .

echo 💾 創建初始提交...
git commit -m "Initial commit: Swimming Attendance System"

echo 🌿 設置主分支...
git branch -M main

echo.
echo 🎯 下一步操作：
echo 1. 在 GitHub 上創建新倉庫
echo 2. 運行以下命令連接遠程倉庫：
echo    git remote add origin https://github.com/YOUR_USERNAME/swimming-attendance-system.git
echo 3. 推送代碼：
echo    git push -u origin main
echo.
echo 請將 YOUR_USERNAME 替換為你的 GitHub 用戶名
echo.
pause 