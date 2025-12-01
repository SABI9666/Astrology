// Payment API - Fixed amount format for GPay

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'CelestialOracle';
    
    // Get amount as INTEGER - no decimals
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseInt(rawAmount, 10).toString(); // Ensures "100" not "100.00"

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Clean payee name - alphanumeric only, no spaces
    const cleanName = upiName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);

    // Build UPI URLs - SIMPLE format only
    const upiUrl = 'upi://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR';
    const gpayUrl = 'tez://upi/pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR';
    const phonepeUrl = 'phonepe://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR';
    const paytmUrl = 'paytmmp://pay?pa=' + upiId + '&pn=' + cleanName + '&am=' + amount + '&cu=INR';

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiName: cleanName,
            urls: {
                upi: upiUrl,
                gpay: gpayUrl,
                phonepe: phonepeUrl,
                paytm: paytmUrl
            }
        }
    });
}










