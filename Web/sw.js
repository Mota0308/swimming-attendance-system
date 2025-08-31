// 游泳系統 Service Worker
const CACHE_NAME = 'swimming-system-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './database-connector.js',
  './security.js'
];

// 安裝事件
self.addEventListener('install', event => {
  console.log('🔄 Service Worker 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 緩存已打開');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.warn('⚠️ 緩存添加失敗:', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 刪除舊緩存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截請求
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 跳過 API 請求，讓它們直接發送
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果緩存中有響應，返回緩存
        if (response) {
          return response;
        }
        
        // 否則從網絡獲取
        return fetch(event.request)
          .then(response => {
            // 檢查響應是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆響應
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // 如果網絡和緩存都失敗，返回離線頁面
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

console.log('✅ Service Worker 已加載'); 