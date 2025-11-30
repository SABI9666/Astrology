/ Zodiac data for calculations
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

// Helper function to get zodiac sign
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

// Helper function to format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Helper function to format time
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Calculate life path number
function calculateLifePathNumber(dateStr) {
    const digits = dateStr.replace(/-/g, '').split('').map(Number);
    let sum = digits.reduce((a, b) => a + b, 0);
    
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
    }
    
    return sum;
}

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
                error: 'Missing required fields',
                message: 'Please provide name, birthDate, birthTime, and birthPlace'
            });
        }

        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to Vercel environment variables.'
            });
        }

        // Calculate zodiac information
        const date = new Date(birthDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const zodiac = getZodiacSign(month, day);
        const lifePathNumber = calculateLifePathNumber(birthDate);

        // Create prompt for AI
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

1. **Sun Sign Analysis** - A deep dive into their ${zodiac.name} sun sign personality traits, strengths, and challenges.

2. **Life Path ${lifePathNumber} Insights** - Based on their numerology life path number, provide insights into their life purpose and destiny.

3. **Elemental Nature** - How their ${zodiac.element} element influences their personality and approach to life.

4. **Current Cosmic Influences** - What energies are affecting them right now based on current planetary positions.

5. **Love & Relationships** - Their romantic tendencies and compatibility insights.

6. **Career & Purpose** - Professional strengths and ideal career paths.

7. **Personal Growth Advice** - Guidance for their spiritual and personal development journey.

Write in an elegant, mystical tone that feels personal and insightful. Use poetic language and cosmic metaphors. Make it feel like a genuine connection with the universe. Address the person by their name occasionally. Keep the response well-structured and about 800-1000 words.`;

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Celestial Oracle, a mystical and wise astrologer who provides insightful, personalized astrological readings. Your tone is elegant, poetic, and deeply spiritual. You speak with ancient wisdom while remaining relatable and warm. Format your response with clear sections using **Section Title** format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return res.status(response.status).json({ 
                error: 'AI service error',
                message: errorData.error?.message || 'Failed to generate reading'
            });
        }

        const data = await response.json();
        const reading = data.choices[0].message.content;

        // Send successful response
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
            error: 'Server error',
            message: 'An unexpected error occurred. Please try again later.'
        });
    }
}
