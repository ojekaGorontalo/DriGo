<script>
(function () {

    function isAndroidWebView() {
        const ua = navigator.userAgent;

        return (
            /wv/.test(ua) ||
            /Version\/[\d.]+ Chrome\/[\d.]+ Mobile/.test(ua) ||
            /; wv\)/.test(ua) ||
            ua.includes("JeGo-Android-App")
        );
    }

    const host = location.hostname;

    const isLocal =
        host === "localhost" ||
        host === "127.0.0.1";

    if (!isAndroidWebView() && !isLocal) {

        document.documentElement.innerHTML = `
        <head>
            <title>Akses Ditolak</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
        </head>

        <body style="
            margin:0;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            font-family:sans-serif;
            background:#fff3e0;
            text-align:center;
            padding:20px;
        ">

            <div>
                <h2>⚠️ Akses Ditolak</h2>

                <p>
                    Halaman ini hanya dapat dibuka melalui aplikasi resmi JeGo.
                </p>

                <button
                    onclick="location.href='https://play.google.com/store/apps/details?id=com.jego.app'"
                    style="
                        padding:14px 20px;
                        border:none;
                        border-radius:10px;
                        background:#ff9800;
                        color:white;
                        font-weight:bold;
                    "
                >
                    Download Aplikasi
                </button>
            </div>

        </body>
        `;

        throw new Error("Blocked Browser Access");
    }

})();
</script>
