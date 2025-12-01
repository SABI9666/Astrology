// Secure Reading API with validation and rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 5; // max 5 readings per minute per IP

export default async function handler(req, res) {
    // Security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const now = Date.now();
    
    if (rateLimitMap.has(clientIP)) {
        const clientData = rateLimitMap.get(clientIP);
        if (now - clientData.firstRequest < RATE_LIMIT_WINDOW) {
            if (clientData.count >= MAX_REQUESTS) {
                return res.status(429).json({ 
                    success: false, 
                    message: 'Too many requests. Please wait before requesting another reading.' 
                });
            }
            clientData.count++;
        } else {
            rateLimitMap.set(clientIP, { firstRequest: now, count: 1 });
        }
    } else {
        rateLimitMap.set(clientIP, { firstRequest: now, count: 1 });
    }

    try {
        const { name, birthDate, birthTime, birthPlace, language, gender, questions } = req.body;

        // Input validation
        if (!name || !birthDate || !birthTime || !birthPlace) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Sanitize inputs
        const sanitize = (str, maxLen = 100) => {
            if (typeof str !== 'string') return '';
            return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
        };

        const safeName = sanitize(name, 50);
        const safeBirthPlace = sanitize(birthPlace, 100);
        const safeQuestions = sanitize(questions, 500);
        const safeLanguage = ['english', 'hindi', 'tamil', 'telugu', 'malayalam', 'kannada', 'bengali', 'marathi', 'gujarati', 'punjabi', 'odia', 'assamese'].includes(language) ? language : 'english';
        const safeGender = ['male', 'female', 'other'].includes(gender) ? gender : 'other';

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^\d{2}:\d{2}$/;
        
        if (!dateRegex.test(birthDate) || !timeRegex.test(birthTime)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid date or time format' 
            });
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
            const [startMonth, startDay] = sign.start;
            const [endMonth, endDay] = sign.end;
            
            if (startMonth === 12 && endMonth === 1) {
                if ((month === 12 && day >= startDay) || (month === 1 && day <= endDay)) {
                    zodiac = sign;
                    break;
                }
            } else if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
                zodiac = sign;
                break;
            }
        }

        // Calculate life path number
        const digits = birthDate.replace(/-/g, '').split('').map(Number);
        let lifePathNumber = digits.reduce((a, b) => a + b, 0);
        while (lifePathNumber > 9 && lifePathNumber !== 11 && lifePathNumber !== 22) {
            lifePathNumber = String(lifePathNumber).split('').map(Number).reduce((a, b) => a + b, 0);
        }

        // Check API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Service temporarily unavailable' 
            });
        }

        // Language instructions
        const languageInstructions = {
            english: 'Respond entirely in English.',
            hindi: 'Respond entirely in Hindi (हिंदी में).',
            tamil: 'Respond entirely in Tamil (தமிழில்).',
            telugu: 'Respond entirely in Telugu (తెలుగులో).',
            malayalam: 'Respond entirely in Malayalam (മലയാളത്തിൽ).',
            kannada: 'Respond entirely in Kannada (ಕನ್ನಡದಲ್ಲಿ).',
            bengali: 'Respond entirely in Bengali (বাংলায়).',
            marathi: 'Respond entirely in Marathi (मराठीत).',
            gujarati: 'Respond entirely in Gujarati (ગુજરાતીમાં).',
            punjabi: 'Respond entirely in Punjabi (ਪੰਜਾਬੀ ਵਿੱਚ).',
            odia: 'Respond entirely in Odia (ଓଡ଼ିଆରେ).',
            assamese: 'Respond entirely in Assamese (অসমীয়াত).'
        };

        const prompt = `You are an expert Vedic astrologer. Provide a detailed, personalized reading.

**Person Details:**
- Name: ${safeName}
- Gender: ${safeGender}
- Birth Date: ${birthDate}
- Birth Time: ${birthTime}
- Birth Place: ${safeBirthPlace}
- Sun Sign: ${zodiac.name} (${zodiac.symbol})
- Element: ${zodiac.element}
- Life Path Number: ${lifePathNumber}

**Questions/Areas of Focus:**
${safeQuestions || 'General life reading'}

${languageInstructions[safeLanguage]}

Provide specific predictions with timeframes. Use **Section Title** format for headings. Be encouraging but realistic.`;

        // Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an expert Vedic astrologer providing authentic, insightful readings.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI error:', errorData);
            return res.status(500).json({ 
                success: false, 
                message: 'Unable to generate reading. Please try again.' 
            });
        }

        const data = await response.json();
        const reading = data.choices?.[0]?.message?.content;

        if (!reading) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to generate reading' 
            });
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
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again.' 
        });
    }
}
