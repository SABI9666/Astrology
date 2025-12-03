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

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'COS 5'; // Default name is required
    
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = Math.floor(parseFloat(rawAmount)).toString(); // Ensure no decimals for simple UPI

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // UPDATED: Added 'pn' (Payee Name) to the URL parameters
    const payUrl = baseUrl + '/pay.html?pa=' + encodeURIComponent(upiId) + 
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
