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
echo 🎉 清理完成！現在可以安全地推送到 Git
echo.
echo 下一步：
echo 1. git add .
echo 2. git commit -m "Initial commit"
echo 3. git push -u origin main
echo.
pause 