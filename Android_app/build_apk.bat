@echo off
echo 開始構建游泳課程出席管理系統APK...

echo 清理項目...
call gradlew clean

echo 構建Release版本...
call gradlew assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 構建成功！
    echo APK文件位置: app\build\outputs\apk\release\app-release.apk
    echo.
    echo 請將APK文件安裝到Android設備上進行測試。
) else (
    echo.
    echo 構建失敗，請檢查錯誤信息。
)

pause 