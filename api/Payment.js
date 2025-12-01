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

    // Generate UPI payment URLs
    const txnId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);
    const note = 'Astrology Reading';

    const params = new URLSearchParams({
        pa: upiId,
        pn: upiName,
        am: amount,
        cu: 'INR',
        tn: note,
        tr: txnId
    });

    const baseUpiUrl = `upi://pay?${params.toString()}`;

    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUpiUrl)}`;

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            txnId: txnId,
            // Payment URLs for different apps
            urls: {
                gpay: `gpay://upi/pay?${params.toString()}`,
                phonepe: `phonepe://pay?${params.toString()}`,
                paytm: `paytmmp://pay?${params.toString()}`,
                upi: baseUpiUrl
            },
            qrCode: qrUrl,
            // Only show masked UPI ID for display (security)
            displayUpiId: upiId.replace(/(.{3}).*(@.*)/, '$1***$2')
        }
    });
}
