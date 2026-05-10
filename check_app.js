(function () {

    function isJeGoApp() {

        const ua = navigator.userAgent.toLowerCase();

        return ua.includes('jego-android-app');
    }

    const isLocal =
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';

    if (!isJeGoApp() && !isLocal) {

        document.documentElement.innerHTML = `
        <body style="
            margin:0;
            height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
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
                        padding:14px 22px;
                        background:#ff9800;
                        color:white;
                        border:none;
                        border-radius:10px;
                        font-weight:bold;
                    "
                >
                    Download Aplikasi
                </button>
            </div>
        </body>
        `;

        throw new Error("Browser blocked");
    }

})();
