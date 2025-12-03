// api/payment.js - Uses exact GPay QR code format

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Hardcoded from your GPay QR code - these are verified working values
    const upiId = 'pradeeksha798-1@okhdfcbank';
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = Math.round(parseFloat(rawAmount)).toString();

    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // Simple URL - all UPI details are hardcoded in pay.html
    const payUrl = baseUrl + '/pay.html?am=' + amount;

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
















