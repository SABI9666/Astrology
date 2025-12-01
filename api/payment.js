// Payment API - Fixed UPI URLs (NOT encoded, as per working example)

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
    const upiName = process.env.UPI_NAME || 'CelestialOracle';
    
    // Amount as integer
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseInt(rawAmount, 10).toString();

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Clean name - encode spaces as %20
    const cleanName = encodeURIComponent(upiName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15));

    // Get host
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = protocol + '://' + host;

    // Build URLs exactly like the working example:
    // https://domain.com/pay.html?url=upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
    // NOT encoded!
    
    const urls = {
        // Generic UPI
        upi: baseUrl + '/pay.html?url=upi://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR',
        
        // Google Pay (tez scheme)
        gpay: baseUrl + '/pay.html?url=tez://upi/pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR',
        
        // PhonePe
        phonepe: baseUrl + '/pay.html?url=phonepe://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR',
        
        // Paytm
        paytm: baseUrl + '/pay.html?url=paytmmp://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR'
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










