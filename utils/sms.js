// SMS bhejne ke liye (forgot-password OTP seedha phone par).
// .env mein SMS_PROVIDER set karo:
//   fast2sms  -> India ke liye (https://www.fast2sms.com) — FAST2SMS_API_KEY chahiye
//   twilio    -> worldwide (https://www.twilio.com)       — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM chahiye
// Khali chhodoge to SMS nahi jayega (sirf email OTP chalega).
// Node 18+ ka built-in fetch use hota hai, koi extra package nahi chahiye.

const provider = () => String(process.env.SMS_PROVIDER || '').trim().toLowerCase();

const smsEnabled = () => {
  const p = provider();
  if (p === 'fast2sms') return !!process.env.FAST2SMS_API_KEY;
  if (p === 'twilio') return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  return false;
};

// phone = 10 digit Indian number (jaise 9876543210). true = SMS gaya, false = SMS configured nahi hai
async function sendSms(phone, text) {
  const p = provider();
  if (!smsEnabled()) return false;

  if (p === 'fast2sms') {
    const r = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: process.env.FAST2SMS_ROUTE || 'q', message: text, numbers: phone, flash: 0 })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.return === false) throw new Error('Fast2SMS: ' + (j.message || r.status));
    return true;
  }

  if (p === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(sid + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64');
    const to = process.env.SMS_COUNTRY_CODE ? process.env.SMS_COUNTRY_CODE + phone : '+91' + phone;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: text }).toString()
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Twilio: ' + (j.message || r.status));
    return true;
  }
  return false;
}

module.exports = { sendSms, smsEnabled };
