import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

router.post('/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }

    // Get current stats from DB for context
    let stats = { cctv: 0, lights: 0 };
    try {
        const result = await query(`
            SELECT 
                (SELECT COUNT(*) FROM cctv WHERE status = 'operational') as cctv,
                (SELECT COUNT(*) FROM streetlights WHERE status = 'operational') as lights
        `);
        stats = result.rows[0];
    } catch (err) {
        console.error('Error fetching stats for AI context:', err);
    }

    const SAFETY_PROMPT = `You are SafeRouteX AI, a helpful safety navigation assistant for Bangalore, India.

Available live data:
- CCTV coverage: ~${stats.cctv} operational cameras
- Streetlights: ~${stats.lights} operational lights
- Safety features: SOS button, incident reporting, crime heatmap

Guidelines:
- Be concise, helpful, and reassuring (2-3 paragraphs max)
- Use emojis sparingly
- For night travel: recommend well-lit main roads
- Mention CCTV/streetlight layers when relevant
- If asked about routes, mention the Route Panel feature
- For emergencies, explain the SOS button (bottom-right, red)`;

    // If no API key, use fallback responses
    if (!GEMINI_API_KEY) {
        return res.json({
            response: getFallbackResponse(message),
            source: 'fallback_no_key'
        });
    }

    try {
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `${SAFETY_PROMPT}\n\nUser: ${message}` }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 400,
                }
            })
        });

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            res.json({
                response: data.candidates[0].content.parts[0].text,
                source: 'gemini'
            });
        } else {
            console.error('Gemini API/Unexpected response:', JSON.stringify(data));
            res.json({ response: getFallbackResponse(message), source: 'fallback_error' });
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        res.json({ response: getFallbackResponse(message), source: 'fallback_exception' });
    }
});

function getFallbackResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('route') || m.includes('path')) {
        return '🗺️ To find safe routes, use the Route Panel on the left. Enter your origin and destination, then compare Fastest vs Safest options. The safety score considers CCTV coverage, lighting, and crime history.';
    }
    if (m.includes('night') || m.includes('late') || m.includes('dark')) {
        return '🌙 For night travel in Bangalore: Stick to well-lit main roads like MG Road. Indiranagar and Koramangala 4th Block are generally safer. Avoid isolated areas near Majestic after 11 PM. Toggle the 💡 Streetlight layer to see lighting coverage!';
    }
    if (m.includes('sos') || m.includes('emergency')) {
        return '🆘 The SOS button (red, bottom-right) shares your live location with emergency contacts and alerts nearby patrol units. Press and hold for 3 seconds to activate. Stay safe!';
    }
    if (m.includes('crime') || m.includes('danger')) {
        return '📊 Bangalore insights: Hotspots include Majestic area and parts of Whitefield (late night). Safer zones: Indiranagar, Koramangala, Jayanagar. Toggle the 🔥 Crime Heatmap to visualize!';
    }
    return '👋 I\'m your SafeRouteX AI Assistant! I can help with:\n• 🗺️ Finding safe routes\n• 🌙 Night travel tips\n• 📍 Area safety\n• 🆘 Emergency features\n\nWhat would you like to know?';
}

export default router;
