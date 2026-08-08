// ========== KONFIRMASI KELUAR APLIKASI ==========
function exitApp() {
    console.log('🚪 exitApp() dipanggil');

    // Coba berbagai method
    if (typeof navigator !== 'undefined' && navigator.app && typeof navigator.app.exitApp === 'function') {
        navigator.app.exitApp();
        return;
    }
    if (typeof Android !== 'undefined' && typeof Android.exitApp === 'function') {
        Android.exitApp();
        return;
    }
    if (typeof median !== 'undefined') {
        if (typeof median.exitApp === 'function') {
            median.exitApp();
            return;
        }
        if (typeof median.app !== 'undefined' && typeof median.app.exit === 'function') {
            median.app.exit();
            return;
        }
        if (typeof median.close === 'function') {
            median.close();
            return;
        }
    }
    // Fallback
    window.close();
}

function showExitConfirmation() {
    console.log('📱 showExitConfirmation() dipanggil');
    // Gunakan confirm bawaan browser (yang akan menjadi native dialog di WebView)
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi JeGo?")) {
        exitApp();
    }
}

// ========== DETEKSI TOMBOL BACK ==========
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    console.log('⬅️ Tombol BACK ditekan');
    showExitConfirmation();
}, false);

// Fallback untuk browser
window.history.pushState(null, null, window.location.href);
window.addEventListener('popstate', function(event) {
    event.preventDefault();
    showExitConfirmation();
    window.history.pushState(null, null, window.location.href);
});

console.log('✅ Konfirmasi keluar aplikasi aktif (exit-app.js)');
