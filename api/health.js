export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        config: {
            hasApiKey: !!process.env.OPENAI_API_KEY,
            hasUpiId: !!process.env.UPI_ID,
            hasAdminSecret: !!process.env.ADMIN_SECRET,
            hasWhatsApp: !!process.env.WHATSAPP_NUMBER
        }
    });
}
