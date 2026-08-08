// ========== KONFIRMASI KELUAR APLIKASI ==========
function exitApp() {
    console.log('🚪 exitApp() dipanggil');

    // 1. Coba Median Bridge (versi terbaru)
    if (typeof median !== 'undefined') {
        // Coba berbagai method yang mungkin tersedia
        if (typeof median.app !== 'undefined' && typeof median.app.exit === 'function') {
            console.log('📱 median.app.exit()');
            median.app.exit();
            return;
        }
        if (typeof median.exitApp === 'function') {
            console.log('📱 median.exitApp()');
            median.exitApp();
            return;
        }
        if (typeof median.navigation !== 'undefined' && typeof median.navigation.goBack === 'function') {
            console.log('📱 median.navigation.goBack()');
            median.navigation.goBack();
            return;
        }
        if (typeof median.close === 'function') {
            console.log('📱 median.close()');
            median.close();
            return;
        }
    }

    // 2. Coba Android Bridge (jika ada)
    if (typeof Android !== 'undefined') {
        if (typeof Android.exitApp === 'function') {
            console.log('📱 Android.exitApp()');
            Android.exitApp();
            return;
        }
        if (typeof Android.closeApp === 'function') {
            console.log('📱 Android.closeApp()');
            Android.closeApp();
            return;
        }
        if (typeof Android.finish === 'function') {
            console.log('📱 Android.finish()');
            Android.finish();
            return;
        }
    }

    // 3. Coba Cordova/PhoneGap
    if (typeof navigator !== 'undefined' && navigator.app) {
        if (typeof navigator.app.exitApp === 'function') {
            console.log('📱 navigator.app.exitApp()');
            navigator.app.exitApp();
            return;
        }
    }

    // 4. Coba window.close() - hanya untuk tab browser
    console.log('📱 window.close()');
    window.close();

    // 5. Fallback: redirect ke halaman kosong (tidak ideal, tapi lebih baik dari stuck)
    console.log('⚠️ Fallback: redirect ke about:blank');
    window.location.href = 'about:blank';
}

// ========== DETEKSI TOMBOL BACK ==========
function showNativeExitDialog() {
    console.log('📱 showNativeExitDialog() dipanggil');

    // Coba median.showDialog terlebih dahulu
    if (typeof median !== 'undefined' && typeof median.showDialog === 'function') {
        median.showDialog({
            title: "❓ Konfirmasi Keluar",
            message: "Apakah Anda yakin ingin keluar dari aplikasi JeGo?",
            buttons: [
                {
                    text: "Ya, Keluar",
                    style: "destructive",
                    callback: function() {
                        exitApp();
                    }
                },
                {
                    text: "Batal",
                    style: "cancel",
                    callback: function() {
                        console.log('❌ User membatalkan keluar');
                    }
                }
            ]
        });
        return;
    }

    // Fallback: confirm bawaan browser
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi JeGo?")) {
        exitApp();
    }
}

// ========== DETEKSI TOMBOL BACK DI ANDROID ==========
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    console.log('⬅️ Tombol BACK ditekan');
    showNativeExitDialog();
}, false);

// ========== FALLBACK UNTUK BROWSER (popstate) ==========
window.history.pushState(null, null, window.location.href);
window.addEventListener('popstate', function(event) {
    event.preventDefault();
    console.log('⬅️ Popstate terdeteksi');
    showNativeExitDialog();
    window.history.pushState(null, null, window.location.href);
});

console.log('✅ Konfirmasi keluar aplikasi aktif (exit-app.js)');
