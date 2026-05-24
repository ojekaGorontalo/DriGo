// netlify/functions/notifBCA.js
const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK (cara sederhana)
// Anda perlu menyimpan service account JSON di environment variable atau fallback ke konfigurasi
// Untuk kemudahan, kita bisa memanfaatkan Firebase Realtime Database REST API (contoh di bawah)
// Namun jika sudah punya SDK, silakan. Karena Netlify Function tidak memiliki state,
// kita bisa fetch langsung menggunakan fetch API.

// Gunakan fetch untuk akses Firebase REST (lebih ringan)
const FIREBASE_DATABASE_URL = 'https://jego-35a2b-default-rtdb.asia-southeast1.firebasedatabase.app';

exports.handler = async (event) => {
  // Hanya terima POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Aplikasi Merchant BCA mengirim data sebagai application/x-www-form-urlencoded
    let params;
    if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
      params = new URLSearchParams(event.body);
    } else {
      params = new URLSearchParams(event.body); // fallback
    }

    // Ambil data notifikasi
    const title = params.get('title') || '';
    const text = params.get('text') || '';
    const subtext = params.get('subtext') || '';
    const bigtext = params.get('bigtext') || '';
    const infoText = params.get('infotext') || '';

    console.log('📨 Notifikasi diterima:', { title, text, subtext, bigtext, infoText });

    // Gabungkan semua teks untuk mencari nominal & kode unik
    const fullText = `${title} ${text} ${subtext} ${bigtext} ${infoText}`;
    
    // Regex untuk mencari nominal (contoh: Rp50.000 atau Rp 50,000 atau 50000)
    const nominalRegex = /Rp\s?([\d\.,]+)/i;
    const matchNominal = fullText.match(nominalRegex);
    if (!matchNominal) {
      console.log('❌ Tidak ditemukan nominal, abaikan');
      return { statusCode: 200, body: 'No nominal found' };
    }
    
    let rawNominal = matchNominal[1].replace(/\./g, '').replace(/,/g, '');
    const amount = parseInt(rawNominal);
    if (isNaN(amount)) {
      console.log('❌ Nominal tidak valid:', rawNominal);
      return { statusCode: 200, body: 'Invalid amount' };
    }
    
    console.log(`💰 Nominal terdeteksi: Rp ${amount}`);
    
    // Cari di Firebase permintaan deposit dengan uniqueAmount = amount
    const pendingRef = `${FIREBASE_DATABASE_URL}/driver_balance_logs.json?orderBy="uniqueAmount"&equalTo=${amount}`;
    const response = await fetch(pendingRef);
    const data = await response.json();
    
    if (!data) {
      console.log('ℹ️ Tidak ada permintaan pending dengan nominal tersebut.');
      return { statusCode: 200, body: 'No matching pending deposit' };
    }
    
    // Data berformat: { uid: { logId: { ... } } }
    let foundUid = null;
    let foundLogId = null;
    let depositData = null;
    
    for (const uid in data) {
      for (const logId in data[uid]) {
        const log = data[uid][logId];
        if (log.status === 'pending' && log.uniqueAmount === amount) {
          foundUid = uid;
          foundLogId = logId;
          depositData = log;
          break;
        }
      }
      if (foundUid) break;
    }
    
    if (!foundUid) {
      console.log('ℹ️ Tidak ada permintaan pending yang cocok.');
      return { statusCode: 200, body: 'No matching pending deposit' };
    }
    
    console.log(`✅ Cocok dengan driver ${foundUid}, logId ${foundLogId}`);
    
    // Ambil saldo driver saat ini
    const driverRef = `${FIREBASE_DATABASE_URL}/drivers/${foundUid}/balance.json`;
    const balanceRes = await fetch(driverRef);
    const currentBalance = (await balanceRes.json()) || 0;
    const newBalance = currentBalance + depositData.amount; // depositData.amount adalah deposit murni (tanpa kode unik)
    
    // Update saldo driver
    const updateBalance = await fetch(`${FIREBASE_DATABASE_URL}/drivers/${foundUid}/balance.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBalance)
    });
    if (!updateBalance.ok) throw new Error('Gagal update saldo');
    
    // Update status deposit log menjadi success
    const updateStatus = await fetch(`${FIREBASE_DATABASE_URL}/driver_balance_logs/${foundUid}/${foundLogId}/status.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('success')
    });
    if (!updateStatus.ok) throw new Error('Gagal update status log');
    
    // Catat riwayat transaksi di drivers/{uid}/deposits/{paymentId}/status = 'success'
    const paymentId = depositData.paymentId;
    if (paymentId) {
      await fetch(`${FIREBASE_DATABASE_URL}/drivers/${foundUid}/deposits/${paymentId}/status.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('success')
      });
    }
    
    console.log(`✅ Saldo driver ${foundUid} berhasil ditambah Rp ${depositData.amount}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Saldo driver berhasil ditambah' })
    };
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
