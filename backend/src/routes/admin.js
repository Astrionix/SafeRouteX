import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin/police role
router.use(authenticateToken);
router.use(requireRole('admin', 'police'));

// GET /api/admin/sos/active - Get all active SOS events
router.get('/sos/active', asyncHandler(async (req, res) => {
    const result = await query(`
    SELECT se.id, se.user_id, se.started_at, se.status, u.name, u.phone, u.email,
      ST_Y(st.location) as lat, ST_X(st.location) as lon, st.timestamp as last_update
    FROM sos_events se
    JOIN users u ON se.user_id = u.id
    LEFT JOIN LATERAL (SELECT * FROM sos_tracking WHERE sos_id = se.id ORDER BY timestamp DESC LIMIT 1) st ON true
    WHERE se.status = 'active'
    ORDER BY se.started_at DESC
  `);
    res.json({ activeSOS: result.rows, count: result.rows.length });
}));

// GET /api/admin/sos/:id - Get SOS details with trail
router.get('/sos/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sosResult = await query(`
    SELECT se.*, u.name, u.phone, u.email FROM sos_events se
    JOIN users u ON se.user_id = u.id WHERE se.id = $1
  `, [id]);
    if (sosResult.rows.length === 0) return res.status(404).json({ error: 'SOS not found' });

    const trailResult = await query(`
    SELECT ST_Y(location) as lat, ST_X(location) as lon, accuracy, speed, timestamp
    FROM sos_tracking WHERE sos_id = $1 ORDER BY timestamp ASC
  `, [id]);

    res.json({ sos: sosResult.rows[0], trail: trailResult.rows });
}));

// POST /api/admin/sos/:id/resolve - Resolve an SOS
router.post('/sos/:id/resolve', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes, status = 'resolved' } = req.body;
    const result = await query(`
    UPDATE sos_events SET status = $1, ended_at = NOW(), resolution_notes = $2, responded_by = $3
    WHERE id = $4 AND status = 'active' RETURNING *
  `, [status, notes, req.user.id, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'SOS not found or already resolved' });

    const io = req.app.get('io');
    io.to('admin-room').emit('sos:resolved', { sosId: id, resolvedBy: req.user.name });
    res.json({ message: 'SOS resolved', sos: result.rows[0] });
}));

// GET /api/admin/reports/unverified
router.get('/reports/unverified', asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const result = await query(`
    SELECT r.*, ST_Y(r.location) as lat, ST_X(r.location) as lon, u.name as reporter_name
    FROM user_reports r LEFT JOIN users u ON r.user_id = u.id
    WHERE r.verified_status = 'pending'
    ORDER BY r.created_at DESC LIMIT $1
  `, [parseInt(limit)]);
    res.json({ reports: result.rows, count: result.rows.length });
}));

// POST /api/admin/report/verify
router.post('/report/verify', [
    body('reportId').isUUID(),
    body('status').isIn(['verified', 'rejected', 'investigating'])
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { reportId, status, notes } = req.body;
    const result = await query(`
    UPDATE user_reports SET verified_status = $1, verified_by = $2, verified_at = NOW()
    WHERE id = $3 RETURNING *
  `, [status, req.user.id, reportId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    if (status === 'verified') {
        const report = result.rows[0];
        await query(`
      UPDATE crime_incidents SET verified = true 
      WHERE source = 'user_report' AND ST_DWithin(location, $1, 10)
    `, [report.location]);
    }
    res.json({ message: 'Report updated', report: result.rows[0] });
}));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(async (req, res) => {
    const [crimeStats, sosStats, reportStats] = await Promise.all([
        query(`SELECT type, COUNT(*) as count FROM crime_incidents WHERE occurred_at > NOW() - INTERVAL '30 days' GROUP BY type`),
        query(`SELECT status, COUNT(*) as count FROM sos_events WHERE started_at > NOW() - INTERVAL '30 days' GROUP BY status`),
        query(`SELECT type, verified_status, COUNT(*) as count FROM user_reports WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY type, verified_status`)
    ]);
    res.json({
        crimeByType: crimeStats.rows,
        sosByStatus: sosStats.rows,
        reportsByType: reportStats.rows,
        period: '30 days'
    });
}));

// POST /api/admin/streetlight/:id/update
router.post('/streetlight/:id/update', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await query(`UPDATE streetlights SET status = $1, last_maintenance = NOW() WHERE id = $2 RETURNING *`, [status, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Streetlight not found' });
    res.json({ message: 'Streetlight updated', streetlight: result.rows[0] });
}));

// POST /api/admin/cctv/:id/update
router.post('/cctv/:id/update', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await query(`UPDATE cctv SET status = $1, last_check = NOW() WHERE id = $2 RETURNING *`, [status, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'CCTV not found' });
    res.json({ message: 'CCTV updated', cctv: result.rows[0] });
}));

export default router;
