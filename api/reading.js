// Reading Display API - Online view and PDF download

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

    const { r, format } = req.query;

    if (!r) {
        return res.status(400).send(errorPage('No Reading', 'No reading data found.'));
    }

    const data = decodeReading(r);
    if (!data || !data.reading) {
        return res.status(400).send(errorPage('Invalid Data', 'Could not decode reading data.'));
    }

    // If PDF format requested, return PDF-ready HTML
    if (format === 'pdf') {
        return res.status(200).send(pdfPage(data, r));
    }

    // Default: Online reading view
    return res.status(200).send(readingPage(data, r));
}

// Online reading page
function readingPage(data, encodedReading) {
    const formattedReading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '<div class="section-title">✧ $1</div>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    const pdfUrl = `?r=${encodedReading}&format=pdf`;

    return `
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
            line-height: 1.7;
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
            max-width: 700px;
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
        .download-btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin-top: 20px;
            font-size: 0.9rem;
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
        .home-btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #D4AF37, #c9a227);
            color: #000;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin-top: 15px;
            font-size: 0.9rem;
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
                <a href="${pdfUrl}" class="download-btn" target="_blank">📄 Download PDF Report</a>
            </div>

            <div class="reading">
                <p>${formattedReading}</p>
            </div>

            <div class="footer">
                <div class="footer-logo">✨ Celestial Oracle</div>
                <p>AI-Powered Vedic Astrology</p>
                <a href="/" class="home-btn">🔮 Get Your Reading</a>
            </div>
        </div>
    </div>

    <script>
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
    `;
}

// PDF download page (print-friendly)
function pdfPage(data, encodedReading) {
    const formattedReading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '<h3 class="section-title">$1</h3>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    const generatedDate = data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : new Date().toLocaleDateString();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name} - Astrology Reading - Celestial Oracle</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans:wght@400;500&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Noto Sans', Georgia, serif;
            background: #fff;
            color: #333;
            line-height: 1.8;
            padding: 0;
        }
        
        .pdf-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* Header */
        .pdf-header {
            text-align: center;
            border-bottom: 3px solid #D4AF37;
            padding-bottom: 30px;
            margin-bottom: 30px;
        }
        
        .pdf-logo {
            font-family: 'Cinzel', serif;
            font-size: 2rem;
            color: #D4AF37;
            margin-bottom: 5px;
        }
        
        .pdf-subtitle {
            color: #666;
            font-size: 0.9rem;
        }
        
        /* User Info */
        .pdf-user-info {
            background: linear-gradient(135deg, #f8f4ff, #fff);
            border: 2px solid #D4AF37;
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
        }
        
        .pdf-zodiac {
            font-size: 4rem;
            margin-bottom: 10px;
        }
        
        .pdf-sign-name {
            font-family: 'Cinzel', serif;
            font-size: 1.8rem;
            color: #1a0a2e;
            margin-bottom: 10px;
        }
        
        .pdf-badges {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 15px 0;
        }
        
        .pdf-badge {
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.85rem;
            background: #f0e6ff;
            color: #7b5ea7;
            border: 1px solid #d4c4e8;
        }
        
        .pdf-birth-info {
            margin-top: 15px;
            color: #555;
            font-size: 0.95rem;
        }
        
        .pdf-birth-info strong {
            color: #1a0a2e;
            font-size: 1.1rem;
        }
        
        /* Reading Content */
        .pdf-reading {
            margin: 30px 0;
        }
        
        .pdf-reading p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .section-title {
            font-family: 'Cinzel', serif;
            color: #D4AF37;
            font-size: 1.2rem;
            margin: 30px 0 15px;
            padding: 10px 0;
            border-bottom: 2px solid #f0e6ff;
            border-top: 2px solid #f0e6ff;
            background: #fafafa;
            padding-left: 10px;
        }
        
        .section-title::before {
            content: '✧ ';
        }
        
        /* Footer */
        .pdf-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #D4AF37;
            text-align: center;
            color: #666;
            font-size: 0.85rem;
        }
        
        .pdf-footer-logo {
            font-family: 'Cinzel', serif;
            color: #D4AF37;
            font-size: 1rem;
            margin-bottom: 5px;
        }
        
        /* Print button (hidden in print) */
        .print-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        
        .print-btn {
            padding: 15px 25px;
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .back-btn {
            padding: 15px 25px;
            background: linear-gradient(135deg, #D4AF37, #c9a227);
            color: #000;
            border: none;
            border-radius: 30px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        @media print {
            .print-controls { display: none !important; }
            body { padding: 0; }
            .pdf-container { padding: 20px; }
            .pdf-header { page-break-after: avoid; }
            .section-title { page-break-after: avoid; }
            .pdf-reading p { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <div class="pdf-header">
            <div class="pdf-logo">✨ CELESTIAL ORACLE</div>
            <div class="pdf-subtitle">Personalized Vedic Astrology Reading</div>
        </div>
        
        <div class="pdf-user-info">
            <div class="pdf-zodiac">${data.zodiac?.symbol || '🔮'}</div>
            <div class="pdf-sign-name">${data.zodiac?.name || 'Your Sign'}</div>
            <div class="pdf-badges">
                <span class="pdf-badge">${data.zodiac?.element || 'Element'} Sign</span>
                <span class="pdf-badge">Life Path ${data.lifePathNumber || '?'}</span>
            </div>
            <div class="pdf-birth-info">
                <strong>${data.name}</strong><br>
                Born: ${data.birthDate} at ${data.birthTime}<br>
                Place: ${data.birthPlace}
            </div>
        </div>
        
        <div class="pdf-reading">
            <p>${formattedReading}</p>
        </div>
        
        <div class="pdf-footer">
            <div class="pdf-footer-logo">✨ Celestial Oracle</div>
            <p>Generated on ${generatedDate}</p>
            <p>This reading is for entertainment and guidance purposes only.</p>
        </div>
    </div>
    
    <div class="print-controls">
        <a href="?r=${encodedReading}" class="back-btn">← Back</a>
        <button class="print-btn" onclick="window.print()">📄 Print / Save PDF</button>
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
        h1 { color: #f44336; margin: 15px 0; }
        a { color: #D4AF37; }
    </style>
</head>
<body>
    <div class="card">
        <div style="font-size: 3rem;">⚠️</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p style="margin-top: 20px;"><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>
    `;
}
