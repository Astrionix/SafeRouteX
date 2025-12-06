import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// =====================================
// POST /api/report/create
// Create a new incident report
// =====================================
router.post('/create',
    authenticateToken,
    [
        body('type').isIn(['unsafe_street', 'harassment', 'robbery', 'dark_street', 'missing_streetlight', 'broken_cctv', 'other']),
        body('lat').isFloat({ min: -90, max: 90 }),
        body('lon').isFloat({ min: -180, max: 180 }),
        body('description').optional().isLength({ max: 1000 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type, lat, lon, description, mediaUrls } = req.body;
        const userId = req.user.id;

        // Simple toxicity check (placeholder - would use NLP service)
        const toxicityScore = checkToxicity(description);
        const sentiment = analyzeSentiment(description);

        // Auto-reject if toxicity is too high
        const verifiedStatus = toxicityScore > 0.8 ? 'rejected' : 'pending';

        const result = await query(
            `INSERT INTO user_reports (user_id, type, description, location, media_urls, verified_status, toxicity_score, sentiment)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9)
       RETURNING id, type, description, verified_status, created_at`,
            [userId, type, description, lon, lat, mediaUrls || [], verifiedStatus, toxicityScore, sentiment]
        );

        // If it's a crime type, also create a pending crime incident
        if (['harassment', 'robbery'].includes(type)) {
            await query(
                `INSERT INTO crime_incidents (type, severity, description, location, occurred_at, verified, source)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), NOW(), false, 'user_report')`,
                [type, getSeverity(type), description, lon, lat]
            );
        }

        // Emit to admin dashboard
        const io = req.app.get('io');
        io.to('admin-room').emit('report:new', {
            report: result.rows[0],
            location: { lat, lon },
            userName: req.user.name,
            userId
        });

        res.status(201).json({
            message: 'Report submitted successfully',
            report: result.rows[0],
            note: verifiedStatus === 'rejected'
                ? 'Your report was flagged for review due to content concerns'
                : 'Your report will be reviewed by moderators'
        });
    })
);

// =====================================
// GET /api/report/list
// Get reports (filtered by map bounds)
// =====================================
router.get('/list',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const { minLat, maxLat, minLon, maxLon, type, status, limit = 50 } = req.query;

        let sql = `
      SELECT 
        r.id, r.type, r.description, 
        ST_Y(r.location) as lat, ST_X(r.location) as lon,
        r.verified_status, r.created_at,
        u.name as reporter_name
      FROM user_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;

        // Add bounding box filter
        if (minLat && maxLat && minLon && maxLon) {
            sql += ` AND r.location && ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326)`;
            params.push(parseFloat(minLon), parseFloat(minLat), parseFloat(maxLon), parseFloat(maxLat));
            paramIndex += 4;
        }

        // Add type filter
        if (type) {
            sql += ` AND r.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        // Add status filter (admin only sees all, users see only verified)
        if (status && req.user?.role === 'admin') {
            sql += ` AND r.verified_status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        } else if (!req.user || req.user.role === 'user') {
            sql += ` AND r.verified_status = 'verified'`;
        }

        sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));

        const result = await query(sql, params);

        // Convert to GeoJSON
        const geojson = {
            type: 'FeatureCollection',
            features: result.rows.map(row => ({
                type: 'Feature',
                properties: {
                    id: row.id,
                    type: row.type,
                    description: row.description,
                    status: row.verified_status,
                    createdAt: row.created_at,
                    reporterName: row.reporter_name
                },
                geometry: {
                    type: 'Point',
                    coordinates: [row.lon, row.lat]
                }
            }))
        };

        res.json({
            reports: result.rows,
            geojson,
            count: result.rows.length
        });
    })
);

// =====================================
// GET /api/report/my
// Get user's own reports
// =====================================
router.get('/my',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const result = await query(`
      SELECT 
        id, type, description, 
        ST_Y(location) as lat, ST_X(location) as lon,
        media_urls, verified_status, created_at, updated_at
      FROM user_reports
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

        res.json({
            reports: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    })
);

// =====================================
// GET /api/report/:id
// Get single report details
// =====================================
router.get('/:id',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        r.id, r.type, r.description,
        ST_Y(r.location) as lat, ST_X(r.location) as lon,
        r.media_urls, r.verified_status, r.created_at,
        u.name as reporter_name,
        v.name as verifier_name, r.verified_at
      FROM user_reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users v ON r.verified_by = v.id
      WHERE r.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = result.rows[0];

        // Non-verified reports only visible to owner or admin
        if (report.verified_status !== 'verified') {
            if (!req.user || (req.user.role !== 'admin' && req.user.id !== report.user_id)) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        res.json({ report });
    })
);

// =====================================
// DELETE /api/report/:id
// Delete own report
// =====================================
router.delete('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            `DELETE FROM user_reports WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found or access denied' });
        }

        res.json({ message: 'Report deleted' });
    })
);

// =====================================
// Helper Functions
// =====================================

function checkToxicity(text) {
    if (!text) return 0;

    // Simple placeholder - in production, use a proper NLP service
    const toxicWords = ['hate', 'kill', 'threat', 'attack'];
    const lowercaseText = text.toLowerCase();
    let score = 0;

    for (const word of toxicWords) {
        if (lowercaseText.includes(word)) {
            score += 0.3;
        }
    }

    return Math.min(score, 1);
}

function analyzeSentiment(text) {
    if (!text) return 'neutral';

    // Simple placeholder - in production, use a proper NLP service
    const negativeWords = ['danger', 'unsafe', 'scary', 'dark', 'broken', 'fear'];
    const lowercaseText = text.toLowerCase();
    let negativeCount = 0;

    for (const word of negativeWords) {
        if (lowercaseText.includes(word)) {
            negativeCount++;
        }
    }

    if (negativeCount >= 2) return 'negative';
    if (negativeCount === 1) return 'neutral';
    return 'neutral';
}

function getSeverity(type) {
    const severityMap = {
        'robbery': 5,
        'assault': 5,
        'harassment': 4,
        'theft': 3,
        'vandalism': 2,
        'other': 2
    };
    return severityMap[type] || 2;
}

export default router;
