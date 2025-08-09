@echo off
echo 🌐 開始部署到 Heroku...
echo.

echo 📦 檢查 Node.js 和 npm...
node --version
npm --version
echo.

echo 📋 安裝依賴...
npm install
echo.

echo 🔧 檢查 Heroku CLI...
heroku --version
echo.

echo 🚀 部署到 Heroku...
echo 請確保您已經登錄 Heroku (heroku login)
echo.

echo 📝 創建 Git 倉庫...
git init
git add .
git commit -m "Initial commit for Heroku deployment"
echo.

echo 🌐 創建 Heroku 應用...
heroku create swimming-attendance-api-%random%
echo.

echo 🔑 設置環境變量...
heroku config:set MONGODB_URI="mongodb+srv://chenyaolin0308:9GUhZvnuEpAA1r6c@cluster0.0dhi0qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
heroku config:set DB_NAME="test"
heroku config:set API_PUBLIC_KEY="ttdrcccy"
heroku config:set API_PRIVATE_KEY="2b207365-cbf0-4e42-a3bf-f932c84557c4"
echo.

echo 🚀 推送代碼到 Heroku...
git push heroku main
echo.

echo ✅ 部署完成！
echo.
echo 📱 您的API服務器地址：
heroku info -s | findstr web_url
echo.
echo 🧪 測試連接：
echo curl https://your-app-name.herokuapp.com/health
echo.
echo 📊 查看日誌：
echo heroku logs --tail
echo.
pause 