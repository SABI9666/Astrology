// Verification Request API - Creates secure verification link
const crypto = require('crypto');

// Create HMAC signature for data integrity
function signData(data, secret) {
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { 
            name, birthDate, birthTime, birthPlace, 
            language, gender, questions 
        } = req.body;

        // Validate required fields
        if (!name || !birthDate || !birthTime || !birthPlace) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const secret = process.env.ADMIN_SECRET || 'celestial2024';

        // Create verification data (compact keys to save URL space)
        const verificationData = {
            n: name.substring(0, 50),
            bd: birthDate,
            bt: birthTime,
            bp: birthPlace.substring(0, 100),
            l: language || 'english',
            g: gender || 'other',
            q: (questions || 'Complete life reading').substring(0, 300),
            t: Date.now()
        };

        // Create signature (for data integrity, NOT for authentication)
        const signature = signData(verificationData, secret);
        
        // Encode data for URL
        const encodedData = encodeData(verificationData);

        // Build approval URL (NO secret in URL - admin will enter password)
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const approvalUrl = `${protocol}://${host}/api/approve?d=${encodedData}&sig=${signature}`;

        // WhatsApp number
        const whatsappNumber = process.env.WHATSAPP_NUMBER || '917907691760';

        // Create WhatsApp message
        const whatsappMessage = `🔮 *PAYMENT VERIFICATION REQUEST*

👤 *Name:* ${name}
📅 *DOB:* ${birthDate}
⏰ *Time:* ${birthTime}
📍 *Place:* ${birthPlace}
🌐 *Language:* ${language || 'English'}

🔐 *Approval Link:*
${approvalUrl}

_(Password required to approve)_`;

        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

        return res.status(200).json({
            success: true,
            data: {
                whatsappUrl,
                approvalUrl,
                message: 'Send WhatsApp message to request verification'
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
