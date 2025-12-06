'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/lib/store';
import { layersAPI } from '@/lib/api';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewProps {
    onMapClick?: (lat: number, lon: number) => void;
    interactive?: boolean;
}

export default function MapView({ onMapClick, interactive = true }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const {
        origin, destination, fastestRoute, safestRoute, activeRoute,
        showHeatmap, showCCTV, showStreetlights, setOrigin, setDestination
    } = useMapStore();

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [
                parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LON || '-122.4194'),
                parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || '37.7749')
            ],
            zoom: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_ZOOM || '13'),
            attributionControl: false,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }), 'bottom-right');

        map.current.on('load', () => {
            setMapLoaded(true);
            initializeLayers();
        });

        if (interactive) {
            map.current.on('click', (e) => {
                onMapClick?.(e.lngLat.lat, e.lngLat.lng);
            });
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    const initializeLayers = useCallback(() => {
        if (!map.current) return;

        // Crime heatmap layer
        map.current.addSource('crime-heat', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
            id: 'crime-heatmap',
            type: 'heatmap',
            source: 'crime-heat',
            paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': 1,
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, 'rgba(103,169,207,0.5)',
                    0.4, 'rgba(209,229,240,0.6)',
                    0.6, 'rgba(253,219,199,0.7)',
                    0.8, 'rgba(239,138,98,0.8)',
                    1, 'rgba(178,24,43,0.9)'
                ],
                'heatmap-radius': 30,
                'heatmap-opacity': 0.7
            }
        });

        // CCTV layer
        map.current.addSource('cctv', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
            id: 'cctv-points',
            type: 'circle',
            source: 'cctv',
            paint: {
                'circle-radius': 6,
                'circle-color': ['case', ['==', ['get', 'status'], 'operational'], '#22c55e', '#ef4444'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Streetlights layer
        map.current.addSource('streetlights', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
            id: 'streetlight-points',
            type: 'circle',
            source: 'streetlights',
            paint: {
                'circle-radius': 4,
                'circle-color': ['case', ['==', ['get', 'status'], 'operational'], '#fbbf24', '#6b7280'],
                'circle-opacity': 0.8
            }
        });

        // Route layers
        map.current.addSource('fastest-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
        });

        map.current.addLayer({
            id: 'fastest-route-line',
            type: 'line',
            source: 'fastest-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#f59e0b',
                'line-width': 5,
                'line-opacity': 0.8
            }
        });

        map.current.addSource('safest-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
        });

        map.current.addLayer({
            id: 'safest-route-line',
            type: 'line',
            source: 'safest-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#22c55e',
                'line-width': 6,
                'line-opacity': 0.9
            }
        });
    }, []);

    // Load crime data
    useEffect(() => {
        if (!mapLoaded || !map.current) return;

        const loadCrimeData = async () => {
            try {
                const response = await layersAPI.getCrime();
                const source = map.current?.getSource('crime-heat') as mapboxgl.GeoJSONSource;
                if (source) {
                    source.setData(response.data.geojson);
                }
            } catch (error) {
                console.error('Error loading crime data:', error);
            }
        };

        loadCrimeData();
    }, [mapLoaded]);

    // Toggle heatmap visibility
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        map.current.setLayoutProperty('crime-heatmap', 'visibility', showHeatmap ? 'visible' : 'none');
    }, [showHeatmap, mapLoaded]);

    // Toggle CCTV visibility and load data
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        map.current.setLayoutProperty('cctv-points', 'visibility', showCCTV ? 'visible' : 'none');

        if (showCCTV) {
            layersAPI.getCCTV().then(res => {
                const source = map.current?.getSource('cctv') as mapboxgl.GeoJSONSource;
                if (source) source.setData(res.data.geojson);
            });
        }
    }, [showCCTV, mapLoaded]);

    // Toggle streetlights
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        map.current.setLayoutProperty('streetlight-points', 'visibility', showStreetlights ? 'visible' : 'none');

        if (showStreetlights) {
            layersAPI.getStreetlights().then(res => {
                const source = map.current?.getSource('streetlights') as mapboxgl.GeoJSONSource;
                if (source) source.setData(res.data.geojson);
            });
        }
    }, [showStreetlights, mapLoaded]);

    // Update routes on map
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (fastestRoute?.geometry) {
            const source = map.current.getSource('fastest-route') as mapboxgl.GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'Feature',
                    geometry: fastestRoute.geometry,
                    properties: {}
                });
            }
        }

        if (safestRoute?.geometry) {
            const source = map.current.getSource('safest-route') as mapboxgl.GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'Feature',
                    geometry: safestRoute.geometry,
                    properties: {}
                });
            }
        }

        // Fit bounds to show routes
        if (origin && destination) {
            map.current.fitBounds([
                [Math.min(origin.lon, destination.lon) - 0.01, Math.min(origin.lat, destination.lat) - 0.01],
                [Math.max(origin.lon, destination.lon) + 0.01, Math.max(origin.lat, destination.lat) + 0.01]
            ], { padding: 100 });
        }
    }, [fastestRoute, safestRoute, origin, destination, mapLoaded]);

    // Highlight active route
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        map.current.setPaintProperty('fastest-route-line', 'line-opacity', activeRoute === 'fastest' ? 0.9 : 0.4);
        map.current.setPaintProperty('safest-route-line', 'line-opacity', activeRoute === 'safest' ? 0.9 : 0.4);
        map.current.setPaintProperty('fastest-route-line', 'line-width', activeRoute === 'fastest' ? 6 : 4);
        map.current.setPaintProperty('safest-route-line', 'line-width', activeRoute === 'safest' ? 6 : 4);
    }, [activeRoute, mapLoaded]);

    return (
        <div ref={mapContainer} className="w-full h-full" />
    );
}
