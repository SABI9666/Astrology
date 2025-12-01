// Reading API - Client-side PDF using jsPDF CDN (no server packages)

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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { r, format } = req.query;

    if (!r) {
        return res.status(400).send(errorPage('No Reading', 'No reading data found.'));
    }

    const data = decodeReading(r);
    if (!data || !data.reading) {
        return res.status(400).send(errorPage('Invalid Data', 'Could not decode reading.'));
    }

    if (format === 'pdf') {
        return res.status(200).send(pdfPage(data));
    }

    return res.status(200).send(readingPage(data, r));
}

function pdfPage(data) {
    const reading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '###TITLE###$1###ENDTITLE###')
        .replace(/\n/g, '###NEWLINE###');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Downloading PDF...</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#1a0a2e,#0d0618);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .card{background:rgba(255,255,255,0.05);padding:40px;border-radius:20px;text-align:center;max-width:400px;border:1px solid rgba(212,175,55,0.3)}
        .spinner{width:50px;height:50px;border:4px solid rgba(212,175,55,0.2);border-top-color:#D4AF37;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
        @keyframes spin{to{transform:rotate(360deg)}}
        h2{color:#D4AF37;margin-bottom:10px}
        p{color:#aaa;margin:5px 0}
        .btn{display:inline-block;margin-top:20px;padding:12px 25px;background:#D4AF37;color:#000;text-decoration:none;border-radius:25px;font-weight:600;cursor:pointer;border:none;font-size:1rem}
        .success{color:#4CAF50}
        .error{color:#f44336}
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner" id="spinner"></div>
        <h2 id="title">Generating PDF...</h2>
        <p id="msg">Please wait</p>
        <a href="/" class="btn" id="btn" style="display:none">Back to Home</a>
    </div>
<script>
const D = {
    name: "${(data.name || '').replace(/"/g, '')}",
    bd: "${data.birthDate || ''}",
    bt: "${data.birthTime || ''}",
    bp: "${(data.birthPlace || '').replace(/"/g, '')}",
    zn: "${(data.zodiac?.name || '').replace(/"/g, '')}",
    ze: "${(data.zodiac?.element || '').replace(/"/g, '')}",
    lp: "${data.lifePathNumber || '?'}",
    rd: "${reading.replace(/"/g, '\\"')}"
};

function go() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const m = 20;
        const cw = pw - m * 2;
        let y = m;

        function np(n) {
            if (y + n > ph - m) { doc.addPage(); y = m; return true; }
            return false;
        }

        // Header
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.rect(m - 5, 12, cw + 10, 28);
        doc.setFontSize(20);
        doc.setTextColor(212, 175, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('CELESTIAL ORACLE', pw / 2, 24, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text('Vedic Astrology Reading', pw / 2, 34, { align: 'center' });

        y = 52;

        // Info box
        doc.setFillColor(248, 244, 255);
        doc.setDrawColor(212, 175, 55);
        doc.roundedRect(m, y, cw, 28, 2, 2, 'FD');
        doc.setFontSize(14);
        doc.setTextColor(26, 10, 46);
        doc.setFont('helvetica', 'bold');
        doc.text(D.name, m + 8, y + 10);
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');
        doc.text(D.zn + ' | ' + D.ze + ' | Life Path ' + D.lp, m + 8, y + 18);
        doc.text('Born: ' + D.bd + ' at ' + D.bt + ' | ' + D.bp, m + 8, y + 24);

        y += 38;

        // Title
        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('YOUR READING', pw / 2, y, { align: 'center' });
        y += 4;
        doc.line(m, y, pw - m, y);
        y += 8;

        // Content
        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.setFont('helvetica', 'normal');

        const parts = D.rd.split('###NEWLINE###');
        for (let i = 0; i < parts.length; i++) {
            let line = parts[i].trim();
            if (!line) { y += 3; continue; }
            np(12);
            if (line.includes('###TITLE###')) {
                const t = line.replace('###TITLE###', '').replace('###ENDTITLE###', '').trim();
                y += 4;
                doc.setFontSize(11);
                doc.setTextColor(212, 175, 55);
                doc.setFont('helvetica', 'bold');
                doc.text(t, m, y);
                y += 6;
                doc.setFontSize(10);
                doc.setTextColor(50);
                doc.setFont('helvetica', 'normal');
            } else {
                const sl = doc.splitTextToSize(line, cw);
                for (let j = 0; j < sl.length; j++) {
                    np(5);
                    doc.text(sl[j], m, y);
                    y += 4.5;
                }
                y += 2;
            }
        }

        // Footer
        np(25);
        y += 8;
        doc.line(m, y, pw - m, y);
        y += 6;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Generated: ' + new Date().toLocaleDateString(), pw / 2, y, { align: 'center' });
        y += 4;
        doc.text('For guidance purposes only', pw / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
        doc.setTextColor(212, 175, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Celestial Oracle', pw / 2, y, { align: 'center' });

        const fn = 'CelestialOracle_' + D.name.replace(/[^a-zA-Z0-9]/g, '') + '.pdf';
        doc.save(fn);

        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = 'Download Complete!';
        document.getElementById('title').className = 'success';
        document.getElementById('msg').textContent = 'PDF saved to your device';
        document.getElementById('btn').style.display = 'inline-block';
    } catch (e) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = 'Error';
        document.getElementById('title').className = 'error';
        document.getElementById('msg').textContent = e.message;
        document.getElementById('btn').style.display = 'inline-block';
    }
}
window.onload = function() { setTimeout(go, 300); };
</script>
</body>
</html>`;
}

function readingPage(data, r) {
    const reading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '<div class="st">$1</div>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${data.name}'s Reading</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans:wght@400&display=swap" rel="stylesheet">
    <style>
        :root{--g:#D4AF37;--m:#0d0618;--p:#1a0a2e;--w:#f8f4ff}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Sans',sans-serif;background:var(--m);color:var(--w);min-height:100vh;line-height:1.7}
        .c{max-width:700px;margin:0 auto;padding:30px 16px}
        .card{background:linear-gradient(145deg,rgba(26,10,46,0.95),rgba(13,6,24,0.98));border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:30px 25px}
        .h{text-align:center;padding-bottom:25px;border-bottom:1px solid rgba(212,175,55,0.2);margin-bottom:25px}
        .zi{font-size:5rem;margin-bottom:15px}
        .sn{font-family:'Cinzel',serif;font-size:2rem;color:var(--g);margin-bottom:10px}
        .bd{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:15px 0}
        .b{padding:6px 15px;border-radius:20px;font-size:0.8rem;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);color:var(--g)}
        .bi{color:#F4E4BC;opacity:0.8;font-size:0.95rem;margin-top:15px}
        .db{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#2196F3,#1976D2);color:white;text-decoration:none;border-radius:30px;font-weight:600;margin-top:20px}
        .r{font-size:1rem;line-height:1.9}
        .r p{margin-bottom:18px}
        .st{font-family:'Cinzel',serif;color:var(--g);font-size:1.15rem;margin:30px 0 15px;padding-bottom:8px;border-bottom:1px solid rgba(212,175,55,0.2)}
        .st::before{content:'✧ '}
        .f{text-align:center;margin-top:30px;padding-top:25px;border-top:1px solid rgba(212,175,55,0.2)}
        .fl{font-family:'Cinzel',serif;color:var(--g);font-size:1.2rem;margin-bottom:5px}
        .f p{color:#F4E4BC;opacity:0.6;font-size:0.8rem}
        .hb{display:inline-block;padding:12px 25px;background:linear-gradient(135deg,#D4AF37,#c9a227);color:#000;text-decoration:none;border-radius:25px;font-weight:600;margin-top:15px}
    </style>
</head>
<body>
    <div class="c">
        <div class="card">
            <div class="h">
                <span class="zi">${data.zodiac?.symbol || '🔮'}</span>
                <div class="sn">${data.zodiac?.name || 'Your Reading'}</div>
                <div class="bd">
                    <span class="b">${data.zodiac?.element || 'Element'}</span>
                    <span class="b">Life Path ${data.lifePathNumber || '?'}</span>
                </div>
                <div class="bi"><strong>${data.name}</strong><br>${data.birthDate} at ${data.birthTime}<br>${data.birthPlace}</div>
                <a href="?r=${r}&format=pdf" class="db">📥 Download PDF</a>
            </div>
            <div class="r"><p>${reading}</p></div>
            <div class="f">
                <div class="fl">✨ Celestial Oracle</div>
                <p>AI-Powered Vedic Astrology</p>
                <a href="/" class="hb">🔮 Get Your Reading</a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function errorPage(t, m) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Error</title><style>body{font-family:sans-serif;background:#1a0a2e;color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}.c{background:rgba(255,255,255,0.05);padding:30px;border-radius:20px;max-width:400px;text-align:center}h1{color:#f44336;margin:15px 0}a{color:#D4AF37}</style></head><body><div class="c"><div style="font-size:3rem">⚠️</div><h1>${t}</h1><p>${m}</p><p style="margin-top:20px"><a href="/">← Home</a></p></div></body></html>`;
}










