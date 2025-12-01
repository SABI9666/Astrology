// Payment API - Fixed UPI amount format for GPay

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
    const upiName = process.env.UPI_NAME || 'Celestial Oracle';
    
    // Get amount - keep as simple number string
    const rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseFloat(rawAmount).toString(); // "100" not "100.00"

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Clean payee name - only alphanumeric and spaces
    const cleanName = upiName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 20);

    // Build UPI URL manually - GPay is very specific about format
    // Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
    const upiBase = `pa=${upiId}&pn=${encodeURIComponent(cleanName)}&am=${amount}&cu=INR`;
    
    // Different URL schemes
    const urls = {
        // Standard UPI intent
        upi: `upi://pay?${upiBase}`,
        
        // Google Pay (tez scheme works best)
        gpay: `tez://upi/pay?${upiBase}`,
        
        // PhonePe
        phonepe: `phonepe://pay?${upiBase}`,
        
        // Paytm
        paytm: `paytmmp://pay?${upiBase}`
    };

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiName: cleanName,
            urls: urls
        }
    });
}
