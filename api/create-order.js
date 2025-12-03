// api/create-order.js - Creates Razorpay order

import crypto from 'crypto';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const amount = parseInt(process.env.PAYMENT_AMOUNT || '100');

    if (!keyId || !keySecret) {
        return res.status(500).json({ 
            success: false, 
            message: 'Razorpay not configured' 
        });
    }

    try {
        const { name, birthDate, birthTime, birthPlace, language, gender, questions } = req.body;

        // Create order via Razorpay API
        const orderData = {
            amount: amount * 100, // Razorpay uses paise (100 = ₹1)
            currency: 'INR',
            receipt: 'order_' + Date.now(),
            notes: {
                name: name,
                birthDate: birthDate,
                purpose: 'Astrology Reading'
            }
        };

        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(orderData)
        });

        const order = await response.json();

        if (!response.ok) {
            throw new Error(order.error?.description || 'Failed to create order');
        }

        return res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: amount,
                currency: 'INR',
                keyId: keyId, // Public key - safe to send to frontend
                name: name,
                description: 'Celestial Oracle - Astrology Reading'
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create order' 
        });
    }
}
















