// Payment API - Fixed UPI URL formatting
const crypto = require('crypto');

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
    
    // Get amount and ensure proper format
    let rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseFloat(rawAmount).toFixed(2);

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Generate unique transaction reference
    const txnRef = 'CO' + Date.now().toString(36).toUpperCase();
    
    // FIXED: Proper UPI URL format
    // Key fixes:
    // 1. Use simple encoding
    // 2. Amount without quotes
    // 3. Proper parameter order
    // 4. No special characters in transaction note
    
    const params = new URLSearchParams();
    params.append('pa', upiId);                    // Payee address (UPI ID)
    params.append('pn', upiName.replace(/[^a-zA-Z0-9 ]/g, '')); // Payee name (alphanumeric only)
    params.append('am', amount);                   // Amount
    params.append('cu', 'INR');                    // Currency
    params.append('tn', 'Astrology Reading');      // Transaction note (simple text)
    
    const upiString = params.toString();
    
    // Different URL schemes for different apps
    const urls = {
        // Standard UPI intent (works with most apps)
        upi: `upi://pay?${upiString}`,
        
        // Google Pay specific
        gpay: `tez://upi/pay?${upiString}`,
        
        // PhonePe
        phonepe: `phonepe://pay?${upiString}`,
        
        // Paytm
        paytm: `paytmmp://pay?${upiString}`,
        
        // BHIM
        bhim: `upi://pay?${upiString}`
    };

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiName: upiName,
            txnRef: txnRef,
            urls: urls,
            // Also provide raw params for debugging
            rawParams: upiString
        }
    });
}
