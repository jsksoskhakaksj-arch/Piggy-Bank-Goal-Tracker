'use strict';
/* เปลี่ยนเลขเวอร์ชันนี้ทุกครั้งที่อัปโหลดแอปรุ่นใหม่ เพื่อบังคับล้างแคชเก่า */
var CACHE = 'smw-v7-0';
var FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* เสิร์ฟจากแคชก่อนแล้วอัปเดตเบื้องหลัง เฉพาะ GET ของ origin เดียวกัน
   คำขอข้าม origin (เช่น ฟอนต์ Google) ปล่อยผ่านตามปกติ */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u;
  try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req.url, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { return c.put(req, cp); });
        }
        return res;
      }).catch(function () { return null; });

      if (hit) { e.waitUntil(net); return hit; }
      return net.then(function (res) {
        if (res) return res;
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
