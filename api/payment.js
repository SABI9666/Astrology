// Secure Payment API with token generation
const crypto = require('crypto');

// Store valid tokens (in production, use Redis/database)
const validTokens = new Map();
const TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Clean expired tokens periodically
function cleanExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of validTokens.entries()) {
        if (now - data.created > TOKEN_EXPIRY) {
            validTokens.delete(token);
        }
    }
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // POST = verify token
    if (req.method === 'POST') {
        const { token } = req.body || {};
        
        if (!token) {
            return res.status(400).json({ success: false, valid: false, message: 'No token provided' });
        }

        cleanExpiredTokens();

        if (validTokens.has(token)) {
            const tokenData = validTokens.get(token);
            validTokens.delete(token); // Token can only be used once
            return res.status(200).json({ success: true, valid: true, amount: tokenData.amount });
        }

        return res.status(400).json({ success: false, valid: false, message: 'Invalid or expired token' });
    }

    // GET = generate payment details
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Celestial Oracle';
    
    // FIX 1: Ensure amount has 2 decimal places (e.g. "100.00")
    // GPay often rejects whole numbers without decimals
    let rawAmount = process.env.PAYMENT_AMOUNT || '100';
    const amount = parseFloat(rawAmount).toFixed(2); 

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    const paymentToken = crypto.randomBytes(32).toString('hex');
    
    cleanExpiredTokens();
    validTokens.set(paymentToken, {
        created: Date.now(),
        amount: amount
    });

    // FIX 2: Added 'tn' (Transaction Note) and 'tr' (Transaction Ref)
    // These are required by many apps to validate the transaction type
    const upiParams = `pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=AstrologyReading&tr=${paymentToken}`;
    
    const upiUrl = `upi://pay?${upiParams}`;

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            urls: {
                // Revised GPay URLs
                gpay1: `upi://pay?${upiParams}`,               // Standard UPI (Best for modern GPay)
                gpay2: `gpay://upi/pay?${upiParams}`,          // GPay Scheme
                gpay3: `tez://upi/pay?${upiParams}`,           // Old Tez Scheme
                
                phonepe: `phonepe://pay?${upiParams}`,
                paytm: `paytmmp://pay?${upiParams}`,
                upi: upiUrl
            },
            token: paymentToken,
            expiresIn: TOKEN_EXPIRY
        }
    });
}
