import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Load GeoJSON data for demo mode
let cctvData = { type: 'FeatureCollection', features: [] };
let streetlightData = { type: 'FeatureCollection', features: [] };

try {
    const cctvPath = path.join(__dirname, '../../data/cctv_india.geojson');
    const streetlightPath = path.join(__dirname, '../../data/streetlights_india.geojson');

    if (fs.existsSync(cctvPath)) {
        cctvData = JSON.parse(fs.readFileSync(cctvPath, 'utf8'));
        console.log(`✅ Loaded ${cctvData.features.length} CCTV cameras`);
    }
    if (fs.existsSync(streetlightPath)) {
        streetlightData = JSON.parse(fs.readFileSync(streetlightPath, 'utf8'));
        console.log(`✅ Loaded ${streetlightData.features.length} streetlights`);
    }
} catch (error) {
    console.log('⚠️ Could not load GeoJSON data:', error.message);
}

// Socket.IO
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            process.env.ADMIN_URL || 'http://localhost:3001'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001'
    ],
    credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Store for demo mode
const demoStore = {
    users: new Map(),
    sosEvents: new Map(),
    reports: [],
    getCrimeData: () => {
        const crimeTypes = ['robbery', 'harassment', 'theft', 'assault', 'vandalism'];
        const crimes = [];
        for (let i = 0; i < 100; i++) {
            crimes.push({
                type: 'Feature',
                properties: {
                    type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
                    severity: Math.floor(Math.random() * 5) + 1,
                    weight: Math.random()
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        77.5946 + (Math.random() - 0.5) * 0.1,
                        12.9716 + (Math.random() - 0.5) * 0.1
                    ]
                }
            });
        }
        return { type: 'FeatureCollection', features: crimes };
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'demo',
        data: {
            cctv: cctvData.features.length,
            streetlights: streetlightData.features.length
        }
    });
});

// ============ DEMO API ROUTES ============

// Auth routes
app.post('/api/auth/login', (req, res) => {
    res.json({
        success: true,
        user: { id: 'demo-user', name: 'Demo User', email: 'demo@saferoutex.com', role: 'user' }
    });
});

app.post('/api/auth/signup', (req, res) => {
    res.json({ success: true, message: 'Demo mode - signup simulated' });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ user: { id: 'demo-user', name: 'Demo User', email: 'demo@saferoutex.com', role: 'admin' } });
});

// Route API
app.post('/api/route/get', (req, res) => {
    const { origin, destination } = req.body;

    const oLon = origin?.lon || 77.5946;
    const oLat = origin?.lat || 12.9716;
    const dLon = destination?.lon || 77.6245;
    const dLat = destination?.lat || 12.9352;

    res.json({
        success: true,
        routes: {
            fastest: {
                geometry: { type: 'LineString', coordinates: [[oLon, oLat], [dLon, dLat]] },
                distance: 5.2, duration: '15 min', safetyScore: 0.65
            },
            safest: {
                geometry: {
                    type: 'LineString', coordinates: [
                        [oLon, oLat], [oLon + 0.01, oLat - 0.01], [dLon - 0.01, dLat + 0.01], [dLon, dLat]
                    ]
                },
                distance: 6.1, duration: '18 min', safetyScore: 0.89
            }
        }
    });
});

// SOS API
app.post('/api/sos/start', (req, res) => {
    const { lat, lon, message } = req.body;
    const sosId = 'sos-' + Date.now();

    const sosEvent = {
        id: sosId, sosId, userId: 'demo-user', userName: 'Demo User', userPhone: '+91 98765 43210',
        location: { lat, lon }, message, status: 'active', startedAt: new Date().toISOString()
    };

    demoStore.sosEvents.set(sosId, sosEvent);
    io.to('admin-room').emit('sos:new', sosEvent);

    res.json({ success: true, sosEvent: { id: sosId } });
});

app.post('/api/sos/location', (req, res) => {
    const { sosId, lat, lon } = req.body;
    const sos = demoStore.sosEvents.get(sosId);
    if (sos) {
        sos.location = { lat, lon };
        io.to('admin-room').emit('sos:location', { sosId, lat, lon });
    }
    res.json({ success: true });
});

app.post('/api/sos/stop', (req, res) => {
    const { sosId } = req.body;
    const sos = demoStore.sosEvents.get(sosId);
    if (sos) {
        io.to('admin-room').emit('sos:stopped', { sosId, userName: sos.userName });
        demoStore.sosEvents.delete(sosId);
    }
    res.json({ success: true });
});

// Reports API
app.post('/api/report/create', (req, res) => {
    const { type, lat, lon, description } = req.body;
    const report = {
        id: 'report-' + Date.now(), type, lat, lon, description,
        reporter_name: 'Demo User', status: 'pending', created_at: new Date().toISOString()
    };
    demoStore.reports.push(report);
    io.to('admin-room').emit('report:new', { report });
    res.json({ success: true, report });
});

app.get('/api/report/list', (req, res) => {
    res.json({ reports: demoStore.reports });
});

// Layers API
app.get('/api/layers/cctv', (req, res) => {
    const filtered = {
        type: 'FeatureCollection',
        features: cctvData.features.filter(f => {
            const [lon, lat] = f.geometry.coordinates;
            return lon > 77 && lon < 78.5 && lat > 12 && lat < 14;
        }).slice(0, 500)
    };
    res.json({ geojson: filtered, count: filtered.features.length });
});

app.get('/api/layers/streetlights', (req, res) => {
    const filtered = {
        type: 'FeatureCollection',
        features: streetlightData.features.filter(f => {
            const [lon, lat] = f.geometry.coordinates;
            return lon > 77 && lon < 78.5 && lat > 12 && lat < 14;
        }).slice(0, 1000)
    };
    res.json({ geojson: filtered, count: filtered.features.length });
});

app.get('/api/layers/crime', (req, res) => {
    res.json({ geojson: demoStore.getCrimeData() });
});

app.get('/api/layers/stats', (req, res) => {
    res.json({
        stats: {
            active_sos: demoStore.sosEvents.size,
            pending_reports: demoStore.reports.filter(r => r.status === 'pending').length,
            active_cctv: cctvData.features.length,
            broken_lights: Math.floor(streetlightData.features.length * 0.05),
            crimes_30d: 127
        }
    });
});

// Admin API
app.get('/api/admin/sos/active', (req, res) => {
    const activeSOS = Array.from(demoStore.sosEvents.values());
    res.json({ activeSOS });
});

app.get('/api/admin/reports/unverified', (req, res) => {
    res.json({ reports: demoStore.reports.filter(r => r.status === 'pending') });
});

app.post('/api/admin/report/verify', (req, res) => {
    const { reportId, status } = req.body;
    const report = demoStore.reports.find(r => r.id === reportId);
    if (report) report.status = status;
    res.json({ success: true });
});

// ============ AI CHAT API ============
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SAFETY_PROMPT = `You are SafeRouteX AI, a helpful safety navigation assistant for Bangalore, India.

Available data:
- Crime hotspots: Majestic area, parts of Whitefield (late night)
- CCTV coverage: ~${cctvData.features.length} cameras loaded
- Streetlights: ~${streetlightData.features.length} lights loaded
- Safety features: SOS button, incident reporting, crime heatmap

Guidelines:
- Be concise, helpful, and reassuring (2-3 paragraphs max)
- Use emojis sparingly
- For night travel: recommend well-lit main roads
- Mention CCTV/streetlight layers when relevant
- If asked about routes, mention the Route Panel feature
- For emergencies, explain the SOS button (bottom-right, red)`;

app.post('/api/ai/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }

    // If no API key, use demo responses
    if (!GEMINI_API_KEY) {
        return res.json({
            response: getDemoResponse(message),
            source: 'demo'
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
            res.json({ response: getDemoResponse(message), source: 'fallback' });
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        res.json({ response: getDemoResponse(message), source: 'error-fallback' });
    }
});

function getDemoResponse(msg) {
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

// Socket.IO handlers
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('auth', () => {
        socket.emit('auth:success', { userId: 'demo-user', role: 'admin' });
    });

    socket.on('admin:subscribe', () => {
        socket.join('admin-room');
        console.log('👮 Admin joined admin-room');
    });

    socket.on('sos:location', (data) => {
        io.to('admin-room').emit('sos:location', data);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`
🚀 SafeRouteX Demo Server running on port ${PORT}
📍 Mode: DEMO (no database required)
📊 Loaded: ${cctvData.features.length} CCTV, ${streetlightData.features.length} streetlights

Endpoints:
- Health: http://localhost:${PORT}/health
- API: http://localhost:${PORT}/api/*
  `);
});
