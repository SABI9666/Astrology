// api/payment.js - Direct UPI payment (no pn parameter)

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const upiId = process.env.UPI_ID;  // pradeeksha798-1@okhdfcbank
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseFloat(rawAmount).toFixed(2);

    if (!upiId) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // Only pa and am - NO pn parameter
    const payUrl = baseUrl + '/pay.html?pa=' + encodeURIComponent(upiId) + '&am=' + amount;

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            urls: {
                upi: payUrl,
                gpay: payUrl,
                phonepe: payUrl,
                paytm: payUrl
            }
        }
    });
}
















