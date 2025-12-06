import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/layers/cctv
router.get('/cctv', optionalAuth, asyncHandler(async (req, res) => {
    const { minLat, maxLat, minLon, maxLon, status } = req.query;
    let sql = `SELECT id, ST_Y(location) as lat, ST_X(location) as lon, status, coverage_radius, owner FROM cctv WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (minLat && maxLat && minLon && maxLon) {
        sql += ` AND location && ST_MakeEnvelope($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 4326)`;
        params.push(parseFloat(minLon), parseFloat(minLat), parseFloat(maxLon), parseFloat(maxLat));
        idx += 4;
    }
    if (status) { sql += ` AND status = $${idx}`; params.push(status); }
    sql += ' LIMIT 500';

    const result = await query(sql, params);
    const geojson = {
        type: 'FeatureCollection',
        features: result.rows.map(r => ({
            type: 'Feature',
            properties: { id: r.id, status: r.status, coverageRadius: r.coverage_radius },
            geometry: { type: 'Point', coordinates: [r.lon, r.lat] }
        }))
    };
    res.json({ type: 'cctv', count: result.rows.length, geojson, data: result.rows });
}));

// GET /api/layers/streetlights
router.get('/streetlights', optionalAuth, asyncHandler(async (req, res) => {
    const { minLat, maxLat, minLon, maxLon, status } = req.query;
    let sql = `SELECT id, ST_Y(location) as lat, ST_X(location) as lon, status, wattage FROM streetlights WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (minLat && maxLat && minLon && maxLon) {
        sql += ` AND location && ST_MakeEnvelope($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 4326)`;
        params.push(parseFloat(minLon), parseFloat(minLat), parseFloat(maxLon), parseFloat(maxLat));
        idx += 4;
    }
    if (status) { sql += ` AND status = $${idx}`; params.push(status); }
    sql += ' LIMIT 1000';

    const result = await query(sql, params);
    const geojson = {
        type: 'FeatureCollection',
        features: result.rows.map(r => ({
            type: 'Feature',
            properties: { id: r.id, status: r.status, wattage: r.wattage },
            geometry: { type: 'Point', coordinates: [r.lon, r.lat] }
        }))
    };
    res.json({ type: 'streetlights', count: result.rows.length, geojson, data: result.rows });
}));

// GET /api/layers/crime
router.get('/crime', optionalAuth, asyncHandler(async (req, res) => {
    const { minLat, maxLat, minLon, maxLon, type, months = 12 } = req.query;
    let sql = `SELECT id, ST_Y(location) as lat, ST_X(location) as lon, type, severity, occurred_at FROM crime_incidents WHERE occurred_at > NOW() - INTERVAL '${parseInt(months)} months' AND verified = true`;
    const params = [];
    let idx = 1;

    if (minLat && maxLat && minLon && maxLon) {
        sql += ` AND location && ST_MakeEnvelope($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 4326)`;
        params.push(parseFloat(minLon), parseFloat(minLat), parseFloat(maxLon), parseFloat(maxLat));
        idx += 4;
    }
    if (type) { sql += ` AND type = $${idx}`; params.push(type); }
    sql += ' LIMIT 1000';

    const result = await query(sql, params);
    const geojson = {
        type: 'FeatureCollection',
        features: result.rows.map(r => ({
            type: 'Feature',
            properties: { id: r.id, type: r.type, severity: r.severity, weight: r.severity / 5 },
            geometry: { type: 'Point', coordinates: [r.lon, r.lat] }
        }))
    };
    res.json({ type: 'crime', count: result.rows.length, geojson, heatmapData: result.rows.map(r => ({ lat: r.lat, lon: r.lon, weight: r.severity / 5 })) });
}));

// GET /api/layers/stats
router.get('/stats', optionalAuth, asyncHandler(async (req, res) => {
    const result = await query(`
    SELECT 
      (SELECT COUNT(*) FROM cctv WHERE status = 'operational') as active_cctv,
      (SELECT COUNT(*) FROM streetlights WHERE status = 'operational') as active_lights,
      (SELECT COUNT(*) FROM streetlights WHERE status != 'operational') as broken_lights,
      (SELECT COUNT(*) FROM crime_incidents WHERE occurred_at > NOW() - INTERVAL '30 days') as crimes_30d,
      (SELECT COUNT(*) FROM user_reports WHERE verified_status = 'pending') as pending_reports,
      (SELECT COUNT(*) FROM sos_events WHERE status = 'active') as active_sos
  `);
    res.json({ stats: result.rows[0], generatedAt: new Date().toISOString() });
}));

export default router;
