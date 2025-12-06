'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface SOSEvent {
    sosId: string;
    userName: string;
    location: { lat: number; lon: number };
}

interface Report {
    id: string;
    type: string;
    lat: number;
    lon: number;
}

interface AdminMapProps {
    activeSOS: SOSEvent[];
    selectedSOS: SOSEvent | null;
    reports: Report[];
}

export default function AdminMap({ activeSOS, selectedSOS, reports }: AdminMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [77.5946, 12.9716],
            zoom: 12,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');
    }, []);

    // Update SOS markers
    useEffect(() => {
        if (!map.current) return;

        // Remove old markers
        Object.keys(markers.current).forEach(id => {
            if (!activeSOS.find(s => s.sosId === id)) {
                markers.current[id].remove();
                delete markers.current[id];
            }
        });

        // Add/update SOS markers
        activeSOS.forEach(sos => {
            if (markers.current[sos.sosId]) {
                markers.current[sos.sosId].setLngLat([sos.location.lon, sos.location.lat]);
            } else {
                const el = document.createElement('div');
                el.className = 'sos-marker';
                el.innerHTML = `
          <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-ping absolute"></div>
          <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center relative z-10 text-white font-bold text-xs">SOS</div>
        `;
                el.style.cssText = 'position: relative; cursor: pointer;';

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([sos.location.lon, sos.location.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2 text-black">
              <strong>${sos.userName}</strong><br/>
              <small>SOS Active</small>
            </div>
          `))
                    .addTo(map.current!);

                markers.current[sos.sosId] = marker;
            }
        });
    }, [activeSOS]);

    // Fly to selected SOS
    useEffect(() => {
        if (selectedSOS && map.current) {
            map.current.flyTo({
                center: [selectedSOS.location.lon, selectedSOS.location.lat],
                zoom: 16,
                duration: 1000
            });
            markers.current[selectedSOS.sosId]?.togglePopup();
        }
    }, [selectedSOS]);

    // Add report markers
    useEffect(() => {
        if (!map.current) return;

        reports.forEach(report => {
            const markerId = `report-${report.id}`;
            if (!markers.current[markerId]) {
                const el = document.createElement('div');
                el.innerHTML = '📍';
                el.style.cssText = 'font-size: 24px; cursor: pointer;';

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([report.lon, report.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2 text-black">
              <strong>${report.type.replace('_', ' ')}</strong>
            </div>
          `))
                    .addTo(map.current!);

                markers.current[markerId] = marker;
            }
        });
    }, [reports]);

    return <div ref={mapContainer} className="w-full h-full" />;
}
