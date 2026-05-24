// netlify/functions/notifbca.js
const FIREBASE_DATABASE_URL = 'https://jego-35a2b-default-rtdb.asia-southeast1.firebasedatabase.app';

exports.handler = async (event) => {
  // Hanya menerima method POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parsing data dari Merchant BCA (application/x-www-form-urlencoded)
    let params;
    if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
      params = new URLSearchParams(event.body);
    } else {
      params = new URLSearchParams(event.body);
    }

    // Ambil field yang dikirim
    const title = params.get('title') || '';
    const text = params.get('text') || '';
    const subtext = params.get('subtext') || '';
    const bigtext = params.get('bigtext') || '';
    const infotext = params.get('infotext') || '';
    const pkg = params.get('pkg') || '';

    // Gabungkan semua teks untuk mencari nominal
    const fullText = `${title} ${text} ${subtext} ${bigtext} ${infotext}`;

    // Regex untuk ekstrak nominal (contoh: Rp50.000 atau Rp 50,000)
    const nominalRegex = /Rp\s?([\d\.,]+)/i;
    const matchNominal = fullText.match(nominalRegex);
    let amount = 0;
    if (matchNominal) {
      let rawNominal = matchNominal[1].replace(/\./g, '').replace(/,/g, '');
      amount = parseInt(rawNominal);
    }

    // Siapkan data untuk disimpan ke Firebase
    const notifData = {
      timestamp: Date.now(),
      title,
      text,
      subtext,
      bigtext,
      infotext,
      pkg,
      amount,
      rawFull: fullText,
      read: false
    };

    // Simpan ke Firebase Realtime Database (path /webhook_notifications)
    const saveResponse = await fetch(`${FIREBASE_DATABASE_URL}/webhook_notifications.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifData)
    });

    if (!saveResponse.ok) {
      throw new Error('Gagal menyimpan ke Firebase');
    }

    console.log('✅ Notifikasi berhasil disimpan ke Firebase:', notifData);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notifikasi diterima' })
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
