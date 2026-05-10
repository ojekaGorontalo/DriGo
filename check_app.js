// check_app.js (letakkan di root folder)
(function() {
    function isWebView() {
        const ua = navigator.userAgent.toLowerCase();
        // Deteksi WebView Android (median.co akan mengirim user agent yang mengandung 'median' atau 'gonative' atau 'wv')
        const isMedianWebView = ua.includes('median') || ua.includes('gonative') || ua.includes('wv');
        // Deteksi custom user agent yang Anda set di median.co
        const hasCustomUA = ua.includes('JeGo-Android-App');
        return isMedianWebView || hasCustomUA;
    }

    // Jika bukan WebView dan bukan localhost (development), blokir
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isWebView() && !isLocalhost) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h2>⚠️ Akses Ditolak</h2>
                <p>Aplikasi JeGo hanya dapat diakses melalui APK resmi.<br>Silakan unduh aplikasi dari <a href="https://play.google.com/store/apps/details?id=com.jego.app" target="_blank">Google Play Store</a>.</p>
                <button onclick="window.location.href='https://play.google.com/store/apps/details?id=com.jego.app'" style="padding:12px 20px; background:#FF9800; border:none; border-radius:8px; color:white; font-weight:bold;">Download Sekarang</button>
            </div>
        `;
        throw new Error('Akses ditolak');
    }
})();
