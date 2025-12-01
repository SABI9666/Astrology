// Admin Approval API - Password protected with PDF generation
const crypto = require('crypto');

// Verify signature
function verifySignature(data, signature, secret) {
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

    const prompt = `You are an expert Vedic astrologer. Provide a detailed personalized reading.

**Person:** ${userData.n} (${userData.g})
**Birth:** ${userData.bd} at ${userData.bt}, ${userData.bp}
**Sign:** ${zodiac.name} (${zodiac.symbol}) - ${zodiac.element}
**Life Path Number:** ${lifePath}

**Questions/Focus Areas:** ${userData.q}

${langPrompts[userData.l] || langPrompts.english}

Provide detailed predictions covering:
1. Personality traits based on zodiac and life path
2. Career and professional life
3. Relationships and love life
4. Health and wellness
5. Financial prospects
6. Specific answers to their questions
7. Lucky numbers, colors, and days
8. Recommendations and remedies

Use **Section Title** format for headings. Be specific with timeframes where possible.`;

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
                    { role: 'system', content: 'You are an expert Vedic astrologer with deep knowledge of Jyotish.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2500,
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

// Encode reading for URL
function encodeReading(data) {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    const { d, sig, password, action } = req.query;
    const secret = process.env.ADMIN_SECRET || 'celestial2024';

    // Check for data
    if (!d || !sig) {
        return res.status(400).send(errorPage('Invalid Link', 'This approval link is invalid or incomplete.'));
    }

    // Decode user data
    const userData = decodeData(d);
    if (!userData) {
        return res.status(400).send(errorPage('Invalid Data', 'Could not decode verification data.'));
    }

    // Verify data integrity
    if (!verifySignature(userData, sig, secret)) {
        return res.status(403).send(errorPage('Tampered Link', 'This link has been modified and is invalid.'));
    }

    // Check expiry (24 hours)
    const age = Date.now() - userData.t;
    if (age > 24 * 60 * 60 * 1000) {
        return res.status(410).send(errorPage('Link Expired', 'This verification link has expired (24 hours).'));
    }

    const ageMinutes = Math.round(age / 60000);

    // STEP 1: If no password provided, show password form
    if (!password) {
        return res.status(200).send(passwordPage(d, sig, userData, ageMinutes));
    }

    // STEP 2: Verify password
    if (password !== secret) {
        return res.status(200).send(passwordPage(d, sig, userData, ageMinutes, 'Incorrect password. Please try again.'));
    }

    // STEP 3: Password correct - handle actions
    if (action === 'approve') {
        // Generate reading
        const result = await generateReading(userData);
        
        if (!result || !result.reading) {
            return res.status(500).send(errorPage('Generation Failed', 'Could not generate reading. Check OpenAI API key.'));
        }

        // Create reading data
        const readingData = {
            name: userData.n,
            birthDate: userData.bd,
            birthTime: userData.bt,
            birthPlace: userData.bp,
            language: userData.l,
            zodiac: result.zodiac,
            lifePathNumber: result.lifePath,
            reading: result.reading,
            generatedAt: new Date().toISOString()
        };

        const encodedReading = encodeReading(readingData);
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const readingUrl = `${protocol}://${host}/api/reading?r=${encodedReading}`;
        const pdfUrl = `${protocol}://${host}/api/reading?r=${encodedReading}&format=pdf`;

        return res.status(200).send(successPage(userData, readingUrl, pdfUrl));
    }

    if (action === 'reject') {
        return res.status(200).send(rejectPage(userData));
    }

    // Default: Show approval page (after password verified)
    return res.status(200).send(approvalPage(d, sig, password, userData, ageMinutes));
}

// Password entry page
function passwordPage(d, sig, userData, ageMinutes, error = '') {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 Admin Login</title>
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
            padding: 35px; 
            border-radius: 20px; 
            max-width: 400px;
            width: 100%;
            border: 1px solid rgba(212,175,55,0.3);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .header { text-align: center; margin-bottom: 25px; }
        .icon { font-size: 3.5rem; margin-bottom: 10px; }
        h1 { color: #D4AF37; font-size: 1.4rem; }
        .user-info {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 12px;
            margin: 20px 0;
            font-size: 0.9rem;
        }
        .user-info strong { color: #D4AF37; }
        .time-badge {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(255,152,0,0.2);
            border-radius: 15px;
            font-size: 0.75rem;
            color: #ffb74d;
            margin-top: 10px;
        }
        .form-group { margin: 20px 0; }
        .form-label { 
            display: block; 
            color: #D4AF37; 
            font-size: 0.8rem; 
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        .form-input {
            width: 100%;
            padding: 14px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(212,175,55,0.3);
            border-radius: 10px;
            color: #fff;
            font-size: 16px;
            text-align: center;
            letter-spacing: 0.2em;
        }
        .form-input:focus { outline: none; border-color: #D4AF37; }
        .btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #D4AF37, #c9a227);
            border: none;
            border-radius: 10px;
            color: #000;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
        }
        .btn:hover { opacity: 0.9; }
        .error {
            background: rgba(244,67,54,0.2);
            border: 1px solid rgba(244,67,54,0.5);
            color: #ff8a80;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">🔐</div>
            <h1>Admin Verification</h1>
        </div>

        ${error ? `<div class="error">⚠️ ${error}</div>` : ''}

        <div class="user-info">
            <strong>Request from:</strong> ${userData.n}<br>
            <strong>DOB:</strong> ${userData.bd} at ${userData.bt}<br>
            <strong>Place:</strong> ${userData.bp}
            <div class="time-badge">⏰ ${ageMinutes} minutes ago</div>
        </div>

        <form method="GET" action="">
            <input type="hidden" name="d" value="${d}">
            <input type="hidden" name="sig" value="${sig}">
            
            <div class="form-group">
                <label class="form-label">Enter Admin Password</label>
                <input type="password" name="password" class="form-input" placeholder="••••••••" required autofocus>
            </div>
            
            <button type="submit" class="btn">🔓 Verify & Continue</button>
        </form>
    </div>
</body>
</html>
    `;
}

// Approval page (after password verified)
function approvalPage(d, sig, password, userData, ageMinutes) {
    const approveUrl = `?d=${d}&sig=${sig}&password=${encodeURIComponent(password)}&action=approve`;
    const rejectUrl = `?d=${d}&sig=${sig}&password=${encodeURIComponent(password)}&action=reject`;

    return `
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
            max-width: 450px;
            width: 100%;
            border: 1px solid rgba(212,175,55,0.3);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .header { text-align: center; margin-bottom: 20px; }
        .icon { font-size: 3rem; margin-bottom: 10px; }
        h1 { color: #D4AF37; font-size: 1.3rem; }
        .verified-badge {
            display: inline-block;
            padding: 5px 15px;
            background: rgba(76,175,80,0.2);
            border: 1px solid rgba(76,175,80,0.5);
            border-radius: 20px;
            color: #81c784;
            font-size: 0.75rem;
            margin-top: 10px;
        }
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
        }
        .btn-approve { background: linear-gradient(135deg, #4CAF50, #388E3C); color: #fff; }
        .btn-reject { background: linear-gradient(135deg, #f44336, #d32f2f); color: #fff; }
        .btn:hover { opacity: 0.9; }
        .warning {
            background: rgba(255,152,0,0.1);
            border: 1px solid rgba(255,152,0,0.3);
            padding: 12px;
            border-radius: 10px;
            font-size: 0.85rem;
            color: #ffb74d;
            margin-top: 15px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">🔮</div>
            <h1>Payment Verification</h1>
            <div class="verified-badge">✓ Admin Verified</div>
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

        <div class="warning">
            ⚠️ Clicking APPROVE will generate the reading using AI credits
        </div>

        <div class="buttons">
            <a href="${approveUrl}" class="btn btn-approve">✓ APPROVE</a>
            <a href="${rejectUrl}" class="btn btn-reject">✕ REJECT</a>
        </div>
    </div>
</body>
</html>
    `;
}

// Success page with reading link and PDF
function successPage(userData, readingUrl, pdfUrl) {
    const whatsappMsg = `🔮 *Your Celestial Oracle Reading is Ready!*

Hi ${userData.n},

Your personalized Vedic astrology reading has been generated.

📖 *View Online:*
${readingUrl}

📄 *Download PDF:*
${pdfUrl}

Thank you for choosing Celestial Oracle! ✨`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

    return `
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
            max-width: 480px;
            width: 100%;
            border: 2px solid #4CAF50;
            text-align: center;
        }
        .icon { font-size: 4rem; margin-bottom: 15px; }
        h1 { color: #4CAF50; margin-bottom: 10px; }
        .user-name { color: #D4AF37; font-size: 1.2rem; margin: 10px 0; }
        .links-box {
            background: rgba(0,0,0,0.3);
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }
        .link-group { margin: 15px 0; }
        .link-label { font-size: 0.8rem; color: #aaa; margin-bottom: 8px; }
        .link-btn {
            display: block;
            padding: 14px 20px;
            border-radius: 10px;
            color: white;
            text-decoration: none;
            font-weight: 600;
            margin: 8px 0;
        }
        .link-online { background: linear-gradient(135deg, #4CAF50, #388E3C); }
        .link-pdf { background: linear-gradient(135deg, #2196F3, #1976D2); }
        .link-whatsapp { background: linear-gradient(135deg, #25D366, #128C7E); }
        .link-btn:hover { opacity: 0.9; }
        .copy-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(212,175,55,0.3);
            border-radius: 10px;
            padding: 12px;
            margin: 15px 0;
        }
        .copy-label { font-size: 0.75rem; color: #D4AF37; margin-bottom: 5px; }
        .copy-url {
            font-family: monospace;
            font-size: 0.7rem;
            word-break: break-all;
            color: #aaa;
            max-height: 60px;
            overflow: hidden;
        }
        .copy-btn {
            margin-top: 10px;
            padding: 10px 20px;
            background: #D4AF37;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>Payment Approved!</h1>
        <div class="user-name">Reading generated for: ${userData.n}</div>

        <div class="links-box">
            <div class="link-group">
                <div class="link-label">📖 Share Reading Link:</div>
                <a href="${readingUrl}" class="link-btn link-online" target="_blank">View Online Reading</a>
                <a href="${pdfUrl}" class="link-btn link-pdf" target="_blank">📄 Download PDF Report</a>
            </div>
            
            <div class="link-group">
                <div class="link-label">📱 Send to Customer:</div>
                <a href="${whatsappUrl}" class="link-btn link-whatsapp" target="_blank">Send via WhatsApp</a>
            </div>
        </div>

        <div class="copy-box">
            <div class="copy-label">Reading URL:</div>
            <div class="copy-url" id="readingUrl">${readingUrl}</div>
            <button class="copy-btn" onclick="copyUrl()">📋 Copy Link</button>
        </div>
    </div>
    <script>
        function copyUrl() {
            navigator.clipboard.writeText('${readingUrl}').then(() => {
                document.querySelector('.copy-btn').textContent = '✓ Copied!';
                setTimeout(() => {
                    document.querySelector('.copy-btn').textContent = '📋 Copy Link';
                }, 2000);
            });
        }
    </script>
</body>
</html>
    `;
}

// Reject page
function rejectPage(userData) {
    return `
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
        <p style="margin-top: 15px;">Verification for <strong>${userData.n}</strong> has been rejected.</p>
    </div>
</body>
</html>
    `;
}

// Error page
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
