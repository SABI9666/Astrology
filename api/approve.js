// Admin Approval API - Decodes URL data and generates reading on approval
const crypto = require('crypto');

// Secret for signing
function getSecret() {
    return process.env.ADMIN_SECRET || 'celestial2024';
}

// Verify signature
function verifySignature(data, signature) {
    const secret = getSecret();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    const expectedSig = hmac.digest('hex').substring(0, 16);
    return expectedSig === signature;
}

// Decode base64 URL-safe data
function decodeData(encoded) {
    try {
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const json = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// Generate zodiac
function getZodiac(birthDate) {
    const date = new Date(birthDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const zodiacSigns = [
        { name: 'Capricorn', symbol: '♑', element: 'Earth', start: [12, 22], end: [1, 19] },
        { name: 'Aquarius', symbol: '♒', element: 'Air', start: [1, 20], end: [2, 18] },
        { name: 'Pisces', symbol: '♓', element: 'Water', start: [2, 19], end: [3, 20] },
        { name: 'Aries', symbol: '♈', element: 'Fire', start: [3, 21], end: [4, 19] },
        { name: 'Taurus', symbol: '♉', element: 'Earth', start: [4, 20], end: [5, 20] },
        { name: 'Gemini', symbol: '♊', element: 'Air', start: [5, 21], end: [6, 20] },
        { name: 'Cancer', symbol: '♋', element: 'Water', start: [6, 21], end: [7, 22] },
        { name: 'Leo', symbol: '♌', element: 'Fire', start: [7, 23], end: [8, 22] },
        { name: 'Virgo', symbol: '♍', element: 'Earth', start: [8, 23], end: [9, 22] },
        { name: 'Libra', symbol: '♎', element: 'Air', start: [9, 23], end: [10, 22] },
        { name: 'Scorpio', symbol: '♏', element: 'Water', start: [10, 23], end: [11, 21] },
        { name: 'Sagittarius', symbol: '♐', element: 'Fire', start: [11, 22], end: [12, 21] }
    ];

    for (const sign of zodiacSigns) {
        const [sm, sd] = sign.start;
        const [em, ed] = sign.end;
        if (sm === 12 && em === 1) {
            if ((month === 12 && day >= sd) || (month === 1 && day <= ed)) return sign;
        } else if ((month === sm && day >= sd) || (month === em && day <= ed)) {
            return sign;
        }
    }
    return zodiacSigns[0];
}

// Calculate life path
function getLifePath(birthDate) {
    const digits = birthDate.replace(/-/g, '').split('').map(Number);
    let num = digits.reduce((a, b) => a + b, 0);
    while (num > 9 && num !== 11 && num !== 22) {
        num = String(num).split('').map(Number).reduce((a, b) => a + b, 0);
    }
    return num;
}

// Generate reading using OpenAI
async function generateReading(userData) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const zodiac = getZodiac(userData.bd);
    const lifePath = getLifePath(userData.bd);

    const langPrompts = {
        english: 'Respond in English.',
        hindi: 'Respond in Hindi (हिन्दी में).',
        tamil: 'Respond in Tamil (தமிழில்).',
        telugu: 'Respond in Telugu (తెలుగులో).',
        malayalam: 'Respond in Malayalam (മലയാളത്തിൽ).',
        kannada: 'Respond in Kannada (ಕನ್ನಡದಲ್ಲಿ).',
        bengali: 'Respond in Bengali (বাংলায়).',
        marathi: 'Respond in Marathi (मराठीत).',
        gujarati: 'Respond in Gujarati (ગુજરાતીમાં).',
        punjabi: 'Respond in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ).'
    };

    const prompt = `You are an expert Vedic astrologer. Provide a detailed reading.

**Person:** ${userData.n} (${userData.g})
**Birth:** ${userData.bd} at ${userData.bt}, ${userData.bp}
**Sign:** ${zodiac.name} (${zodiac.symbol}) - ${zodiac.element}
**Life Path:** ${lifePath}

**Questions:** ${userData.q}

${langPrompts[userData.l] || langPrompts.english}

Give specific predictions with timeframes. Use **Section Title** format.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an expert Vedic astrologer.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.8
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return {
            reading: data.choices?.[0]?.message?.content,
            zodiac,
            lifePath
        };
    } catch (e) {
        console.error('OpenAI error:', e);
        return null;
    }
}

// Encode reading data for sharing
function encodeReading(readingData) {
    const json = JSON.stringify(readingData);
    return Buffer.from(json).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    const { d, s, action } = req.query;

    // Check for encoded data
    if (!d || !s) {
        return res.status(400).send(errorPage('Missing Data', 'Invalid approval link. Please request a new one.'));
    }

    // Decode data
    const userData = decodeData(d);
    if (!userData) {
        return res.status(400).send(errorPage('Invalid Data', 'Could not decode verification data.'));
    }

    // Verify signature
    if (!verifySignature(userData, s)) {
        return res.status(403).send(errorPage('Invalid Signature', 'This link has been tampered with or is invalid.'));
    }

    // Check if expired (24 hours)
    const age = Date.now() - userData.t;
    if (age > 24 * 60 * 60 * 1000) {
        return res.status(410).send(errorPage('Expired', 'This verification link has expired. Please request a new one.'));
    }

    // Handle APPROVE action
    if (action === 'approve') {
        // Generate reading
        const result = await generateReading(userData);
        
        if (!result || !result.reading) {
            return res.status(500).send(errorPage('Generation Failed', 'Could not generate reading. Please try again.'));
        }

        // Create reading data for sharing
        const readingData = {
            name: userData.n,
            birthDate: userData.bd,
            birthTime: userData.bt,
            birthPlace: userData.bp,
            zodiac: result.zodiac,
            lifePathNumber: result.lifePath,
            reading: result.reading
        };

        const encodedReading = encodeReading(readingData);
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const readingUrl = `${protocol}://${host}/api/reading?r=${encodedReading}`;

        // Show success page with reading link
        return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✅ Approved!</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #1a0a2e, #0d0618); 
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card { 
            background: rgba(255,255,255,0.05); 
            padding: 30px; 
            border-radius: 20px; 
            max-width: 450px;
            width: 100%;
            border: 2px solid #4CAF50;
            text-align: center;
        }
        .icon { font-size: 4rem; margin-bottom: 15px; }
        h1 { color: #4CAF50; margin-bottom: 10px; }
        .details { 
            background: rgba(0,0,0,0.3); 
            padding: 15px; 
            border-radius: 12px; 
            margin: 20px 0;
            text-align: left;
        }
        .row { margin: 8px 0; }
        .label { color: #D4AF37; font-size: 0.8em; }
        .link-box {
            background: rgba(76,175,80,0.1);
            border: 1px solid rgba(76,175,80,0.3);
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
        }
        .link-box p { margin-bottom: 10px; font-size: 0.9em; }
        .link {
            display: block;
            padding: 15px;
            background: linear-gradient(135deg, #4CAF50, #388E3C);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin: 10px 0;
        }
        .copy-btn {
            padding: 12px 20px;
            background: #D4AF37;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }
        .whatsapp-btn {
            display: block;
            padding: 15px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>Payment Approved!</h1>
        <p>Reading generated for:</p>
        
        <div class="details">
            <div class="row"><span class="label">NAME:</span> ${userData.n}</div>
            <div class="row"><span class="label">DOB:</span> ${userData.bd}</div>
            <div class="row"><span class="label">TIME:</span> ${userData.bt}</div>
            <div class="row"><span class="label">PLACE:</span> ${userData.bp}</div>
        </div>

        <div class="link-box">
            <p>📱 Share this link with the customer:</p>
            <a href="${readingUrl}" class="link" target="_blank">📖 View Reading</a>
            <button class="copy-btn" onclick="copyLink()">📋 Copy Link</button>
            <a href="https://wa.me/${userData.n ? '' : ''}?text=${encodeURIComponent('🔮 Your Celestial Oracle Reading is ready!\n\nClick here to view:\n' + readingUrl)}" class="whatsapp-btn" target="_blank">
                📱 Send via WhatsApp
            </a>
        </div>
    </div>
    <script>
        const readingUrl = "${readingUrl}";
        function copyLink() {
            navigator.clipboard.writeText(readingUrl).then(() => {
                document.querySelector('.copy-btn').textContent = '✓ Copied!';
                setTimeout(() => {
                    document.querySelector('.copy-btn').textContent = '📋 Copy Link';
                }, 2000);
            });
        }
    </script>
</body>
</html>
        `);
    }

    // Handle REJECT action
    if (action === 'reject') {
        return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>❌ Rejected</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, #1a0a2e, #0d0618); 
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card { 
            background: rgba(255,255,255,0.05); 
            padding: 30px; 
            border-radius: 20px; 
            max-width: 400px;
            border: 2px solid #f44336;
            text-align: center;
        }
        .icon { font-size: 4rem; margin-bottom: 15px; }
        h1 { color: #f44336; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">❌</div>
        <h1>Payment Rejected</h1>
        <p>Verification for <strong>${userData.n}</strong> has been rejected.</p>
    </div>
</body>
</html>
        `);
    }

    // Default: Show approval page
    const approveUrl = `?d=${d}&s=${s}&action=approve`;
    const rejectUrl = `?d=${d}&s=${s}&action=reject`;

    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔮 Approve Payment</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #1a0a2e, #0d0618); 
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card { 
            background: rgba(255,255,255,0.05); 
            padding: 30px; 
            border-radius: 20px; 
            max-width: 420px;
            width: 100%;
            border: 1px solid rgba(212,175,55,0.3);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .header { text-align: center; margin-bottom: 25px; }
        .icon { font-size: 3.5rem; margin-bottom: 10px; }
        h1 { color: #D4AF37; font-size: 1.5rem; }
        .details { 
            background: rgba(0,0,0,0.3); 
            padding: 20px; 
            border-radius: 15px; 
            margin: 20px 0;
        }
        .row { 
            display: flex;
            flex-direction: column;
            margin: 12px 0;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .row:last-child { border-bottom: none; padding-bottom: 0; }
        .label { 
            color: #D4AF37; 
            font-size: 0.7rem; 
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 4px;
        }
        .value { font-size: 1rem; }
        .buttons { 
            display: flex; 
            gap: 12px; 
            margin-top: 25px;
        }
        .btn { 
            flex: 1;
            padding: 16px; 
            border: none; 
            border-radius: 12px; 
            font-size: 1rem; 
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            transition: transform 0.2s, opacity 0.2s;
        }
        .btn:active { transform: scale(0.98); }
        .btn-approve { 
            background: linear-gradient(135deg, #4CAF50, #388E3C); 
            color: #fff; 
        }
        .btn-reject { 
            background: linear-gradient(135deg, #f44336, #d32f2f); 
            color: #fff; 
        }
        .time-badge {
            display: inline-block;
            padding: 5px 12px;
            background: rgba(255,152,0,0.2);
            border: 1px solid rgba(255,152,0,0.4);
            border-radius: 20px;
            font-size: 0.75rem;
            color: #ffb74d;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">🔮</div>
            <h1>Payment Verification</h1>
            <span class="time-badge">⏰ Created ${Math.round(age / 60000)} mins ago</span>
        </div>

        <div class="details">
            <div class="row">
                <span class="label">Name</span>
                <span class="value">${userData.n}</span>
            </div>
            <div class="row">
                <span class="label">Date of Birth</span>
                <span class="value">${userData.bd}</span>
            </div>
            <div class="row">
                <span class="label">Time of Birth</span>
                <span class="value">${userData.bt}</span>
            </div>
            <div class="row">
                <span class="label">Place of Birth</span>
                <span class="value">${userData.bp}</span>
            </div>
            <div class="row">
                <span class="label">Language</span>
                <span class="value">${userData.l}</span>
            </div>
            <div class="row">
                <span class="label">Questions</span>
                <span class="value">${userData.q}</span>
            </div>
        </div>

        <div class="buttons">
            <a href="${approveUrl}" class="btn btn-approve">✓ APPROVE</a>
            <a href="${rejectUrl}" class="btn btn-reject">✕ REJECT</a>
        </div>
    </div>
</body>
</html>
    `);
}

function errorPage(title, message) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, #1a0a2e, #0d0618); 
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card { 
            background: rgba(255,255,255,0.05); 
            padding: 30px; 
            border-radius: 20px; 
            max-width: 400px;
            border: 1px solid rgba(244,67,54,0.5);
            text-align: center;
        }
        .icon { font-size: 3rem; margin-bottom: 15px; }
        h1 { color: #f44336; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚠️</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>
    `;
}
