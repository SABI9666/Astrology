export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, birthDate, birthTime, birthPlace } = req.body;

        // Validate input
        if (!name || !birthDate || !birthTime || !birthPlace) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields',
                message: 'Please provide name, birthDate, birthTime, and birthPlace'
            });
        }

        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error',
                message: 'OpenAI API key not configured. Add OPENAI_API_KEY in Vercel Environment Variables.'
            });
        }

        // Zodiac calculation
        const zodiacSigns = [
            { name: 'Capricorn', symbol: '♑', element: 'Earth', dates: [12, 22, 1, 19] },
            { name: 'Aquarius', symbol: '♒', element: 'Air', dates: [1, 20, 2, 18] },
            { name: 'Pisces', symbol: '♓', element: 'Water', dates: [2, 19, 3, 20] },
            { name: 'Aries', symbol: '♈', element: 'Fire', dates: [3, 21, 4, 19] },
            { name: 'Taurus', symbol: '♉', element: 'Earth', dates: [4, 20, 5, 20] },
            { name: 'Gemini', symbol: '♊', element: 'Air', dates: [5, 21, 6, 20] },
            { name: 'Cancer', symbol: '♋', element: 'Water', dates: [6, 21, 7, 22] },
            { name: 'Leo', symbol: '♌', element: 'Fire', dates: [7, 23, 8, 22] },
            { name: 'Virgo', symbol: '♍', element: 'Earth', dates: [8, 23, 9, 22] },
            { name: 'Libra', symbol: '♎', element: 'Air', dates: [9, 23, 10, 22] },
            { name: 'Scorpio', symbol: '♏', element: 'Water', dates: [10, 23, 11, 21] },
            { name: 'Sagittarius', symbol: '♐', element: 'Fire', dates: [11, 22, 12, 21] }
        ];

        function getZodiacSign(month, day) {
            for (const sign of zodiacSigns) {
                const [startMonth, startDay, endMonth, endDay] = sign.dates;
                if ((month === startMonth && day >= startDay) || 
                    (month === endMonth && day <= endDay)) {
                    return sign;
                }
            }
            return zodiacSigns[0];
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }

        function formatTime(timeStr) {
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        }

        function calculateLifePathNumber(dateStr) {
            const digits = dateStr.replace(/-/g, '').split('').map(Number);
            let sum = digits.reduce((a, b) => a + b, 0);
            while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
                sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
            }
            return sum;
        }

        // Calculate zodiac info
        const date = new Date(birthDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const zodiac = getZodiacSign(month, day);
        const lifePathNumber = calculateLifePathNumber(birthDate);

        // Create prompt
        const prompt = `You are a mystical astrologer providing a personalized astrological reading. 

The querent's details:
- Name: ${name}
- Date of Birth: ${formatDate(birthDate)}
- Time of Birth: ${formatTime(birthTime)}
- Place of Birth: ${birthPlace}
- Sun Sign: ${zodiac.name} (${zodiac.symbol})
- Element: ${zodiac.element}
- Life Path Number: ${lifePathNumber}

Please provide a comprehensive and mystical astrological reading that includes:

1. **Sun Sign Analysis** - Their ${zodiac.name} personality traits, strengths, and challenges.

2. **Life Path ${lifePathNumber} Insights** - Their life purpose and destiny based on numerology.

3. **Elemental Nature** - How their ${zodiac.element} element influences their personality.

4. **Love & Relationships** - Romantic tendencies and compatibility insights.

5. **Career & Purpose** - Professional strengths and ideal career paths.

6. **Personal Growth Advice** - Guidance for spiritual development.

Write in an elegant, mystical tone. Use poetic language. Address the person by name occasionally. Keep response around 600-800 words.`;

        // Call OpenAI API
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
                        content: 'You are Celestial Oracle, a mystical astrologer who provides insightful, personalized readings. Your tone is elegant, poetic, and spiritual. Format sections with **Section Title** format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return res.status(500).json({ 
                success: false,
                error: 'AI service error',
                message: errorData.error?.message || 'Failed to generate reading'
            });
        }

        const data = await response.json();
        const reading = data.choices[0].message.content;

        // Success response
        return res.status(200).json({
            success: true,
            data: {
                name,
                birthDate: formatDate(birthDate),
                birthTime: formatTime(birthTime),
                birthPlace,
                zodiac: {
                    name: zodiac.name,
                    symbol: zodiac.symbol,
                    element: zodiac.element
                },
                lifePathNumber,
                reading
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Server error',
            message: error.message || 'An unexpected error occurred.'
        });
    }
}
