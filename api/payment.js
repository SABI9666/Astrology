export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false });

    const upiId = "pradeeksha798-1@okhdfcbank";
    const upiName = "COS 5";
    const amount = "100"; // fixed price

    // Allow space, clean special characters
    const cleanName = upiName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);

    // Unique transaction ID
    const txid = "TXN" + Date.now();

    // Final UPI Parameters
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
