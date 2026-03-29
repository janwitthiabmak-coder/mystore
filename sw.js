/* ============================================================
   sw.js — Service Worker สำหรับ MaePorn PWA
   ============================================================ */

const CACHE_NAME = 'maeporn-v1';

// ไฟล์ที่ต้องการ cache ตั้งแต่แรก (App Shell)
const PRECACHE_URLS = [
  './',
  './index.html',
  './kitchen.html',
  './admin.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'
];

/* ----------------------------------------------------------
   1. INSTALL — pre-cache ไฟล์ App Shell
   ---------------------------------------------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------
   2. ACTIVATE — ลบ cache เก่าที่ไม่ใช้แล้ว
   ---------------------------------------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------
   3. FETCH — กลยุทธ์ Network First (ลอง network ก่อน ถ้าไม่ได้ใช้ cache)
   ---------------------------------------------------------- */
self.addEventListener('fetch', event => {
  // ข้าม request ที่ไม่ใช่ GET หรือ Firebase
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com')) return;
  if (event.request.url.includes('googleapis.com/identitytoolkit')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // เก็บ response ลง cache ถ้า fetch สำเร็จ
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // ถ้า network ล้มเหลว ดึงจาก cache แทน
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // fallback ถ้าเปิด HTML page ไม่ได้
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
