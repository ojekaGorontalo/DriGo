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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Akses Ditolak - JeGo</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
                    font-family: 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .card {
                    max-width: 400px;
                    width: 100%;
                    background: rgba(255,255,255,0.96);
                    backdrop-filter: blur(2px);
                    border-radius: 48px;
                    padding: 40px 28px;
                    text-align: center;
                    box-shadow: 0 25px 45px rgba(0,0,0,0.15);
                    border: 1px solid rgba(255,152,0,0.3);
                    transition: transform 0.2s ease;
                }
                .card:hover {
                    transform: translateY(-5px);
                }
                .icon {
                    width: 90px;
                    height: 90px;
                    background: linear-gradient(135deg, #FF9800, #FF5722);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 48px;
                    box-shadow: 0 12px 20px rgba(255,87,34,0.3);
                }
                h2 {
                    font-size: 1.9rem;
                    color: #E65100;
                    margin-bottom: 12px;
                    font-weight: 800;
                }
                p {
                    font-size: 1rem;
                    color: #5a5a5a;
                    margin-bottom: 28px;
                    line-height: 1.5;
                }
                .btn-download {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(95deg, #FF9800, #F57C00);
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 60px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    box-shadow: 0 8px 18px rgba(255,152,0,0.4);
                }
                .btn-download:active {
                    transform: scale(0.96);
                    box-shadow: 0 4px 12px rgba(255,152,0,0.5);
                }
                .badge {
                    margin-top: 24px;
                    font-size: 0.7rem;
                    color: #b98f5c;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">
                    🔒
                </div>
                <h2>Akses Ditolak</h2>
                <p>
                    Halaman ini hanya dapat diakses melalui <strong>aplikasi resmi JeGo</strong>.<br>
                    Silakan unduh aplikasi dari Play Store.
                </p>
                <button class="btn-download" onclick="location.href='https://play.google.com/store/apps/details?id=com.jego.app'">
                    📲 Download Aplikasi
                </button>
                <div class="badge">
                    JeGo | Transportasi & Kurir Gorontalo
                </div>
            </div>
        </body>
        </html>
        `;
        throw new Error("Browser blocked");
    }
})();
