// Payment API - Minimal UPI params (fixes limit error)

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
    
    // Amount - clean integer only
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = Math.floor(parseFloat(rawAmount)).toString();

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Get host
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // MINIMAL UPI URL - only essential params
    // Format: upi://pay?pa=UPI_ID&am=AMOUNT&cu=INR
    // Skip pn (payee name) as it can cause issues
    
    const minimalParams = 'pa=' + upiId + '&am=' + amount + '&cu=INR';
    
    // All use same upi:// scheme (most compatible)
    const urls = {
        upi: baseUrl + '/pay.html?pa=' + upiId + '&am=' + amount,
        gpay: baseUrl + '/pay.html?pa=' + upiId + '&am=' + amount,
        phonepe: baseUrl + '/pay.html?pa=' + upiId + '&am=' + amount,
        paytm: baseUrl + '/pay.html?pa=' + upiId + '&am=' + amount
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










