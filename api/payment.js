export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // ✨ FIXED — Permanent UPI details
    const upiId = "cn.sabin623-1@okicici";
    const upiName = "Cn Sabin";   // Payee Name (Bank approved)

    // Amount (₹100)
    const amount = "100";

    // Clean name but KEEP spaces
    const cleanName = upiName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);

    // Unique transaction ID to avoid UPI rejection
    const txid = "TXN" + Date.now();

    // Build safe UPI param string
    const params =
        `pa=${upiId}` +
        `&pn=${encodeURIComponent(cleanName)}` +
        `&am=${amount}` +
        `&cu=INR` +
        `&tr=${txid}` +
        `&tn=Astrology%20Reading`;

    return res.status(200).json({
        success: true,
        data: {
            amount,
            upiId,
            upiName: cleanName,
            urls: {
                upi: `upi://pay?${params}`,
                gpay: `tez://upi/pay?${params}`,
                phonepe: `phonepe://pay?${params}`,
                paytm: `paytmmp://pay?${params}`
            }
        }
    });
}
