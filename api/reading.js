// Secure Reading API - Requires valid payment token

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { name, birthDate, birthTime, birthPlace, language, gender, questions, paymentToken } = req.body;

        // SECURITY: Verify payment token first
        if (!paymentToken) {
            return res.status(401).json({ success: false, message: 'Payment required' });
        }

        // Verify token with payment API
        const tokenVerify = await fetch(`https://${req.headers.host}/api/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: paymentToken })
        });

        const tokenResult = await tokenVerify.json();
        
        if (!tokenResult.success || !tokenResult.valid) {
            return res.status(401).json({ success: false, message: 'Invalid payment. Please pay first.' });
        }

        // Validate required inputs
        if (!name || !birthDate || !birthTime || !birthPlace) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Sanitize inputs
        const sanitize = (str, maxLen = 100) => {
            if (typeof str !== 'string') return '';
            return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
        };

        const safeName = sanitize(name, 50);
        const safeBirthPlace = sanitize(birthPlace, 100);
        const safeQuestions = sanitize(questions, 500);
        
        const validLangs = ['english', 'hindi', 'tamil', 'telugu', 'malayalam', 'kannada', 'bengali', 'marathi', 'gujarati', 'punjabi'];
        const safeLanguage = validLangs.includes(language) ? language : 'english';
        const safeGender = ['male', 'female', 'other'].includes(gender) ? gender : 'other';

        // Validate date/time format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{2}:\d{2}$/.test(birthTime)) {
            return res.status(400).json({ success: false, message: 'Invalid date or time' });
        }

        // Calculate zodiac
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

        let zodiac = zodiacSigns[0];
        for (const sign of zodiacSigns) {
            const [sm, sd] = sign.start;
            const [em, ed] = sign.end;
            if (sm === 12 && em === 1) {
                if ((month === 12 && day >= sd) || (month === 1 && day <= ed)) { zodiac = sign; break; }
            } else if ((month === sm && day >= sd) || (month === em && day <= ed)) {
                zodiac = sign; break;
            }
        }

        // Life path number
        const digits = birthDate.replace(/-/g, '').split('').map(Number);
        let lifePathNumber = digits.reduce((a, b) => a + b, 0);
        while (lifePathNumber > 9 && lifePathNumber !== 11 && lifePathNumber !== 22) {
            lifePathNumber = String(lifePathNumber).split('').map(Number).reduce((a, b) => a + b, 0);
        }

        // Check API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'Service unavailable' });
        }

        // Language prompts
        const langPrompts = {
            english: 'Respond in English.',
            hindi: 'Respond in Hindi (हिंदी में).',
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

**Person:** ${safeName} (${safeGender})
**Birth:** ${birthDate} at ${birthTime}, ${safeBirthPlace}
**Sign:** ${zodiac.name} (${zodiac.symbol}) - ${zodiac.element}
**Life Path:** ${lifePathNumber}

**Questions:** ${safeQuestions || 'Complete life reading'}

${langPrompts[safeLanguage]}

Give specific predictions with timeframes. Use **Section Title** format.`;

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

        if (!response.ok) {
            return res.status(500).json({ success: false, message: 'Failed to generate reading' });
        }

        const data = await response.json();
        const reading = data.choices?.[0]?.message?.content;

        if (!reading) {
            return res.status(500).json({ success: false, message: 'No reading generated' });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: safeName,
                birthDate,
                birthTime,
                birthPlace: safeBirthPlace,
                zodiac,
                lifePathNumber,
                reading
            }
        });

    } catch (error) {
        console.error('Reading error:', error);
        return res.status(500).json({ success: false, message: 'Error generating reading' });
    }
}
