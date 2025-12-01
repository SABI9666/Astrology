// Reading Display API - Shows reading from encoded URL data

// Decode base64 URL-safe data
function decodeReading(encoded) {
    try {
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const json = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const { r } = req.query;

    if (!r) {
        return res.status(400).send(errorPage('No Reading', 'No reading data found in URL.'));
    }

    const data = decodeReading(r);
    if (!data || !data.reading) {
        return res.status(400).send(errorPage('Invalid Data', 'Could not decode reading data.'));
    }

    // Format reading HTML
    const formattedReading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '<div class="section-title">✧ $1</div>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0d0618">
    <title>🔮 ${data.name}'s Reading | Celestial Oracle</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --gold: #D4AF37;
            --gold-light: #F4E4BC;
            --midnight: #0d0618;
            --purple: #1a0a2e;
            --violet: #7b5ea7;
            --white: #f8f4ff;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans', sans-serif;
            background: var(--midnight);
            color: var(--white);
            min-height: 100vh;
            line-height: 1.6;
        }
        .stars {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }
        .star {
            position: absolute;
            width: 2px; height: 2px;
            background: white;
            border-radius: 50%;
            animation: twinkle 3s ease-in-out infinite;
        }
        @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }
        .container {
            position: relative;
            z-index: 10;
            max-width: 650px;
            margin: 0 auto;
            padding: 30px 16px;
        }
        .card {
            background: linear-gradient(145deg, rgba(26,10,46,0.95), rgba(13,6,24,0.98));
            border: 1px solid rgba(212,175,55,0.3);
            border-radius: 20px;
            padding: 30px 25px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .header {
            text-align: center;
            padding-bottom: 25px;
            border-bottom: 1px solid rgba(212,175,55,0.2);
            margin-bottom: 25px;
        }
        .zodiac-icon {
            font-size: 5rem;
            margin-bottom: 15px;
            display: block;
        }
        .sun-sign {
            font-family: 'Cinzel', serif;
            font-size: 2rem;
            color: var(--gold);
            margin-bottom: 10px;
        }
        .badges {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin: 15px 0;
        }
        .badge {
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
        }
        .badge-gold {
            background: rgba(212,175,55,0.15);
            border: 1px solid rgba(212,175,55,0.4);
            color: var(--gold);
        }
        .badge-violet {
            background: rgba(123,94,167,0.2);
            border: 1px solid rgba(123,94,167,0.5);
            color: var(--violet);
        }
        .birth-details {
            color: var(--gold-light);
            opacity: 0.8;
            font-size: 0.95rem;
            margin-top: 15px;
        }
        .reading {
            font-size: 1rem;
            line-height: 1.9;
        }
        .reading p {
            margin-bottom: 18px;
        }
        .section-title {
            font-family: 'Cinzel', serif;
            color: var(--gold);
            font-size: 1.15rem;
            margin: 30px 0 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(212,175,55,0.2);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 25px;
            border-top: 1px solid rgba(212,175,55,0.2);
        }
        .footer-logo {
            font-family: 'Cinzel', serif;
            color: var(--gold);
            font-size: 1.2rem;
            margin-bottom: 5px;
        }
        .footer p {
            color: var(--gold-light);
            opacity: 0.6;
            font-size: 0.8rem;
        }
        .share-btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin-top: 15px;
            font-size: 0.9rem;
        }
        @media print {
            body { background: white; color: black; }
            .stars { display: none; }
            .card { border: 2px solid #D4AF37; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="stars" id="stars"></div>

    <div class="container">
        <div class="card">
            <div class="header">
                <span class="zodiac-icon">${data.zodiac?.symbol || '🔮'}</span>
                <div class="sun-sign">${data.zodiac?.name || 'Your Reading'}</div>
                <div class="badges">
                    <span class="badge badge-gold">${data.zodiac?.element || 'Element'}</span>
                    <span class="badge badge-violet">Life Path ${data.lifePathNumber || '?'}</span>
                </div>
                <div class="birth-details">
                    <strong>${data.name}</strong><br>
                    ${data.birthDate} at ${data.birthTime}<br>
                    ${data.birthPlace}
                </div>
            </div>

            <div class="reading">
                <p>${formattedReading}</p>
            </div>

            <div class="footer">
                <div class="footer-logo">✨ Celestial Oracle</div>
                <p>AI-Powered Vedic Astrology</p>
                <a href="/" class="share-btn">🔮 Get Your Reading</a>
            </div>
        </div>
    </div>

    <script>
        // Create stars
        (function() {
            const c = document.getElementById('stars');
            for (let i = 0; i < 60; i++) {
                const s = document.createElement('div');
                s.className = 'star';
                s.style.left = Math.random() * 100 + '%';
                s.style.top = Math.random() * 100 + '%';
                s.style.animationDelay = Math.random() * 3 + 's';
                c.appendChild(s);
            }
        })();
    </script>
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
    <title>Error | Celestial Oracle</title>
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
        a { color: #D4AF37; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚠️</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p style="margin-top: 20px;"><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>
    `;
}
