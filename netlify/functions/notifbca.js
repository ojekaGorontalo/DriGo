// netlify/functions/notifbca.js
const FIREBASE_DATABASE_URL = 'https://jego-35a2b-default-rtdb.asia-southeast1.firebasedatabase.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Ambil raw body mentah
  const rawBody = event.body;
  console.log('Raw body:', rawBody);

  // Coba parsing sebagai form-urlencoded atau JSON
  let allParams = {};
  const contentType = event.headers['content-type'] || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody);
    for (let [k, v] of params.entries()) allParams[k] = v;
  } else if (contentType.includes('application/json')) {
    try {
      allParams = JSON.parse(rawBody);
    } catch(e) {}
  } else {
    // fallback: coba sebagai string query
    const params = new URLSearchParams(rawBody);
    for (let [k, v] of params.entries()) allParams[k] = v;
  }

  // Ekstrak beberapa field umum
  const title = allParams.title || allParams.Title || '';
  const text = allParams.text || allParams.Text || allParams.body || allParams.message || '';
  const pkg = allParams.pkg || '';

  // Gabungkan untuk cari nominal
  const fullText = `${title} ${text}`;
  const nominalRegex = /Rp\s?([\d\.,]+)/i;
  const matchNominal = fullText.match(nominalRegex);
  let amount = 0;
  if (matchNominal) {
    let rawNominal = matchNominal[1].replace(/\./g, '').replace(/,/g, '');
    amount = parseInt(rawNominal);
  }

  // Data yang akan disimpan
  const notifData = {
    timestamp: Date.now(),
    title,
    text,
    pkg,
    amount,
    rawFull: fullText,
    rawBody: rawBody,
    allParams: allParams,
    read: false
  };

  // Simpan ke Firebase
  try {
    await fetch(`${FIREBASE_DATABASE_URL}/webhook_notifications.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifData)
    });
    console.log('✅ Data disimpan');
  } catch (err) {
    console.error('Gagal simpan:', err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OK' })
  };
};
