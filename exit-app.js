// ========== KONFIRMASI KELUAR APLIKASI ==========
function exitApp() {
    // Coba keluar via Median bridge
    if (typeof median !== 'undefined' && median.exitApp) {
        median.exitApp();
    } 
    // Fallback untuk Android native
    else if (typeof Android !== 'undefined' && Android.exitApp) {
        Android.exitApp();
    }
    // Fallback untuk Cordova/PhoneGap
    else if (typeof navigator !== 'undefined' && navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
    }
    // Fallback terakhir (browser)
    else {
        window.close();
    }
}

function showNativeExitDialog() {
    if (typeof median !== 'undefined' && median.showDialog) {
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
                    callback: function() {}
                }
            ]
        });
    } else {
        if (confirm("Apakah Anda yakin ingin keluar dari aplikasi JeGo?")) {
            exitApp();
        }
    }
}

// ========== DETEKSI TOMBOL BACK ==========
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    showNativeExitDialog();
}, false);

// Fallback untuk browser (popstate)
window.history.pushState(null, null, window.location.href);
window.addEventListener('popstate', function(event) {
    event.preventDefault();
    showNativeExitDialog();
    window.history.pushState(null, null, window.location.href);
});

console.log('✅ Konfirmasi keluar aplikasi aktif');
