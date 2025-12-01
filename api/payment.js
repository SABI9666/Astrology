// Secure Payment API with rate limiting and validation
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // max 10 requests per minute per IP

export default function handler(req, res) {
    // Security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Rate limiting by IP
    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const now = Date.now();
    
    if (rateLimitMap.has(clientIP)) {
        const clientData = rateLimitMap.get(clientIP);
        if (now - clientData.firstRequest < RATE_LIMIT_WINDOW) {
            if (clientData.count >= MAX_REQUESTS) {
                return res.status(429).json({ 
                    success: false, 
                    message: 'Too many requests. Please wait a moment.' 
                });
            }
            clientData.count++;
        } else {
            rateLimitMap.set(clientIP, { firstRequest: now, count: 1 });
        }
    } else {
        rateLimitMap.set(clientIP, { firstRequest: now, count: 1 });
    }

    // Clean old entries periodically
    if (rateLimitMap.size > 1000) {
        for (const [ip, data] of rateLimitMap.entries()) {
            if (now - data.firstRequest > RATE_LIMIT_WINDOW * 5) {
                rateLimitMap.delete(ip);
            }
        }
    }

    // Get config from environment (secure)
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Celestial Oracle';
    const amount = process.env.PAYMENT_AMOUNT || '100';

    // Validate UPI ID format
    if (!upiId || !upiId.includes('@')) {
        return res.status(500).json({
            success: false,
            message: 'Payment system not configured properly.'
        });
    }

    // Validate amount is a positive number
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 100000) {
        return res.status(500).json({
            success: false,
            message: 'Invalid payment configuration.'
        });
    }

    // Sanitize name (remove special characters)
    const safeName = upiName.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
    
    // Build UPI URL with minimal params (more compatible)
    // Only essential params: pa (payee), pn (name), am (amount), cu (currency)
    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(safeName)}&am=${numAmount}&cu=INR`;

    return res.status(200).json({
        success: true,
        data: {
            amount: numAmount.toString(),
            // All apps use same base UPI URL - more reliable
            urls: {
                gpay: upiString,
                phonepe: upiString,
                paytm: upiString,
                upi: upiString
            },
            upiId: upiId
        },
        // Add timestamp for client-side validation
        timestamp: now
    });
}
