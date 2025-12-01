export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Celestial Oracle';

    const amount = "100"; // fixed amount

    // Keep payee name clean BUT allow spaces
    const cleanName = upiName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);

    // Generate unique transaction ID
    const txid = 'TXN' + Date.now();

    const upiParams =
        `pa=${upiId}` +
        `&pn=${encodeURIComponent(cleanName)}` +
        `&am=${amount}` +
        `&cu=INR` +
        `&tr=${txid}` +
        `&tn=Astrology Reading`;

    const upiUrl = 'upi://pay?' + upiParams;
    const gpayUrl = 'tez://upi/pay?' + upiParams;
    const phonepeUrl = 'phonepe://pay?' + upiParams;
    const paytmUrl = 'paytmmp://pay?' + upiParams;

    return res.status(200).json({
        success: true,
        data: {
            amount,
            upiId,
            upiName: cleanName,
            urls: {
                upi: upiUrl,
                gpay: gpayUrl,
                phonepe: phonepeUrl,
                paytm: paytmUrl
            }
        }
    });
}
