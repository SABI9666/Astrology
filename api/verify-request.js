// Verification Request API - Stores pending requests for WhatsApp approval
const crypto = require('crypto');

// In-memory store for pending verifications (use Redis/DB in production)
// This is shared across the serverless functions via module scope
if (!global.pendingVerifications) {
    global.pendingVerifications = new Map();
}

const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Clean expired verifications
function cleanExpiredVerifications() {
    const now = Date.now();
    for (const [id, data] of global.pendingVerifications.entries()) {
        if (now - data.created > VERIFICATION_EXPIRY) {
            global.pendingVerifications.delete(id);
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

    cleanExpiredVerifications();

    // POST = Create new verification request
    if (req.method === 'POST') {
        try {
            const { 
                name, birthDate, birthTime, birthPlace, 
                language, gender, questions, paymentToken 
            } = req.body;

            // Validate required fields
            if (!name || !birthDate || !birthTime || !birthPlace || !paymentToken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields' 
                });
            }

            // Generate unique verification ID
            const verificationId = crypto.randomBytes(16).toString('hex');
            
            // Store the verification request
            global.pendingVerifications.set(verificationId, {
                created: Date.now(),
                status: 'pending', // pending, approved, rejected
                paymentToken,
                userData: {
                    name,
                    birthDate,
                    birthTime,
                    birthPlace,
                    language: language || 'english',
                    gender: gender || 'other',
                    questions: questions || 'Complete life reading'
                }
            });

            // Generate admin approval URL
            const adminSecret = process.env.ADMIN_SECRET || 'celestial2024';
            const host = req.headers.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const approvalUrl = `${protocol}://${host}/api/approve?id=${verificationId}&secret=${adminSecret}`;

            // WhatsApp number from env or default
            const whatsappNumber = process.env.WHATSAPP_NUMBER || '917907691760';

            // Create WhatsApp message
            const whatsappMessage = `🔮 *NEW PAYMENT VERIFICATION*

📋 *Details:*
• Name: ${name}
• DOB: ${birthDate}
• Time: ${birthTime}
• Place: ${birthPlace}
• Language: ${language || 'English'}

🔑 *Verification ID:* ${verificationId}
💰 *Token:* ${paymentToken.substring(0, 8)}...

✅ *To APPROVE, click:*
${approvalUrl}

⏰ Expires in 24 hours`;

            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

            return res.status(200).json({
                success: true,
                data: {
                    verificationId,
                    whatsappUrl,
                    message: 'Please send the WhatsApp message to complete verification'
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

    // GET = Check verification status
    if (req.method === 'GET') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Verification ID required' 
            });
        }

        const verification = global.pendingVerifications.get(id);

        if (!verification) {
            return res.status(404).json({ 
                success: false, 
                status: 'not_found',
                message: 'Verification not found or expired' 
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                status: verification.status,
                name: verification.userData.name,
                created: verification.created
            }
        });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
}
