export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Get UPI ID from environment variable (secure - not exposed to frontend)
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Celestial Oracle';
    const amount = process.env.PAYMENT_AMOUNT || '100';

    if (!upiId) {
        return res.status(500).json({
            success: false,
            message: 'Payment not configured. Please set UPI_ID in environment variables.'
        });
    }

    // Encode values properly for URL
    const encodedName = encodeURIComponent(upiName);
    const encodedNote = encodeURIComponent('Astrology Reading');

    // Build UPI URL with proper encoding (no transaction ID - causes issues with some apps)
    const upiParams = `pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;
    
    // Base UPI URL (works with all UPI apps)
    const baseUpiUrl = `upi://pay?${upiParams}`;

    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUpiUrl)}`;

    // Intent URLs for specific apps
    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            urls: {
                // GPay intent - use tez:// for Google Pay
                gpay: `tez://upi/pay?${upiParams}`,
                // PhonePe intent
                phonepe: `phonepe://pay?${upiParams}`,
                // Paytm intent  
                paytm: `paytmmp://upi/pay?${upiParams}`,
                // Generic UPI - opens app chooser
                upi: baseUpiUrl
            },
            qrCode: qrUrl,
            upiId: upiId
        }
    });
}
