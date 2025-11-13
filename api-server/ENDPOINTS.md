# API 端點列表

## 健康檢查
- `GET /health` - 健康檢查端點

## 認證
- `POST /auth/login` - 用戶登入

## 教練相關
- `GET /api/coach/:phone` - 獲取教練信息
- `GET /api/coach/:phone/schedule` - 獲取教練日程
- `GET /api/coach/:phone/work-hours` - 獲取教練工時
- `POST /api/coach/:phone/work-hours` - 保存教練工時
- `GET /coaches` - 獲取所有教練列表

## 管理員相關
- `GET /admins` - 獲取所有管理員/員工列表
- `DELETE /admins/:phone` - 刪除管理員
- `PUT /admins/:phone` - 更新管理員信息

## 工時管理
- `GET /staff-work-hours/:phone/:year/:month` - 獲取員工工時記錄
- `POST /staff-work-hours/batch` - 批量保存工時記錄
- `GET /work-hours/compare/:phone/:year/:month` - 比較工時記錄

## 更表管理
- `GET /roster` - 獲取更表數據
- `POST /coach-roster/batch` - 批量保存更表
- `POST /coach-roster/backfill-slots` - 填充更表時段

## 地點和泳會
- `GET /location-clubs` - 獲取地點泳會組合
- `GET /locations` - 獲取所有地點
- `GET /clubs` - 獲取所有泳會

## 學生管理
- `GET /students` - 獲取學生列表（兩個端點）
- `PUT /students/:id` - 更新學生信息
- `DELETE /students/:id` - 刪除學生

## 出席管理
- `GET /attendance` - 獲取出席記錄

## 課程相關
- `GET /class-types` - 獲取課程類型
- `GET /class-formats` - 獲取課堂形式
- `GET /instructor-levels` - 獲取導師級別
- `GET /pricing` - 獲取價格（根據課程類型、課堂形式、導師級別）

## 試堂管理
- `POST /trial-bill/create` - 創建試堂記錄
- `GET /trial-bill/all` - 獲取所有試堂記錄
- `GET /trial-bill/:trailId` - 根據 TrailID 查詢試堂資料
- `PUT /trial-bill/:id` - 更新試堂記錄
- `DELETE /trial-bill/:id` - 刪除試堂記錄

## 員工管理
- `POST /create-employee` - 創建員工

## 賬單管理
- `POST /upload-receipt` - **上傳收據圖片** ✅
- `POST /create-student-bill` - **創建學生賬單** ✅

## 用戶偏好設置
- `POST /user-preferences/work-hours-collapse` - 保存工時管理隱藏列表頭狀態
- `GET /user-preferences/work-hours-collapse` - 獲取工時管理隱藏列表頭狀態
- `DELETE /user-preferences/work-hours-collapse` - 清除工時管理隱藏列表頭狀態

## 數據庫健康檢查
- `GET /db-health` - 數據庫健康檢查

---

**總計：40 個端點**

**關鍵端點確認：**
- ✅ `POST /upload-receipt` - 第 2824 行定義
- ✅ `POST /create-student-bill` - 第 2891 行定義
- ✅ `app.listen()` - 第 3306 行（在所有路由定義之後）













