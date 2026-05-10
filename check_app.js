<script>
(function() {
    // Fungsi deteksi WebView (khusus untuk median.co / Android WebView)
    function isWebView() {
        const ua = navigator.userAgent.toLowerCase();
        
        // Deteksi WebView Android (biasanya mengandung 'wv' atau '; wv)')
        const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('; wv)'));
        
        // Deteksi Crosswalk (median.co kadang menggunakan Crosswalk)
        const isCrosswalk = ua.includes('crosswalk');
        
        // Deteksi jika menggunakan TWA (Trusted Web Activity) – tidak umum di median.co
        const isTWA = document.referrer && document.referrer.startsWith('android-app://');
        
        // Deteksi dengan properti tambahan (optional)
        const hasNoReferrer = document.referrer === '';
        
        return isAndroidWebView || isCrosswalk || isTWA;
    }
    
    // Jika bukan WebView dan bukan akses localhost (untuk testing), arahkan ke Play Store
    if (!isWebView() && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
        // Tampilkan pesan peringatan
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h2>⚠️ Akses Ditolak</h2>
                <p>Aplikasi JeGo hanya dapat diakses melalui APK resmi.<br>Silakan unduh aplikasi dari <a href="https://play.google.com/store/apps/details?id=com.jego.app" target="_blank">Google Play Store</a>.</p>
                <button onclick="window.location.href='https://play.google.com/store/apps/details?id=com.jego.app'" style="padding:10px 20px; background:#FF9800; border:none; border-radius:8px; color:white; font-weight:bold;">Download Sekarang</button>
            </div>
        `;
        // Hentikan eksekusi script lebih lanjut (opsional)
        throw new Error('Akses ditolak: bukan dari aplikasi');
    }
})();
</script>
