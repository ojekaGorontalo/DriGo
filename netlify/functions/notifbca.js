exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let params;
  if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
    params = new URLSearchParams(event.body);
  } else {
    params = event.queryStringParameters || {};
  }

  const text = params.get('text') || '';
  console.log('📩 Notifikasi dari Merchant BCA:', text);

  // Contoh parsing: cari nominal dengan regex
  const nominalMatch = text.match(/Rp[\s]*([\d\.\,]+)/);
  const nominal = nominalMatch ? parseInt(nominalMatch[1].replace(/\./g, '')) : 0;

  if (nominal > 0) {
    // Lanjutkan: cocokkan dengan permintaan deposit di Firebase, lalu tambah saldo driver
    // Misal: const driverId = findDriverFromNote(text);
    // await updateBalance(driverId, nominal);
    console.log(`💰 Transaksi terdeteksi: Rp ${nominal}`);
  }

  return { statusCode: 200, body: 'OK' };
};
