// Payment API - sends to test page

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
    const upiName = process.env.UPI_NAME || 'Payment';
    
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = Math.floor(parseFloat(rawAmount)).toString();

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // All buttons go to same test page
    const testUrl = baseUrl + '/pay.html?pa=' + encodeURIComponent(upiId) + '&am=' + amount;

    const urls = {
        upi: testUrl,
        gpay: testUrl,
        phonepe: testUrl,
        paytm: testUrl
    };

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiName: upiName,
            urls: urls
        }
    });
}










