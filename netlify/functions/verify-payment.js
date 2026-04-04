// netlify/functions/verify-payment.js
// Ye function server pe chalega — browser se koi cheat nahi kar sakta

const crypto = require('crypto');

exports.handler = async function(event, context) {

  // Sirf POST allow karo
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userName,
      userEmail,
      iqScore,
      iqLevel,
      correct,
      total,
      percentile,
      gender
    } = body;

    // ── STEP 1: Razorpay Signature Verify karo ──
    // Ye sabse important part hai — bina is ke koi bhi fake payment_id bhej sakta tha
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Invalid signature!', { expectedSignature, razorpay_signature });
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Payment verification failed' })
      };
    }

    // ── STEP 2: Signature sahi hai — EmailJS se email bhejo ──
    const date = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_name: userName,
          to_email: userEmail,
          iq_score: iqScore,
          iq_level: iqLevel,
          correct: correct,
          total: total,
          percentile: percentile,
          payment_id: razorpay_payment_id,
          gender: gender,
          date: date,
          site_name: process.env.SITE_NAME || 'IQTest.in',
          site_url: process.env.SITE_URL || 'https://iqtest.in'
        }
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('EmailJS error:', errText);
      // Payment verify ho gayi, email mein dikkat — phir bhi success return karo
      // Tum manually Razorpay dashboard se dekh sakte ho
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, emailSent: false, warning: 'Email issue' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailSent: true })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
};
