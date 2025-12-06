import { verifyIdToken } from '../config/firebase.js';
import { query } from '../config/database.js';

// Active SOS tracking sessions
const activeSOS = new Map();

export function initializeSocketHandlers(io) {
    // Admin room for police/admin dashboard
    io.on('connection', async (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Authenticate socket connection
        socket.on('auth', async (token) => {
            try {
                if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
                    socket.user = { uid: 'dev-admin', role: 'admin', name: 'Dev Admin' };
                    socket.join('admin-room');
                    socket.emit('auth:success', { role: 'admin' });
                    return;
                }

                const decoded = await verifyIdToken(token);
                const result = await query('SELECT id, name, role FROM users WHERE firebase_uid = $1', [decoded.uid]);

                if (result.rows.length > 0) {
                    socket.user = result.rows[0];
                    if (['admin', 'police'].includes(socket.user.role)) {
                        socket.join('admin-room');
                        console.log(`Admin ${socket.user.name} joined admin-room`);
                    }
                    socket.emit('auth:success', { role: socket.user.role });
                }
            } catch (error) {
                socket.emit('auth:error', { message: 'Authentication failed' });
            }
        });

        // SOS location updates from user app
        socket.on('sos:location', async (data) => {
            const { sosId, lat, lon, accuracy, speed, heading } = data;

            // Store in tracking table
            try {
                await query(`
          INSERT INTO sos_tracking (sos_id, location, accuracy, speed, heading, timestamp)
          VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, NOW())
        `, [sosId, lon, lat, accuracy, speed, heading]);

                // Broadcast to admin room
                io.to('admin-room').emit('sos:location', {
                    sosId, lat, lon, accuracy, speed, heading,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error saving SOS location:', error);
            }
        });

        // Join SOS tracking room
        socket.on('sos:join', (sosId) => {
            socket.join(`sos-${sosId}`);
        });

        // Leave SOS tracking room
        socket.on('sos:leave', (sosId) => {
            socket.leave(`sos-${sosId}`);
        });

        // Admin subscribes to all SOS updates
        socket.on('admin:subscribe', () => {
            if (socket.user?.role === 'admin' || socket.user?.role === 'police') {
                socket.join('admin-room');
                socket.emit('admin:subscribed');
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Socket.IO handlers initialized');
}

export { activeSOS };
