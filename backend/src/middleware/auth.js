import { verifyIdToken } from '../config/firebase.js';
import { query } from '../config/database.js';

// Authenticate user via Firebase token
export async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Development mode bypass for testing
        if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
            req.user = {
                uid: 'dev-user-001',
                email: 'dev@saferoutex.com',
                role: 'admin',
                id: 'dev-user-001'
            };
            return next();
        }

        // Verify Firebase token
        const decodedToken = await verifyIdToken(token);

        // Get user from database
        const result = await query(
            'SELECT id, firebase_uid, email, name, phone, role FROM users WHERE firebase_uid = $1',
            [decodedToken.uid]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found in database'
            });
        }

        req.user = {
            ...result.rows[0],
            firebaseToken: decodedToken
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
}

// Check if user has required role
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
}

// Optional authentication (for public routes that can have auth)
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await verifyIdToken(token);

        const result = await query(
            'SELECT id, firebase_uid, email, name, phone, role FROM users WHERE firebase_uid = $1',
            [decodedToken.uid]
        );

        if (result.rows.length > 0) {
            req.user = result.rows[0];
        }

        next();
    } catch (error) {
        // Token invalid, but continue without auth
        next();
    }
}
