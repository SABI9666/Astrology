// Verification Request API - Encodes data in URL (no server storage needed)
const crypto = require('crypto');

// Secret for signing (use env variable)
function getSecret() {
    return process.env.ADMIN_SECRET || 'celestial2024';
}

// Create signature for data
function signData(data) {
    const secret = getSecret();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex').substring(0, 16);
}

// Encode data to base64 URL-safe
function encodeData(data) {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // POST = Create new verification request
    if (req.method === 'POST') {
        try {
            const { 
                name, birthDate, birthTime, birthPlace, 
                language, gender, questions, paymentToken 
            } = req.body;

            // Validate required fields
            if (!name || !birthDate || !birthTime || !birthPlace) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields' 
                });
            }

            // Create verification data
            const verificationData = {
                n: name.substring(0, 50),           // name
                bd: birthDate,                       // birthDate
                bt: birthTime,                       // birthTime
                bp: birthPlace.substring(0, 100),   // birthPlace
                l: language || 'english',            // language
                g: gender || 'other',                // gender
                q: (questions || 'Complete life reading').substring(0, 500), // questions
                t: Date.now()                        // timestamp
            };

            // Create signature
            const signature = signData(verificationData);
            
            // Encode data for URL
            const encodedData = encodeData(verificationData);

            // Build approval URL
            const host = req.headers.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const approvalUrl = `${protocol}://${host}/api/approve?d=${encodedData}&s=${signature}`;

            // WhatsApp number from env
            const whatsappNumber = process.env.WHATSAPP_NUMBER || '917907691760';

            // Create WhatsApp message (shorter for better delivery)
            const whatsappMessage = `🔮 *PAYMENT VERIFICATION*

👤 ${name}
📅 ${birthDate} | ⏰ ${birthTime}
📍 ${birthPlace}

✅ CLICK TO APPROVE:
${approvalUrl}`;

            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

            return res.status(200).json({
                success: true,
                data: {
                    verificationId: signature,
                    encodedData,
                    signature,
                    whatsappUrl,
                    approvalUrl,
                    message: 'Send WhatsApp message to complete verification'
                }
            });

        } catch (error) {
            console.error('Verify request error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error creating verification request' 
            });
        }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
}
