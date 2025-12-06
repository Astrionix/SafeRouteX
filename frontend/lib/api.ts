import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auth APIs
export const authAPI = {
    signup: (idToken: string, name: string, phone?: string) =>
        api.post('/auth/signup', { idToken, name, phone }),
    login: (idToken: string) =>
        api.post('/auth/login', { idToken }),
    getProfile: () =>
        api.get('/auth/me'),
    updateProfile: (data: { name?: string; phone?: string }) =>
        api.put('/auth/profile', data),
    addEmergencyContact: (data: { name: string; phone: string; relationship?: string }) =>
        api.post('/auth/emergency-contacts', data),
    deleteEmergencyContact: (id: string) =>
        api.delete(`/auth/emergency-contacts/${id}`),
};

// Route APIs
export const routeAPI = {
    getRoutes: (origin: { lat: number; lon: number }, destination: { lat: number; lon: number }) =>
        api.post('/route/get', { origin, destination }),
    getSafestRoute: (origin: { lat: number; lon: number }, destination: { lat: number; lon: number }) =>
        api.post('/route/safest', { origin, destination }),
    getFastestRoute: (origin: { lat: number; lon: number }, destination: { lat: number; lon: number }) =>
        api.post('/route/fastest', { origin, destination }),
    getSafetyScore: (lat: number, lon: number, radius?: number) =>
        api.get('/route/safety-score', { params: { lat, lon, radius } }),
};

// SOS APIs
export const sosAPI = {
    start: (lat: number, lon: number, message?: string) =>
        api.post('/sos/start', { lat, lon, message }),
    updateLocation: (sosId: string, lat: number, lon: number, accuracy?: number) =>
        api.post('/sos/location', { sosId, lat, lon, accuracy }),
    stop: (sosId: string, reason?: string, isFalseAlarm?: boolean) =>
        api.post('/sos/stop', { sosId, reason, isFalseAlarm }),
    getActive: () =>
        api.get('/sos/active'),
    getHistory: (limit?: number, offset?: number) =>
        api.get('/sos/history', { params: { limit, offset } }),
    getTrail: (sosId: string) =>
        api.get(`/sos/${sosId}/trail`),
};

// Report APIs
export const reportAPI = {
    create: (data: { type: string; lat: number; lon: number; description?: string; mediaUrls?: string[] }) =>
        api.post('/report/create', data),
    list: (params: { minLat?: number; maxLat?: number; minLon?: number; maxLon?: number; type?: string }) =>
        api.get('/report/list', { params }),
    getMyReports: (limit?: number, offset?: number) =>
        api.get('/report/my', { params: { limit, offset } }),
    delete: (id: string) =>
        api.delete(`/report/${id}`),
};

// Layers APIs
export const layersAPI = {
    getCCTV: (bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number }) =>
        api.get('/layers/cctv', { params: bounds }),
    getStreetlights: (bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number }) =>
        api.get('/layers/streetlights', { params: bounds }),
    getCrime: (bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number }, months?: number) =>
        api.get('/layers/crime', { params: { ...bounds, months } }),
    getStats: () =>
        api.get('/layers/stats'),
};

export default api;
