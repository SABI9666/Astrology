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

    // POST = verify token, GET = generate payment
    if (req.method === 'POST') {
        // Verify payment token
        const { token } = req.body || {};
        
        if (!token) {
            return res.status(400).json({ success: false, valid: false, message: 'No token provided' });
        }

        cleanExpiredTokens();

        if (validTokens.has(token)) {
            const tokenData = validTokens.get(token);
            // Token can only be used once
            validTokens.delete(token);
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
    const amount = process.env.PAYMENT_AMOUNT || '100';

    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({ success: false, message: 'Payment not configured' });
    }

    // Generate unique payment token
    const paymentToken = crypto.randomBytes(32).toString('hex');
    
    // Store token with timestamp
    cleanExpiredTokens();
    validTokens.set(paymentToken, {
        created: Date.now(),
        amount: amount
    });

    // Build simple UPI URL (most compatible format)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;

    return res.status(200).json({
        success: true,
        data: {
            amount: amount,
            upiId: upiId,
            upiUrl: upiUrl,
            token: paymentToken,
            expiresIn: TOKEN_EXPIRY
        }
    });
}
