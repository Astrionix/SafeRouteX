import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// =====================================
// POST /api/sos/start
// Start an SOS emergency event
// =====================================
router.post('/start',
    authenticateToken,
    [
        body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        body('lon').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { lat, lon, accuracy, message } = req.body;
        const userId = req.user.id;

        // Check for existing active SOS
        const existingSOS = await query(
            `SELECT id FROM sos_events WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        if (existingSOS.rows.length > 0) {
            return res.status(409).json({
                error: 'Active SOS exists',
                sosId: existingSOS.rows[0].id,
                message: 'You already have an active SOS event'
            });
        }

        // Create SOS event and first tracking point
        const result = await transaction(async (client) => {
            // Create SOS event
            const sosResult = await client.query(
                `INSERT INTO sos_events (user_id, status, started_at)
         VALUES ($1, 'active', NOW())
         RETURNING id, user_id, status, started_at`,
                [userId]
            );

            const sosEvent = sosResult.rows[0];

            // Insert first tracking point
            await client.query(
                `INSERT INTO sos_tracking (sos_id, location, accuracy, timestamp)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, NOW())`,
                [sosEvent.id, lon, lat, accuracy || null]
            );

            return sosEvent;
        });

        // Get emergency contacts
        const contacts = await query(
            `SELECT name, phone FROM emergency_contacts WHERE user_id = $1`,
            [userId]
        );

        // Emit SOS event via WebSocket
        const io = req.app.get('io');
        io.to('admin-room').emit('sos:new', {
            sosId: result.id,
            userId: userId,
            userName: req.user.name,
            userPhone: req.user.phone,
            location: { lat, lon },
            startedAt: result.started_at,
            message
        });

        res.status(201).json({
            message: 'SOS activated',
            sosEvent: result,
            emergencyContacts: contacts.rows,
            instructions: [
                'Your location is being tracked',
                'Emergency contacts will be notified',
                'Help is on the way',
                'Stay calm and stay in a safe location if possible'
            ]
        });
    })
);

// =====================================
// POST /api/sos/location
// Update SOS location
// =====================================
router.post('/location',
    authenticateToken,
    [
        body('sosId').isUUID().withMessage('Invalid SOS ID'),
        body('lat').isFloat({ min: -90, max: 90 }),
        body('lon').isFloat({ min: -180, max: 180 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { sosId, lat, lon, accuracy, speed, heading } = req.body;
        const userId = req.user.id;

        // Verify SOS belongs to user and is active
        const sosCheck = await query(
            `SELECT id FROM sos_events WHERE id = $1 AND user_id = $2 AND status = 'active'`,
            [sosId, userId]
        );

        if (sosCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'SOS not found',
                message: 'No active SOS event found for this user'
            });
        }

        // Insert tracking point
        await query(
            `INSERT INTO sos_tracking (sos_id, location, accuracy, speed, heading, timestamp)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, NOW())`,
            [sosId, lon, lat, accuracy, speed, heading]
        );

        // Emit location update via WebSocket
        const io = req.app.get('io');
        io.to('admin-room').emit('sos:location', {
            sosId,
            userId,
            userName: req.user.name,
            location: { lat, lon },
            accuracy,
            speed,
            heading,
            timestamp: new Date().toISOString()
        });

        res.json({
            message: 'Location updated',
            timestamp: new Date().toISOString()
        });
    })
);

// =====================================
// POST /api/sos/stop
// Stop an active SOS event
// =====================================
router.post('/stop',
    authenticateToken,
    [
        body('sosId').isUUID().withMessage('Invalid SOS ID'),
        body('reason').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { sosId, reason, isFalseAlarm } = req.body;
        const userId = req.user.id;

        const status = isFalseAlarm ? 'false_alarm' : 'resolved';

        // Update SOS event
        const result = await query(
            `UPDATE sos_events 
       SET status = $1, ended_at = NOW(), resolution_notes = $2
       WHERE id = $3 AND user_id = $4 AND status = 'active'
       RETURNING id, status, started_at, ended_at`,
            [status, reason, sosId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'SOS not found',
                message: 'No active SOS event found'
            });
        }

        // Emit SOS stopped via WebSocket
        const io = req.app.get('io');
        io.to('admin-room').emit('sos:stopped', {
            sosId,
            userId,
            userName: req.user.name,
            status,
            reason,
            endedAt: result.rows[0].ended_at
        });

        res.json({
            message: 'SOS deactivated',
            sosEvent: result.rows[0]
        });
    })
);

// =====================================
// GET /api/sos/active
// Get user's active SOS (if any)
// =====================================
router.get('/active',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.id;

        const result = await query(`
      SELECT 
        se.id, se.status, se.started_at,
        ST_Y(st.location) as lat, 
        ST_X(st.location) as lon,
        st.timestamp as last_update
      FROM sos_events se
      LEFT JOIN LATERAL (
        SELECT * FROM sos_tracking
        WHERE sos_id = se.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) st ON true
      WHERE se.user_id = $1 AND se.status = 'active'
    `, [userId]);

        if (result.rows.length === 0) {
            return res.json({ active: false, sosEvent: null });
        }

        res.json({
            active: true,
            sosEvent: result.rows[0]
        });
    })
);

// =====================================
// GET /api/sos/history
// Get user's SOS history
// =====================================
router.get('/history',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        const result = await query(`
      SELECT 
        se.id, se.status, se.started_at, se.ended_at, se.resolution_notes,
        (SELECT COUNT(*) FROM sos_tracking WHERE sos_id = se.id) as tracking_points
      FROM sos_events se
      WHERE se.user_id = $1
      ORDER BY se.started_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

        res.json({
            history: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    })
);

// =====================================
// GET /api/sos/:id/trail
// Get tracking trail for an SOS event
// =====================================
router.get('/:id/trail',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify access (user owns SOS or is admin)
        const sosCheck = await query(
            `SELECT user_id FROM sos_events WHERE id = $1`,
            [id]
        );

        if (sosCheck.rows.length === 0) {
            return res.status(404).json({ error: 'SOS not found' });
        }

        if (sosCheck.rows[0].user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'police') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await query(`
      SELECT 
        ST_Y(location) as lat,
        ST_X(location) as lon,
        accuracy, speed, heading, timestamp
      FROM sos_tracking
      WHERE sos_id = $1
      ORDER BY timestamp ASC
    `, [id]);

        // Build GeoJSON LineString
        const coordinates = result.rows.map(row => [row.lon, row.lat]);
        const trail = {
            type: 'Feature',
            properties: {
                sosId: id,
                pointCount: result.rows.length
            },
            geometry: {
                type: 'LineString',
                coordinates
            }
        };

        res.json({
            trail,
            points: result.rows
        });
    })
);

export default router;
