// netlify/functions/check-app.js
exports.handler = async (event, context) => {
  // Ambil user agent dari request
  const userAgent = event.headers['user-agent'] || '';

  // Ganti dengan custom user agent yang Anda set di median.co
  const SECRET_UA = 'JeGo-Android-App/2.0.0 (Secure)';

  // Jika tidak cocok, blokir
  if (!userAgent.includes(SECRET_UA)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: '🚫 Akses ditolak. Gunakan aplikasi JeGo resmi.',
        download: 'https://play.google.com/store/apps/details?id=com.jego.app'
      })
    };
  }

  // Jika cocok, izinkan akses ke file HTML/asset
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OK' })
  };
};
