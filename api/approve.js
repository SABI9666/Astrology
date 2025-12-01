// Admin Approval API - Approves payment verifications via secret link

// Access the shared pending verifications store
if (!global.pendingVerifications) {
    global.pendingVerifications = new Map();
}

export default function handler(req, res) {
    // Allow both GET (for easy link clicking) and POST
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id, secret, action } = req.query;
    const adminSecret = process.env.ADMIN_SECRET || 'celestial2024';

    // Validate admin secret
    if (secret !== adminSecret) {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Access Denied</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                        background: #1a0a2e; 
                        color: #fff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; max-width: 400px; }
                    h1 { color: #f44336; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>🚫 Access Denied</h1>
                    <p>Invalid admin secret.</p>
                </div>
            </body>
            </html>
        `);
    }

    // Validate verification ID
    if (!id) {
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                        background: #1a0a2e; 
                        color: #fff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; max-width: 400px; }
                    h1 { color: #ff9800; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>⚠️ Missing ID</h1>
                    <p>Verification ID is required.</p>
                </div>
            </body>
            </html>
        `);
    }

    const verification = global.pendingVerifications.get(id);

    if (!verification) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Not Found</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                        background: #1a0a2e; 
                        color: #fff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; max-width: 400px; }
                    h1 { color: #ff9800; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>❓ Not Found</h1>
                    <p>This verification request was not found or has expired.</p>
                </div>
            </body>
            </html>
        `);
    }

    const userData = verification.userData;
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';

    // If action is specified, process it
    if (action === 'approve') {
        verification.status = 'approved';
        global.pendingVerifications.set(id, verification);

        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Approved!</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                        background: #1a0a2e; 
                        color: #fff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; max-width: 400px; border: 1px solid #4CAF50; }
                    h1 { color: #4CAF50; }
                    .details { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left; }
                    .detail-row { margin: 8px 0; }
                    .label { color: #D4AF37; font-size: 0.8em; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ APPROVED!</h1>
                    <p>Payment verified successfully for:</p>
                    <div class="details">
                        <div class="detail-row"><span class="label">NAME:</span> ${userData.name}</div>
                        <div class="detail-row"><span class="label">DOB:</span> ${userData.birthDate}</div>
                        <div class="detail-row"><span class="label">TIME:</span> ${userData.birthTime}</div>
                        <div class="detail-row"><span class="label">PLACE:</span> ${userData.birthPlace}</div>
                    </div>
                    <p style="color: #4CAF50; font-size: 0.9em;">The user can now check their status and get their reading.</p>
                </div>
            </body>
            </html>
        `);
    }

    if (action === 'reject') {
        verification.status = 'rejected';
        global.pendingVerifications.set(id, verification);

        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rejected</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                        background: #1a0a2e; 
                        color: #fff;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    .card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 16px; max-width: 400px; border: 1px solid #f44336; }
                    h1 { color: #f44336; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>❌ REJECTED</h1>
                    <p>Verification for <strong>${userData.name}</strong> has been rejected.</p>
                </div>
            </body>
            </html>
        `);
    }

    // Default: Show approval/rejection options
    const approveUrl = `${protocol}://${host}/api/approve?id=${id}&secret=${secret}&action=approve`;
    const rejectUrl = `${protocol}://${host}/api/approve?id=${id}&secret=${secret}&action=reject`;

    return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Approval</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                    background: linear-gradient(135deg, #1a0a2e, #0d0618); 
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .card { 
                    background: rgba(255,255,255,0.05); 
                    padding: 30px; 
                    border-radius: 16px; 
                    max-width: 400px;
                    width: 100%;
                    border: 1px solid rgba(212,175,55,0.3);
                    box-shadow: 0 15px 50px rgba(0,0,0,0.5);
                }
                h1 { color: #D4AF37; text-align: center; margin-bottom: 20px; }
                .status { 
                    display: inline-block; 
                    padding: 5px 15px; 
                    border-radius: 20px; 
                    font-size: 0.8em;
                    margin-bottom: 15px;
                }
                .status.pending { background: #ff9800; color: #000; }
                .status.approved { background: #4CAF50; color: #fff; }
                .status.rejected { background: #f44336; color: #fff; }
                .details { 
                    background: rgba(0,0,0,0.2); 
                    padding: 20px; 
                    border-radius: 12px; 
                    margin: 20px 0;
                }
                .detail-row { 
                    margin: 12px 0; 
                    display: flex;
                    flex-direction: column;
                }
                .label { color: #D4AF37; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.1em; }
                .value { font-size: 1em; margin-top: 4px; }
                .buttons { 
                    display: flex; 
                    gap: 12px; 
                    margin-top: 25px;
                }
                .btn { 
                    flex: 1;
                    padding: 16px; 
                    border: none; 
                    border-radius: 10px; 
                    font-size: 1rem; 
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    text-align: center;
                    transition: transform 0.2s, opacity 0.2s;
                }
                .btn:active { transform: scale(0.98); }
                .btn-approve { background: linear-gradient(135deg, #4CAF50, #388E3C); color: #fff; }
                .btn-reject { background: linear-gradient(135deg, #f44336, #d32f2f); color: #fff; }
                .btn:hover { opacity: 0.9; }
                .id-box {
                    background: rgba(212,175,55,0.1);
                    border: 1px solid rgba(212,175,55,0.3);
                    padding: 10px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 0.8em;
                    word-break: break-all;
                    text-align: center;
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🔮 Payment Verification</h1>
                
                <div style="text-align: center;">
                    <span class="status ${verification.status}">${verification.status.toUpperCase()}</span>
                </div>

                <div class="id-box">ID: ${id}</div>

                <div class="details">
                    <div class="detail-row">
                        <span class="label">Name</span>
                        <span class="value">${userData.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date of Birth</span>
                        <span class="value">${userData.birthDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Time of Birth</span>
                        <span class="value">${userData.birthTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Place of Birth</span>
                        <span class="value">${userData.birthPlace}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Language</span>
                        <span class="value">${userData.language}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Questions</span>
                        <span class="value">${userData.questions}</span>
                    </div>
                </div>

                ${verification.status === 'pending' ? `
                    <div class="buttons">
                        <a href="${approveUrl}" class="btn btn-approve">✓ APPROVE</a>
                        <a href="${rejectUrl}" class="btn btn-reject">✕ REJECT</a>
                    </div>
                ` : `
                    <p style="text-align: center; color: ${verification.status === 'approved' ? '#4CAF50' : '#f44336'};">
                        This request has already been ${verification.status}.
                    </p>
                `}
            </div>
        </body>
        </html>
    `);
}
