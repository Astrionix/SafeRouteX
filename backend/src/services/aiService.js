/**
 * SafeRouteX AI Service
 * 
 * Provides AI-powered safety analysis using Gemini API.
 * Includes safety predictions, natural language queries, and report analysis.
 */

import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// System prompt for safety assistant
const SAFETY_ASSISTANT_PROMPT = `You are SafeRouteX AI, a helpful safety navigation assistant for a platform that helps users find safe routes in Bangalore, India.

You have access to the following data:
- Crime hotspots in Bangalore (Majestic, Whitefield late night, some parts of Koramangala)
- CCTV coverage: ~1,250 operational cameras
- Streetlight coverage: 92% operational
- Real-time SOS and incident reporting system

Your capabilities:
1. Assess if routes/areas are safe based on time of day
2. Provide safety tips for travelers
3. Explain how the safety scoring works
4. Help users use the SOS and reporting features
5. Give insights about crime patterns

Guidelines:
- Be helpful, concise, and reassuring
- Always prioritize user safety
- Use emojis sparingly for friendliness
- If unsure, recommend using well-lit main roads
- Mention CCTV coverage when relevant
- For late night travel, suggest ride-sharing or staying on main roads

Current context: User is using the SafeRouteX app in Bangalore, India.`;

/**
 * Generate AI response using Gemini
 */
export async function generateAIResponse(userMessage, context = {}) {
    if (!GEMINI_API_KEY) {
        return getDemoResponse(userMessage);
    }

    try {
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${SAFETY_ASSISTANT_PROMPT}\n\nUser Query: ${userMessage}` }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        return getDemoResponse(userMessage);
    } catch (error) {
        console.error('Gemini API error:', error);
        return getDemoResponse(userMessage);
    }
}

/**
 * Analyze incident report for categorization and severity
 */
export async function analyzeReport(reportText) {
    if (!GEMINI_API_KEY) {
        return {
            category: 'other',
            severity: 3,
            summary: reportText.substring(0, 100),
            keywords: []
        };
    }

    try {
        const prompt = `Analyze this incident report and return JSON:
Report: "${reportText}"

Return ONLY valid JSON with:
{
  "category": "harassment|theft|robbery|vandalism|unsafe_street|other",
  "severity": 1-5 (5 being most severe),
  "summary": "brief summary",
  "keywords": ["relevant", "keywords"],
  "urgent": true/false
}`;

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Report analysis error:', error);
    }

    return { category: 'other', severity: 3, summary: reportText.substring(0, 100), keywords: [] };
}

/**
 * Predict safety score for a location at a given time
 */
export async function predictSafety(lat, lon, hour) {
    // Base safety factors
    const isNight = hour >= 22 || hour < 6;
    const isLateEvening = hour >= 19 || hour < 22;

    // Known risk areas in Bangalore (demo data)
    const riskAreas = [
        { lat: 12.9716, lon: 77.5946, name: 'Majestic', risk: 0.4 },
        { lat: 12.9698, lon: 77.7500, name: 'Whitefield', risk: 0.2 },
    ];

    let baseScore = 0.75;

    // Time modifiers
    if (isNight) baseScore -= 0.2;
    else if (isLateEvening) baseScore -= 0.1;

    // Location modifiers
    for (const area of riskAreas) {
        const distance = Math.sqrt(Math.pow(lat - area.lat, 2) + Math.pow(lon - area.lon, 2));
        if (distance < 0.02) { // ~2km
            baseScore -= area.risk * (1 - distance / 0.02);
        }
    }

    return {
        score: Math.max(0.1, Math.min(1, baseScore)),
        timeRisk: isNight ? 'high' : isLateEvening ? 'moderate' : 'low',
        recommendations: isNight
            ? ['Use main roads', 'Enable location sharing', 'Consider ride-sharing']
            : ['Stay aware of surroundings']
    };
}

/**
 * Demo responses when Gemini API is not configured
 */
function getDemoResponse(message) {
    const lower = message.toLowerCase();

    if (lower.includes('safe') && (lower.includes('route') || lower.includes('path'))) {
        return `🗺️ **Finding Safe Routes**

To get the safest route:
1. Enter your destination in the Route Panel
2. Compare the **Safest** (green) vs **Fastest** (orange) options
3. The safety score considers CCTV coverage, lighting, and crime history

Pro tip: Enable the 📹 CCTV layer to see camera coverage along your route!`;
    }

    if (lower.includes('night') || lower.includes('late') || lower.includes('dark')) {
        return `🌙 **Night Travel Safety**

For travel after dark in Bangalore:
- Stick to well-lit main roads (MG Road, Brigade Road)
- Areas like Indiranagar, Koramangala 4th Block are generally safer
- Avoid isolated areas near Majestic after 11 PM
- Consider Ola/Uber for late-night travel

Toggle the 💡 Streetlight layer to see lighting coverage!`;
    }

    if (lower.includes('sos') || lower.includes('emergency')) {
        return `🆘 **SOS Emergency Feature**

The red SOS button (bottom-right) will:
1. Share your live location with emergency contacts
2. Alert nearby patrol units
3. Start tracking your movement

**Activate:** Press and hold for 3 seconds
**Cancel:** Tap "Cancel" within the countdown

Stay safe! Your safety is our priority.`;
    }

    if (lower.includes('crime') || lower.includes('danger') || lower.includes('unsafe')) {
        return `📊 **Bangalore Safety Insights**

Based on recent data:
- **Hotspots:** Majestic area, certain parts of Whitefield (late night)
- **Safer zones:** Indiranagar, Koramangala, Jayanagar
- **Peak risk times:** 10 PM - 2 AM

Toggle the 🔥 Crime Heatmap to visualize this on the map!

The safest route algorithm automatically avoids high-risk areas.`;
    }

    return `👋 **Hello! I'm your SafeRouteX AI Assistant**

I can help you with:
• 🗺️ Finding the safest routes
• 🌙 Night travel safety tips
• 📍 Area safety assessment
• 🆘 Using emergency features
• 📊 Understanding crime patterns

What would you like to know?`;
}

export default {
    generateAIResponse,
    analyzeReport,
    predictSafety
};
