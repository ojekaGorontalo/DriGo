// netlify/functions/qris.js
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Ambil parameter dari GET atau POST
  let amount, fee, qrisCode;
  if (event.httpMethod === 'GET') {
    amount = event.queryStringParameters.amount;
    fee = event.queryStringParameters.fee || '0';
    qrisCode = event.queryStringParameters.codeqr;
  } else {
    try {
      const body = JSON.parse(event.body);
      amount = body.amount;
      fee = body.fee || 0;
      qrisCode = body.codeqr;
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body tidak valid' }) };
    }
  }

  if (!amount || !qrisCode) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Parameter amount dan codeqr wajib diisi' }) };
  }

  const nominal = parseInt(amount);
  const biayaAdmin = parseInt(fee);
  if (isNaN(nominal) || nominal <= 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nominal tidak valid' }) };
  }

  const totalAmount = nominal + biayaAdmin;

  try {
    const dynamicQR = convertStaticToDynamic(qrisCode, totalAmount);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: true,
        qr: dynamicQR,
        amount: nominal,
        fee: biayaAdmin,
        total: totalAmount,
        merchant: extractMerchantName(qrisCode)
      })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// Fungsi konversi QRIS statis ke dinamis (dengan update CRC)
function convertStaticToDynamic(qrString, amount) {
  let cleanQR = qrString.replace(/\s/g, '');
  if (cleanQR.length < 4) throw new Error('QR string terlalu pendek');
  
  const oldChecksum = cleanQR.slice(-4);
  let withoutChecksum = cleanQR.slice(0, -4);
  
  const amountValue = amount.toString();
  const amountField = `54${amountValue.length.toString().padStart(2, '0')}${amountValue}`;
  const amountRegex = /54\d{2}\d+/;
  
  if (amountRegex.test(withoutChecksum)) {
    withoutChecksum = withoutChecksum.replace(amountRegex, amountField);
  } else {
    withoutChecksum = withoutChecksum + amountField;
  }
  
  const newCRC = calculateCRC16(withoutChecksum);
  const newChecksum = newCRC.toString(16).toUpperCase().padStart(4, '0');
  return withoutChecksum + newChecksum;
}

function calculateCRC16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc;
}

function extractMerchantName(qrString) {
  const merchantRegex = /59(\d{2})([A-Za-z0-9\s]+)/;
  const match = qrString.match(merchantRegex);
  if (match && match[2]) {
    const length = parseInt(match[1]);
    return match[2].substring(0, length);
  }
  return 'Merchant QRIS';
}
