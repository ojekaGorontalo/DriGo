<script>
(function () {

    function isWebView() {
        const ua = navigator.userAgent.toLowerCase();

        const isAndroidWebView =
            ua.includes("wv") ||
            (ua.includes("android") && ua.includes("; wv)"));

        const isCrosswalk = ua.includes("crosswalk");
        const isMedian = ua.includes("median");

        const isTWA =
            document.referrer &&
            document.referrer.startsWith("android-app://");

        return isAndroidWebView || isCrosswalk || isMedian || isTWA;
    }

    const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname.includes("127.0.0.1");

    if (!isWebView() && !isLocal) {
        document.body.innerHTML = `
            <div style="
                text-align:center;
                padding:50px;
                font-family:sans-serif;
            ">
                <h2>⚠️ Akses Ditolak</h2>
                <p>
                    Aplikasi JeGo hanya dapat diakses melalui APK resmi.
                </p>

                <a href="https://play.google.com/store/apps/details?id=com.jego.app">
                    <button style="
                        padding:12px 20px;
                        background:#FF9800;
                        color:white;
                        border:none;
                        border-radius:10px;
                        font-weight:bold;
                    ">
                        Download Aplikasi
                    </button>
                </a>
            </div>
        `;

        return;
    }

})();
</script>
