// api/verify-payment.js - Verifies Razorpay payment and generates reading

import crypto from 'crypto';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
        return res.status(500).json({ 
            success: false, 
            message: 'Razorpay not configured' 
        });
    }

    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            userData 
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed. Invalid signature.' 
            });
        }

        // Payment verified! Now generate reading
        console.log('Payment verified for:', userData.name);
        
        const readingResult = await generateReading(userData);

        if (!readingResult || !readingResult.reading) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to generate reading. Please contact support.' 
            });
        }

        // Create reading data object
        const readingData = {
            name: userData.name,
            birthDate: userData.birthDate,
            birthTime: userData.birthTime,
            birthPlace: userData.birthPlace,
            language: userData.language,
            gender: userData.gender,
            questions: userData.questions,
            zodiac: readingResult.zodiac,
            lifePathNumber: readingResult.lifePath,
            reading: readingResult.reading,
            paymentId: razorpay_payment_id,
            generatedAt: new Date().toISOString()
        };

        // Encode reading for URL (base64 URL-safe)
        const encodedReading = Buffer.from(JSON.stringify(readingData))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        // Build reading URL
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const readingUrl = `${protocol}://${host}/api/reading?r=${encodedReading}`;

        return res.status(200).json({
            success: true,
            data: {
                paymentId: razorpay_payment_id,
                readingUrl: readingUrl,
                name: userData.name
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Verification failed' 
        });
    }
}

// Get zodiac sign from birth date
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

// Calculate life path number
function getLifePath(birthDate) {
    const digits = birthDate.replace(/-/g, '').split('').map(Number);
    let num = digits.reduce((a, b) => a + b, 0);
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
        num = String(num).split('').map(Number).reduce((a, b) => a + b, 0);
    }
    return num;
}

// Generate reading using OpenAI
async function generateReading(userData) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('OpenAI API key not configured');
        return null;
    }

    const zodiac = getZodiac(userData.birthDate);
    const lifePath = getLifePath(userData.birthDate);

    const langPrompts = {
        english: 'Respond entirely in English.',
        hindi: 'Respond entirely in Hindi (हिन्दी में जवाब दें).',
        tamil: 'Respond entirely in Tamil (தமிழில் பதிலளிக்கவும்).',
        telugu: 'Respond entirely in Telugu (తెలుగులో సమాధానం ఇవ్వండి).',
        malayalam: 'Respond entirely in Malayalam (മലയാളത്തിൽ മറുപടി നൽകുക).',
        kannada: 'Respond entirely in Kannada (ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ).',
        bengali: 'Respond entirely in Bengali (বাংলায় উত্তর দিন).',
        marathi: 'Respond entirely in Marathi (मराठीत उत्तर द्या).',
        gujarati: 'Respond entirely in Gujarati (ગુજરાતીમાં જવાબ આપો).',
        punjabi: 'Respond entirely in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ).'
    };

    const prompt = `You are an expert Vedic astrologer (Jyotishi) with deep knowledge of Hindu astrology, planetary positions, and spiritual guidance. Provide a detailed, personalized reading.

**Client Details:**
- Name: ${userData.name}
- Gender: ${userData.gender}
- Date of Birth: ${userData.birthDate}
- Time of Birth: ${userData.birthTime}
- Place of Birth: ${userData.birthPlace}
- Zodiac Sign: ${zodiac.name} (${zodiac.symbol}) - ${zodiac.element} element
- Life Path Number: ${lifePath}

**Specific Questions/Areas of Interest:** ${userData.questions}

${langPrompts[userData.language] || langPrompts.english}

Please provide a comprehensive reading covering:

**Personality & Character**
Analyze their core personality traits based on their zodiac sign and life path number.

**Career & Professional Life**
Provide insights about their career path, suitable professions, and professional growth.

**Relationships & Love**
Discuss their romantic compatibility, marriage prospects, and relationship patterns.

**Health & Wellness**
Offer guidance on physical and mental health considerations.

**Financial Outlook**
Share insights about wealth accumulation and financial management.

**Specific Guidance**
Address their specific questions: ${userData.questions}

**Lucky Elements**
- Lucky Numbers
- Lucky Colors  
- Lucky Days
- Lucky Gemstones

**Remedies & Recommendations**
Suggest specific mantras, rituals, or practices for their well-being.

Use **Section Title** format for headings. Be specific, positive yet realistic, and provide actionable guidance.`;

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
                    { 
                        role: 'system', 
                        content: 'You are an expert Vedic astrologer (Jyotishi) with 30+ years of experience. You provide detailed, insightful, and spiritually uplifting readings. Your predictions are specific and actionable. You always maintain a positive yet realistic tone.' 
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 3000,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API error:', errorData);
            return null;
        }

        const data = await response.json();
        const reading = data.choices?.[0]?.message?.content;

        if (!reading) {
            console.error('No reading content received');
            return null;
        }

        return {
            reading: reading,
            zodiac: zodiac,
            lifePath: lifePath
        };
    } catch (e) {
        console.error('OpenAI API error:', e);
        return null;
    }
}
















