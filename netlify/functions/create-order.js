// netlify/functions/create-order.js
// Razorpay order server pe banao — amount browser se nahi aayega (security!)

exports.handler = async function(event, context) {

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { userName, userEmail } = body;

    if (!userName || !userEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'naam aur email zaroori hai' })
      };
    }

    // Razorpay Order banao — amount HAMESHA server pe fix rahega
    // Koi browser se amount 0 ya kuch aur nahi bhej sakta
    const authHeader = 'Basic ' + Buffer.from(
      process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET
    ).toString('base64');

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: 100,          // ₹1 = 100 paise — server pe fixed, tamper nahi ho sakta
        currency: 'INR',
        receipt: 'iq_' + Date.now(),
        notes: {
          customer_name: userName,
          customer_email: userEmail
        }
      })
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error('Razorpay order error:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Order create nahi hua' })
      };
    }

    const order = await orderRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
