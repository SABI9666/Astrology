export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, birthDate, birthTime, birthPlace, language = 'english', gender = 'male', questions = '' } = req.body;

        if (!name || !birthDate || !birthTime || !birthPlace) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                success: false,
                message: 'OpenAI API key not configured'
            });
        }

        // Zodiac data with Indian names
        const zodiacSigns = [
            { name: 'Capricorn', hindiName: 'मकर', symbol: '♑', element: 'Earth', indianElement: 'पृथ्वी', dates: [12, 22, 1, 19] },
            { name: 'Aquarius', hindiName: 'कुंभ', symbol: '♒', element: 'Air', indianElement: 'वायु', dates: [1, 20, 2, 18] },
            { name: 'Pisces', hindiName: 'मीन', symbol: '♓', element: 'Water', indianElement: 'जल', dates: [2, 19, 3, 20] },
            { name: 'Aries', hindiName: 'मेष', symbol: '♈', element: 'Fire', indianElement: 'अग्नि', dates: [3, 21, 4, 19] },
            { name: 'Taurus', hindiName: 'वृषभ', symbol: '♉', element: 'Earth', indianElement: 'पृथ्वी', dates: [4, 20, 5, 20] },
            { name: 'Gemini', hindiName: 'मिथुन', symbol: '♊', element: 'Air', indianElement: 'वायु', dates: [5, 21, 6, 20] },
            { name: 'Cancer', hindiName: 'कर्क', symbol: '♋', element: 'Water', indianElement: 'जल', dates: [6, 21, 7, 22] },
            { name: 'Leo', hindiName: 'सिंह', symbol: '♌', element: 'Fire', indianElement: 'अग्नि', dates: [7, 23, 8, 22] },
            { name: 'Virgo', hindiName: 'कन्या', symbol: '♍', element: 'Earth', indianElement: 'पृथ्वी', dates: [8, 23, 9, 22] },
            { name: 'Libra', hindiName: 'तुला', symbol: '♎', element: 'Air', indianElement: 'वायु', dates: [9, 23, 10, 22] },
            { name: 'Scorpio', hindiName: 'वृश्चिक', symbol: '♏', element: 'Water', indianElement: 'जल', dates: [10, 23, 11, 21] },
            { name: 'Sagittarius', hindiName: 'धनु', symbol: '♐', element: 'Fire', indianElement: 'अग्नि', dates: [11, 22, 12, 21] }
        ];

        // Language instructions
        const languageInstructions = {
            english: 'Respond in English.',
            hindi: 'Respond entirely in Hindi (हिन्दी) using Devanagari script. Use traditional Vedic astrology terms.',
            tamil: 'Respond entirely in Tamil (தமிழ்) using Tamil script. Use traditional Jyotish terms.',
            telugu: 'Respond entirely in Telugu (తెలుగు) using Telugu script. Use traditional Jyotish terms.',
            malayalam: 'Respond entirely in Malayalam (മലയാളം) using Malayalam script. Use traditional Jyotish terms.',
            kannada: 'Respond entirely in Kannada (ಕನ್ನಡ) using Kannada script. Use traditional Jyotish terms.',
            bengali: 'Respond entirely in Bengali (বাংলা) using Bengali script. Use traditional Jyotish terms.',
            marathi: 'Respond entirely in Marathi (मराठी) using Devanagari script. Use traditional Jyotish terms.',
            gujarati: 'Respond entirely in Gujarati (ગુજરાતી) using Gujarati script. Use traditional Jyotish terms.',
            punjabi: 'Respond entirely in Punjabi (ਪੰਜਾਬੀ) using Gurmukhi script. Use traditional Jyotish terms.',
            odia: 'Respond entirely in Odia (ଓଡ଼ିଆ) using Odia script. Use traditional Jyotish terms.',
            assamese: 'Respond entirely in Assamese (অসমীয়া) using Assamese script. Use traditional Jyotish terms.'
        };

        function getZodiacSign(month, day) {
            for (const sign of zodiacSigns) {
                const [startMonth, startDay, endMonth, endDay] = sign.dates;
                if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
                    return sign;
                }
            }
            return zodiacSigns[0];
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

        // Calculate birth details
        const date = new Date(birthDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const zodiac = getZodiacSign(month, day);
        const lifePathNumber = calculateLifePathNumber(birthDate);

        // Build the prompt
        const prompt = `You are an expert Vedic astrologer (Jyotishi) providing personalized predictions.

**Querent Details:**
- Name: ${name}
- Gender: ${gender}
- Date of Birth: ${formatDate(birthDate)}
- Time of Birth: ${formatTime(birthTime)}
- Place of Birth: ${birthPlace}
- Sun Sign (Rashi): ${zodiac.name} (${zodiac.hindiName}) ${zodiac.symbol}
- Element: ${zodiac.element} (${zodiac.indianElement})
- Life Path Number: ${lifePathNumber}

**User's Questions/Areas of Interest:**
${questions}

**Instructions:**
${languageInstructions[language] || languageInstructions.english}

Provide a detailed astrological reading addressing the user's specific questions. Include:

1. **Personality Analysis** - Based on their Rashi (Sun Sign) and birth details
2. **Specific Predictions** - Answer their questions with approximate timeframes (like "in the next 6-12 months", "after age 28", "between 2025-2026")
3. **Favorable Periods** - Mention auspicious times for their queries
4. **Remedies & Suggestions** - Provide traditional remedies like:
   - Lucky colors, numbers, days
   - Gemstones (if applicable)
   - Mantras or prayers
   - Charitable acts (Daan)
5. **Planetary Influences** - Mention relevant planetary positions affecting their life

Be specific with predictions. If they ask about marriage, give approximate age/year. If about job, mention timeline. Be encouraging but realistic.

Keep response around 800-1000 words. Use **Section Title** format for headings.`;

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
                    {
                        role: 'system',
                        content: `You are "Celestial Oracle", a renowned Vedic astrologer combining traditional Indian Jyotish wisdom with intuitive insights. You speak with authority and compassion. You provide specific predictions with timeframes. ${languageInstructions[language] || ''}`
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(500).json({ 
                success: false,
                message: errorData.error?.message || 'AI service error'
            });
        }

        const data = await response.json();
        const reading = data.choices[0].message.content;

        return res.status(200).json({
            success: true,
            data: {
                name,
                birthDate: formatDate(birthDate),
                birthTime: formatTime(birthTime),
                birthPlace,
                gender,
                language,
                zodiac: {
                    name: zodiac.name,
                    hindiName: zodiac.hindiName,
                    symbol: zodiac.symbol,
                    element: zodiac.element
                },
                lifePathNumber,
                reading
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false,
            message: error.message || 'Server error'
        });
    }
}
