// Reading Display API - Fixed PDF generation for Vercel serverless

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

// Generate PDF using dynamic import
async function generatePDF(data) {
    // Dynamic import for ES modules compatibility
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                bufferPages: true,
                autoFirstPage: true,
                info: {
                    Title: `${data.name} - Astrology Reading`,
                    Author: 'Celestial Oracle'
                }
            });

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - 100;
            const gold = '#D4AF37';
            const purple = '#1a0a2e';
            const gray = '#555555';

            // Header Box
            doc.rect(40, 40, doc.page.width - 80, 100)
               .lineWidth(2)
               .stroke(gold);

            // Title
            doc.fontSize(26)
               .fillColor(gold)
               .font('Helvetica-Bold')
               .text('CELESTIAL ORACLE', 50, 55, { align: 'center', width: pageWidth });

            doc.fontSize(11)
               .fillColor(gray)
               .font('Helvetica')
               .text('Personalized Vedic Astrology Reading', 50, 90, { align: 'center', width: pageWidth });

            // User Info Section
            doc.rect(50, 160, pageWidth, 85)
               .fill('#f8f4ff')
               .stroke(gold);

            doc.fontSize(20)
               .fillColor(purple)
               .font('Helvetica-Bold')
               .text(data.name || 'Name', 70, 175);

            doc.fontSize(11)
               .fillColor(gray)
               .font('Helvetica');

            const zodiacInfo = `${data.zodiac?.name || 'Sign'} (${data.zodiac?.symbol || '*'}) | ${data.zodiac?.element || 'Element'} | Life Path ${data.lifePathNumber || '?'}`;
            doc.text(zodiacInfo, 70, 200);
            doc.text(`Born: ${data.birthDate || ''} at ${data.birthTime || ''}`, 70, 218);
            doc.text(`Place: ${data.birthPlace || ''}`, 70, 233);

            // Reading Title
            let yPos = 270;
            doc.fontSize(14)
               .fillColor(gold)
               .font('Helvetica-Bold')
               .text('YOUR PERSONALIZED READING', 50, yPos, { align: 'center', width: pageWidth });

            yPos += 25;
            doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).lineWidth(1).stroke(gold);
            yPos += 20;

            // Reading Content
            const reading = data.reading || 'No reading available.';
            const lines = reading.split('\n');

            doc.font('Helvetica').fontSize(10).fillColor('#333333');

            for (const line of lines) {
                // New page check
                if (yPos > doc.page.height - 70) {
                    doc.addPage();
                    yPos = 50;
                    doc.fontSize(9).fillColor(gold).font('Helvetica-Bold')
                       .text('Celestial Oracle - Continued', 50, 30, { align: 'center', width: pageWidth });
                    yPos = 55;
                    doc.font('Helvetica').fontSize(10).fillColor('#333333');
                }

                // Section title (marked with **)
                if (line.includes('**')) {
                    const title = line.replace(/\*\*/g, '').trim();
                    if (title) {
                        yPos += 8;
                        doc.fontSize(12).fillColor(gold).font('Helvetica-Bold')
                           .text(title, 50, yPos, { width: pageWidth });
                        yPos += 18;
                        doc.font('Helvetica').fontSize(10).fillColor('#333333');
                    }
                } else if (line.trim()) {
                    const textHeight = doc.heightOfString(line.trim(), { width: pageWidth });
                    doc.text(line.trim(), 50, yPos, { width: pageWidth, align: 'justify' });
                    yPos += textHeight + 6;
                } else {
                    yPos += 8;
                }
            }

            // Footer
            yPos += 25;
            if (yPos > doc.page.height - 80) {
                doc.addPage();
                yPos = 50;
            }

            doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke(gold);
            yPos += 12;

            const dateStr = new Date().toLocaleDateString('en-IN', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });

            doc.fontSize(9).fillColor(gray).font('Helvetica')
               .text(`Generated: ${dateStr}`, 50, yPos, { align: 'center', width: pageWidth });
            yPos += 12;
            doc.text('For guidance and entertainment purposes only.', 50, yPos, { align: 'center', width: pageWidth });
            yPos += 15;
            doc.fontSize(11).fillColor(gold).font('Helvetica-Bold')
               .text('Celestial Oracle', 50, yPos, { align: 'center', width: pageWidth });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

export default async function handler(req, res) {
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

    // PDF Download
    if (format === 'pdf') {
        try {
            const pdfBuffer = await generatePDF(data);
            
            const safeName = (data.name || 'reading').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `Celestial_Oracle_${safeName}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            return res.status(200).send(pdfBuffer);
            
        } catch (error) {
            console.error('PDF Error:', error.message);
            return res.status(500).send(errorPage('PDF Error', 'Failed to generate PDF: ' + error.message));
        }
    }

    // Online View
    return res.status(200).send(readingPage(data, r));
}

function readingPage(data, encodedReading) {
    const formattedReading = data.reading
        .replace(/\*\*([^*]+)\*\*/g, '<div class="section-title">$1</div>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    const pdfUrl = `?r=${encodedReading}&format=pdf`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0d0618">
    <title>${data.name}'s Reading | Celestial Oracle</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root{--gold:#D4AF37;--gold-light:#F4E4BC;--midnight:#0d0618;--purple:#1a0a2e;--violet:#7b5ea7;--white:#f8f4ff}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Sans',sans-serif;background:var(--midnight);color:var(--white);min-height:100vh;line-height:1.7}
        .container{max-width:700px;margin:0 auto;padding:30px 16px}
        .card{background:linear-gradient(145deg,rgba(26,10,46,0.95),rgba(13,6,24,0.98));border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:30px 25px;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
        .header{text-align:center;padding-bottom:25px;border-bottom:1px solid rgba(212,175,55,0.2);margin-bottom:25px}
        .zodiac-icon{font-size:5rem;margin-bottom:15px;display:block}
        .sun-sign{font-family:'Cinzel',serif;font-size:2rem;color:var(--gold);margin-bottom:10px}
        .badges{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:15px 0}
        .badge{padding:6px 15px;border-radius:20px;font-size:0.8rem}
        .badge-gold{background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);color:var(--gold)}
        .badge-violet{background:rgba(123,94,167,0.2);border:1px solid rgba(123,94,167,0.5);color:var(--violet)}
        .birth-details{color:var(--gold-light);opacity:0.8;font-size:0.95rem;margin-top:15px}
        .download-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#2196F3,#1976D2);color:white;text-decoration:none;border-radius:30px;font-weight:600;margin-top:20px;font-size:1rem;box-shadow:0 4px 15px rgba(33,150,243,0.3)}
        .download-btn:active{transform:scale(0.98)}
        .reading{font-size:1rem;line-height:1.9}
        .reading p{margin-bottom:18px}
        .section-title{font-family:'Cinzel',serif;color:var(--gold);font-size:1.15rem;margin:30px 0 15px;padding-bottom:8px;border-bottom:1px solid rgba(212,175,55,0.2)}
        .section-title::before{content:'✧ '}
        .footer{text-align:center;margin-top:30px;padding-top:25px;border-top:1px solid rgba(212,175,55,0.2)}
        .footer-logo{font-family:'Cinzel',serif;color:var(--gold);font-size:1.2rem;margin-bottom:5px}
        .footer p{color:var(--gold-light);opacity:0.6;font-size:0.8rem}
        .home-btn{display:inline-block;padding:12px 25px;background:linear-gradient(135deg,#D4AF37,#c9a227);color:#000;text-decoration:none;border-radius:25px;font-weight:600;margin-top:15px;font-size:0.9rem}
    </style>
</head>
<body>
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
                <a href="${pdfUrl}" class="download-btn">📥 Download PDF Report</a>
            </div>
            <div class="reading"><p>${formattedReading}</p></div>
            <div class="footer">
                <div class="footer-logo">✨ Celestial Oracle</div>
                <p>AI-Powered Vedic Astrology</p>
                <a href="/" class="home-btn">🔮 Get Your Reading</a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function errorPage(title, message) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#1a0a2e,#0d0618);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .card{background:rgba(255,255,255,0.05);padding:30px;border-radius:20px;max-width:400px;border:1px solid rgba(244,67,54,0.5);text-align:center}
        h1{color:#f44336;margin:15px 0}
        a{color:#D4AF37}
    </style>
</head>
<body>
    <div class="card">
        <div style="font-size:3rem">⚠️</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p style="margin-top:20px"><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>`;
}
