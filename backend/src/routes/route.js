import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { calculateSafestRoute, calculateFastestRoute } from '../services/routingEngine.js';

const router = express.Router();

// =====================================
// POST /api/route/get
// Get both fastest and safest routes
// =====================================
router.post('/get',
    optionalAuth,
    [
        body('origin').isObject().withMessage('Origin must be an object with lat and lon'),
        body('origin.lat').isFloat({ min: -90, max: 90 }),
        body('origin.lon').isFloat({ min: -180, max: 180 }),
        body('destination').isObject().withMessage('Destination must be an object with lat and lon'),
        body('destination.lat').isFloat({ min: -90, max: 90 }),
        body('destination.lon').isFloat({ min: -180, max: 180 }),
        body('time').optional().isISO8601()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination, time } = req.body;
        const routeTime = time ? new Date(time) : new Date();

        // Calculate both routes in parallel
        const [fastestRoute, safestRoute] = await Promise.all([
            calculateFastestRoute(origin, destination),
            calculateSafestRoute(origin, destination, routeTime)
        ]);

        // Get safety statistics along both routes
        const fastestStats = await getRouteStats(fastestRoute.geometry);
        const safestStats = await getRouteStats(safestRoute.geometry);

        res.json({
            routes: {
                fastest: {
                    ...fastestRoute,
                    stats: fastestStats,
                    type: 'fastest'
                },
                safest: {
                    ...safestRoute,
                    stats: safestStats,
                    type: 'safest'
                }
            },
            origin,
            destination,
            calculatedAt: new Date().toISOString()
        });
    })
);

// =====================================
// POST /api/route/safest
// Get only the safest route
// =====================================
router.post('/safest',
    optionalAuth,
    [
        body('origin.lat').isFloat({ min: -90, max: 90 }),
        body('origin.lon').isFloat({ min: -180, max: 180 }),
        body('destination.lat').isFloat({ min: -90, max: 90 }),
        body('destination.lon').isFloat({ min: -180, max: 180 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination, time } = req.body;
        const routeTime = time ? new Date(time) : new Date();

        const route = await calculateSafestRoute(origin, destination, routeTime);
        const stats = await getRouteStats(route.geometry);

        res.json({
            route: {
                ...route,
                stats,
                type: 'safest'
            }
        });
    })
);

// =====================================
// POST /api/route/fastest
// Get only the fastest route
// =====================================
router.post('/fastest',
    optionalAuth,
    [
        body('origin.lat').isFloat({ min: -90, max: 90 }),
        body('origin.lon').isFloat({ min: -180, max: 180 }),
        body('destination.lat').isFloat({ min: -90, max: 90 }),
        body('destination.lon').isFloat({ min: -180, max: 180 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination } = req.body;

        const route = await calculateFastestRoute(origin, destination);
        const stats = await getRouteStats(route.geometry);

        res.json({
            route: {
                ...route,
                stats,
                type: 'fastest'
            }
        });
    })
);

// =====================================
// GET /api/route/safety-score
// Get safety score for a specific location
// =====================================
router.get('/safety-score',
    [
        // Query params validation would go here
    ],
    asyncHandler(async (req, res) => {
        const { lat, lon, radius = 100 } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'lat and lon are required' });
        }

        const point = `ST_SetSRID(ST_MakePoint(${parseFloat(lon)}, ${parseFloat(lat)}), 4326)`;

        const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM cctv WHERE status = 'operational' 
         AND ST_DWithin(location::geography, ${point}::geography, $1)) as cctv_count,
        (SELECT COUNT(*) FROM streetlights WHERE status = 'operational' 
         AND ST_DWithin(location::geography, ${point}::geography, $1)) as light_count,
        (SELECT COUNT(*) FROM crime_incidents 
         WHERE occurred_at > NOW() - INTERVAL '1 year'
         AND ST_DWithin(location::geography, ${point}::geography, $1)) as crime_count,
        (SELECT AVG(safety_score) FROM roads 
         WHERE ST_DWithin(geometry::geography, ${point}::geography, $1)) as avg_safety
    `, [parseFloat(radius)]);

        const data = result.rows[0];

        // Calculate overall safety score (0-100)
        const normalizedCctv = Math.min(data.cctv_count / 5, 1) * 30;
        const normalizedLights = Math.min(data.light_count / 10, 1) * 30;
        const crimePenalty = Math.min(data.crime_count / 5, 1) * 40;
        const safetyScore = Math.max(0, normalizedCctv + normalizedLights - crimePenalty + 40);

        res.json({
            location: { lat: parseFloat(lat), lon: parseFloat(lon) },
            radius: parseFloat(radius),
            metrics: {
                cctvCount: parseInt(data.cctv_count),
                streetlightCount: parseInt(data.light_count),
                crimeCount: parseInt(data.crime_count),
                avgRoadSafety: data.avg_safety ? parseFloat(data.avg_safety).toFixed(2) : null
            },
            safetyScore: Math.round(safetyScore),
            safetyLevel: getSafetyLevel(safetyScore)
        });
    })
);

// Helper function to get safety level text
function getSafetyLevel(score) {
    if (score >= 80) return 'Very Safe';
    if (score >= 60) return 'Safe';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Caution Advised';
    return 'High Risk';
}

// Helper function to get route statistics
async function getRouteStats(geometry) {
    if (!geometry || !geometry.coordinates) {
        return {
            totalCctv: 0,
            totalStreetlights: 0,
            crimeIncidents: 0,
            avgSafetyScore: 0.5
        };
    }

    try {
        // Create a buffer around the route line
        const lineString = `ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'), 4326)`;

        const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM cctv 
         WHERE status = 'operational' 
         AND ST_DWithin(location::geography, (${lineString})::geography, 100)) as cctv_count,
        (SELECT COUNT(*) FROM streetlights 
         WHERE status = 'operational' 
         AND ST_DWithin(location::geography, (${lineString})::geography, 100)) as light_count,
        (SELECT COUNT(*) FROM crime_incidents 
         WHERE occurred_at > NOW() - INTERVAL '1 year'
         AND ST_DWithin(location::geography, (${lineString})::geography, 100)) as crime_count
    `);

        const data = result.rows[0];

        return {
            totalCctv: parseInt(data.cctv_count) || 0,
            totalStreetlights: parseInt(data.light_count) || 0,
            crimeIncidents: parseInt(data.crime_count) || 0,
            avgSafetyScore: 0.7 // Placeholder - would be calculated from road segments
        };
    } catch (error) {
        console.error('Error getting route stats:', error);
        return {
            totalCctv: 0,
            totalStreetlights: 0,
            crimeIncidents: 0,
            avgSafetyScore: 0.5
        };
    }
}

export default router;
