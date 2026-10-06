/* ============================================================
   SERVICE WORKER — JeGo
   ============================================================
   Strategi:
     - App shell (HTML/CSS/JS lokal)  → Stale-while-revalidate
     - Firebase CDN + icon eksternal  → Cache-first
     - Firebase Realtime DB + Auth    → Network-only (WAJIB!)
     - Google Maps API calls          → Network-only
   ============================================================ */

// ⬅️ NAIKKAN versi supaya SW lama otomatis terbuang
const CACHE_NAME    = 'jego-shell-v3';
const RUNTIME_CACHE = 'jego-runtime-v3';

// File yang dipre-cache saat install.
// Satu file boleh gagal — yang lain tetap masuk cache.
const APP_SHELL = [
    // ===== ROOT =====
    './',
    './pilih_peran.html',
    './peran.html',
    './index.html',
    './loginDriver.html',
    './PendaftaranDriver.html',
    './Status_pending.html',
    './verifikasi_driver.html',
    './lengkapiData.html',
    './orderAccepted.html',        // ⬅️ FIX: huruf A besar (sesuai redirect di index.html)
    './orderaccepted.html',        // ⬅️ Alias jaga-jaga kalau ada yang pakai lowercase
    './GantiLayanan.html',
    './documents.html',
    './payment.html',
    './pendapatan.html',
    './historydeposit.html',
    './akun.html',
    './pengaturanDr.html',         // ⬅️ FIX: huruf D besar (sesuai sidebar index.html)
    './pengaturandr.html',         // ⬅️ Alias jaga-jaga
    './notifikasi.html',
    './editorLegal.html',
    './riwayat.html',
    './statistik.html',            // ⬅️ INI YANG PENTING untuk instant navigation
    './penilaianLayanan.html',
    './feedback.html',
    './sanski_driver.html',
    './kompensasi.html',
    './penjelasan_prioritas.html',
    './hapus_akun.html',
    './delete_account.html',
    './delete_driver_account.html',
    './perlindunganDriver.html',
    './ketentuan.html',
    './privasi.html',
    './lisensi.html',
    './kebijakanUlasan.html',
    './terms-umum.html',
    './terms-motor.html',
    './terms-mobil.html',
    './terms-bentor.html',
    './terms-kurir-motor.html',
    './terms-kurir-bentor.html',

    // ===== CUSTOMER (nama HARUS sama persis!) =====
    './customer/loginuser.html',
    './customer/jenis_kenderaan.html',
    './customer/registrasi_jego.html',
    './customer/userAccount.html',
    './customer/riwayatUser.html',
    './customer/bannerPromo.html',
    './customer/chat_bot.html',
    './customer/cs_jego.html',
    './customer/customer_refund.html',
    './customer/jepay.html',
    './customer/live_chat.html',
    './customer/perlindungancustomer.html',
    './customer/programReferral.html',
    './customer/tracking_customer.html',
    './customer/rute.html',
    './customer/rute_kurir.html',
    './customer/rute.css',
    './customer/rute.js',
    './customer/rute_kurir.css',
    './customer/rute_kurir.js'
];

// ============================================================
// INSTALL — Precaching app shell
// ============================================================
self.addEventListener('install', (event) => {
    console.log('🔧 [SW] Install — precache app shell (tolerant mode)');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // ✅ FIX: cache.add() per URL, bukan addAll().
            //    Kalau satu 404, yang lain tetap ter-cache.
            return Promise.allSettled(
                APP_SHELL.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('⚠️ [SW] Skip (gagal cache):', url);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ============================================================
// ACTIVATE — Bersihkan cache versi lama
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('🚀 [SW] Activate — bersihkan cache lama');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
                    .map((key) => {
                        console.log('🗑️ [SW] Hapus cache lama:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH — Routing request
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // --- 1. Skip non-GET ---
    if (request.method !== 'GET') return;

    // --- 2. JANGAN cache Firebase Realtime DB + Auth ---
    if (
        url.hostname.includes('firebasedatabase.app') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('securetoken')
    ) {
        // Network-only — biarkan lewat
        return;
    }

    // --- 3. JANGAN cache Google Maps API calls ---
    if (
        url.hostname.includes('maps.googleapis.com') ||
        url.hostname.includes('maps.gstatic.com') ||
        url.hostname.includes('khms') ||
        (url.hostname.includes('mt') && url.hostname.includes('google'))
    ) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // --- 4. Firebase SDK CDN (gstatic) → Cache-first ---
    if (url.hostname.includes('gstatic.com')) {
        event.respondWith(cacheFirst(request, RUNTIME_CACHE));
        return;
    }

    // --- 5. Icon eksternal (flaticon, maps.google.com, dll) → Cache-first ---
    if (
        url.hostname.includes('flaticon.com') ||
        url.hostname.includes('cdn-icons') ||
        url.hostname.includes('maps.google.com') ||
        url.hostname.includes('cdnjs.cloudflare.com')   // ⬅️ Bonus: Font Awesome
    ) {
        event.respondWith(cacheFirst(request, RUNTIME_CACHE));
        return;
    }

    // --- 6. App shell (same-origin: HTML/CSS/JS) → Stale-while-revalidate ---
    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
        return;
    }

    // --- 7. Default: network dulu, fallback cache ---
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// ============================================================
// STRATEGI CACHE
// ============================================================

// Cache-first: cek cache dulu, kalau tidak ada baru fetch
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        console.warn('❌ [SW] Cache-first gagal:', request.url);
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

// Stale-while-revalidate: kasih cache dulu, lalu update di background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

// ============================================================
// MESSAGE — Manual update & clear cache dari aplikasi
// ============================================================
self.addEventListener('message', (event) => {
    const { type } = event.data || {};

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((keys) =>
                Promise.all(keys.map((k) => caches.delete(k)))
            ).then(() => {
                console.log('🧹 [SW] Semua cache dibersihkan');
                event.source.postMessage({ type: 'CACHE_CLEARED' });
            })
        );
    }
});
