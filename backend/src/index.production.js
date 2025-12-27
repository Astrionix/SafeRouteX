import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Config
import { testConnection } from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import routeRoutes from './routes/route.js';
import sosRoutes from './routes/sos.js';
import reportRoutes from './routes/report.js';
import layerRoutes from './routes/layers.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';

// Socket Handlers
import { initializeSocketHandlers } from './sockets/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
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

// Attach IO to request for controllers
app.use((req, res, next) => {
    req.app.set('io', io);
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/layers', layerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', async (req, res) => {
    try {
        await testConnection();
        res.json({
            status: 'ok',
            mode: 'production',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            mode: 'production',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Initialize Socket Handlers
initializeSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
    console.log(`
🚀 SafeRouteX Server running on port ${PORT}
📍 Mode: PRODUCTION (Database connected)
    `);

    // Test DB connection on start
    try {
        await testConnection();
        console.log('✅ Database connection successful');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
});
