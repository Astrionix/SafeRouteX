import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let firebaseApp;

try {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized');
    } else {
        console.warn('⚠️ Firebase credentials not configured - auth will be disabled');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
}

// Verify Firebase ID token
export async function verifyIdToken(idToken) {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return admin.auth().verifyIdToken(idToken);
}

// Get user by UID
export async function getUser(uid) {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return admin.auth().getUser(uid);
}

// Set custom claims (for roles)
export async function setCustomClaims(uid, claims) {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return admin.auth().setCustomUserClaims(uid, claims);
}

export { admin, firebaseApp };
