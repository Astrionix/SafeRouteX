import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { verifyIdToken, setCustomClaims } from '../config/firebase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// =====================================
// POST /api/auth/signup
// Register a new user
// =====================================
router.post('/signup',
    [
        body('idToken').notEmpty().withMessage('Firebase ID token is required'),
        body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('phone').optional().isMobilePhone()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { idToken, name, phone } = req.body;

        // Verify Firebase token
        const decodedToken = await verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE firebase_uid = $1',
            [uid]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'User already exists'
            });
        }

        // Create user in database
        const result = await query(
            `INSERT INTO users (firebase_uid, email, name, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, email, name, phone, role, created_at`,
            [uid, email, name, phone]
        );

        const user = result.rows[0];

        // Set custom claims for role
        await setCustomClaims(uid, { role: 'user' });

        res.status(201).json({
            message: 'User created successfully',
            user
        });
    })
);

// =====================================
// POST /api/auth/login
// Login and sync user data
// =====================================
router.post('/login',
    [
        body('idToken').notEmpty().withMessage('Firebase ID token is required')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { idToken } = req.body;

        // Verify Firebase token
        const decodedToken = await verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        // Get user from database
        const result = await query(
            `SELECT id, firebase_uid, email, name, phone, role, avatar_url, created_at
       FROM users WHERE firebase_uid = $1`,
            [uid]
        );

        if (result.rows.length === 0) {
            // User exists in Firebase but not in our DB - auto-create
            const newUser = await query(
                `INSERT INTO users (firebase_uid, email, name, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id, firebase_uid, email, name, phone, role, avatar_url, created_at`,
                [uid, email, email.split('@')[0]]
            );

            return res.json({
                message: 'User synced successfully',
                user: newUser.rows[0],
                isNewUser: true
            });
        }

        res.json({
            message: 'Login successful',
            user: result.rows[0],
            isNewUser: false
        });
    })
);

// =====================================
// GET /api/auth/me
// Get current user profile
// =====================================
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT u.id, u.firebase_uid, u.email, u.name, u.phone, u.role, u.avatar_url, u.created_at,
            json_agg(json_build_object('id', ec.id, 'name', ec.name, 'phone', ec.phone, 'relationship', ec.relationship)) 
              FILTER (WHERE ec.id IS NOT NULL) as emergency_contacts
     FROM users u
     LEFT JOIN emergency_contacts ec ON u.id = ec.user_id
     WHERE u.id = $1
     GROUP BY u.id`,
        [req.user.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
}));

// =====================================
// PUT /api/auth/profile
// Update user profile
// =====================================
router.put('/profile',
    authenticateToken,
    [
        body('name').optional().isLength({ min: 2 }),
        body('phone').optional().isMobilePhone()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, phone, avatar_url } = req.body;

        const result = await query(
            `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, phone, role, avatar_url`,
            [name, phone, avatar_url, req.user.id]
        );

        res.json({
            message: 'Profile updated',
            user: result.rows[0]
        });
    })
);

// =====================================
// POST /api/auth/emergency-contacts
// Add emergency contact
// =====================================
router.post('/emergency-contacts',
    authenticateToken,
    [
        body('name').notEmpty(),
        body('phone').isMobilePhone(),
        body('relationship').optional()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, phone, relationship } = req.body;

        const result = await query(
            `INSERT INTO emergency_contacts (user_id, name, phone, relationship)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, relationship`,
            [req.user.id, name, phone, relationship]
        );

        res.status(201).json({
            message: 'Emergency contact added',
            contact: result.rows[0]
        });
    })
);

// =====================================
// DELETE /api/auth/emergency-contacts/:id
// Remove emergency contact
// =====================================
router.delete('/emergency-contacts/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await query(
            `DELETE FROM emergency_contacts 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ message: 'Contact removed' });
    })
);

export default router;
