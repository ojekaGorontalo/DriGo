(function() {
    function isWebView() {
        const ua = navigator.userAgent.toLowerCase();
        const isMedian = ua.includes('median') || ua.includes('gonative') || ua.includes('wv');
        const isJeGoApp = ua.includes('JeGo-Android-App');
        return isMedian || isJeGoApp;
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isWebView() && !isLocalhost) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h2>⚠️ Akses Ditolak</h2>
                <p>Aplikasi JeGo hanya dapat diakses melalui APK resmi.<br>Silakan unduh aplikasi dari <a href="https://play.google.com/store/apps/details?id=com.jego.app" target="_blank">Google Play Store</a>.</p>
                <button onclick="window.location.href='https://play.google.com/store/apps/details?id=com.jego.app'" style="padding:12px 20px; background:#FF9800; border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer;">Download Sekarang</button>
            </div>
        `;
        throw new Error('Akses ditolak');
    }
})();
