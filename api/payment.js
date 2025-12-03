// fileName: api/payment.js

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // 1. Load exact details from Environment
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'COS5'; // Default from image
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    
    // Ensure amount is formatted correctly (e.g. "100.00")
    const amount = parseFloat(rawAmount).toFixed(2);

    if (!upiId) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // 2. Build the redirect URL with all necessary parameters for GPay
    // pa = Payment Address (UPI ID)
    // pn = Payee Name (Required for GPay)
    // am = Amount
    const payUrl = baseUrl + '/pay.html' + 
                   '?pa=' + encodeURIComponent(upiId) + 
                   '&pn=' + encodeURIComponent(upiName) + 
                   '&am=' + amount;

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiName: upiName,
            urls: {
                upi: payUrl,
                gpay: payUrl,
                phonepe: payUrl,
                paytm: payUrl
            }
        }
    });
}
