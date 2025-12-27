export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYmhhdnlhc2hyZWUiLCJhIjoiY21pbmhoNTB5MjQ0NTNjc2ZuaHdxODM1NSJ9.ptIOX5lHj4CXXxGKK1WB4g';
export const GRAPHHOPPER_KEY = process.env.NEXT_PUBLIC_GRAPHHOPPER_KEY || '3665edf8-a2ad-42db-853e-74aa6f8243d1';

type Vehicle = 'car' | 'bike' | 'foot';

import { routeAPI } from './api';

export const getDirections = async (
    start: { lat: number; lon: number },
    end: { lat: number; lon: number },
    vehicle: Vehicle = 'car'
) => {
    try {
        console.log('Fetching routes from Backend (GraphHopper)...');
        // Calls the backend which now integrates GraphHopper
        const response = await routeAPI.getRoutes(start, end);

        if (!response.data || !response.data.routes) {
            console.error('Invalid route response from backend');
            return [];
        }

        const { fastest, safest } = response.data.routes;
        const routes = [];

        // Helper to parse backend format to Frontend Mapbox format
        const parseRoute = (routeData: any) => {
            if (!routeData) return null;

            // Distance: Backend KM -> Frontend Meters
            const dist = typeof routeData.distance === 'number' ? routeData.distance * 1000 : 0;

            // Duration: Backend "15 min" -> Frontend Seconds
            let dur = 0;
            if (typeof routeData.duration === 'string') {
                const match = routeData.duration.match(/(\d+)/);
                dur = match ? parseInt(match[1]) * 60 : 0;
            } else {
                dur = routeData.duration * 60; // Assume number is minutes
            }

            return {
                geometry: routeData.geometry,
                distance: dist,
                duration: dur,
                safetyScore: routeData.safetyScore
            };
        };

        if (fastest) routes.push(parseRoute(fastest));
        if (safest) routes.push(parseRoute(safest));

        return routes.filter(r => r !== null);
    } catch (error) {
        console.error('Error fetching routes from backend:', error);
        return [];
    }
};


export const searchPlace = async (query: string) => {
    try {
        const response = await fetch(
            `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&locale=en&limit=1&key=${GRAPHHOPPER_KEY}`
        );
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
            const hit = data.hits[0];
            return {
                name: hit.name + (hit.city ? `, ${hit.city}` : '') + (hit.country ? `, ${hit.country}` : ''),
                lat: hit.point.lat,
                lon: hit.point.lng,
            };
        }
        return null;
    } catch (error) {
        console.error('Error searching place (GH):', error);
        return null;
    }
};

export const getSuggestions = async (query: string) => {
    try {
        const response = await fetch(
            `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&locale=en&limit=5&key=${GRAPHHOPPER_KEY}`
        );
        const data = await response.json();

        if (data.hits) {
            return data.hits.map((hit: any) => ({
                name: formatAddress(hit),
                lat: hit.point.lat,
                lon: hit.point.lng,
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching suggestions (GH):', error);
        return [];
    }
};

const formatAddress = (hit: any) => {
    const parts = [hit.name];
    if (hit.street && hit.street !== hit.name) parts.push(hit.street);
    if (hit.city) parts.push(hit.city);
    if (hit.state) parts.push(hit.state);
    if (hit.country) parts.push(hit.country);
    return parts.join(', ');
};
