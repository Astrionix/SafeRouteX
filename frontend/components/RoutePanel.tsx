'use client';

import { useState } from 'react';
import { useMapStore } from '@/lib/store';
import { routeAPI } from '@/lib/api';
import { Search, Navigation, MapPin, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoutePanel() {
    const [originInput, setOriginInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        origin, destination, setOrigin, setDestination,
        fastestRoute, safestRoute, setRoutes,
        activeRoute, setActiveRoute, clearRoutes
    } = useMapStore();

    const handleSearch = async () => {
        if (!originInput || !destInput) {
            toast.error('Please enter both origin and destination');
            return;
        }

        setLoading(true);
        try {
            // For demo: parse coordinates or use geocoding
            const originCoords = parseCoordinates(originInput) || { lat: 12.9716, lon: 77.5946 };
            const destCoords = parseCoordinates(destInput) || { lat: 12.9352, lon: 77.6245 };

            setOrigin({ ...originCoords, address: originInput });
            setDestination({ ...destCoords, address: destInput });

            const response = await routeAPI.getRoutes(originCoords, destCoords);
            setRoutes(response.data.routes.fastest, response.data.routes.safest);

            toast.success('Routes calculated!');
        } catch (error: any) {
            console.error('Route error:', error);
            // Demo fallback
            setRoutes(
                { geometry: { type: 'LineString', coordinates: [[77.5946, 12.9716], [77.6245, 12.9352]] }, distance: 5.2, duration: '15 min', safetyScore: 0.6 },
                { geometry: { type: 'LineString', coordinates: [[77.5946, 12.9716], [77.58, 12.95], [77.6245, 12.9352]] }, distance: 6.1, duration: '18 min', safetyScore: 0.85 }
            );
            toast.success('Routes calculated (demo mode)');
        } finally {
            setLoading(false);
        }
    };

    const parseCoordinates = (input: string): { lat: number; lon: number } | null => {
        const match = input.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
        if (match) {
            return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
        }
        return null;
    };

    const handleClear = () => {
        clearRoutes();
        setOriginInput('');
        setDestInput('');
    };

    return (
        <div className="absolute top-4 left-4 z-10 w-96 max-w-[calc(100vw-2rem)]">
            <div className="glass rounded-2xl p-4 shadow-glass">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-primary-400" />
                        Plan Your Route
                    </h2>
                    {(origin || destination) && (
                        <button onClick={handleClear} className="text-gray-400 hover:text-white p-1">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Origin Input */}
                <div className="relative mb-3">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-safe-400" />
                    <input
                        type="text"
                        value={originInput}
                        onChange={(e) => setOriginInput(e.target.value)}
                        placeholder="Origin (e.g., 12.9716, 77.5946)"
                        className="input-field pl-10"
                    />
                </div>

                {/* Destination Input */}
                <div className="relative mb-4">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-danger-400" />
                    <input
                        type="text"
                        value={destInput}
                        onChange={(e) => setDestInput(e.target.value)}
                        placeholder="Destination (e.g., 12.9352, 77.6245)"
                        className="input-field pl-10"
                    />
                </div>

                {/* Search Button */}
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {loading ? 'Calculating...' : 'Find Routes'}
                </button>

                {/* Route Results */}
                {(fastestRoute || safestRoute) && (
                    <div className="mt-4 space-y-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Select Route</p>

                        {/* Route Toggle */}
                        <div className="route-toggle">
                            <div
                                className={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] bg-gradient-to-r rounded-lg transition-all duration-200 ${activeRoute === 'fastest'
                                        ? 'left-1 from-amber-500 to-amber-600'
                                        : 'left-[calc(50%+2px)] from-safe-500 to-safe-600'
                                    }`}
                            />
                            <button
                                onClick={() => setActiveRoute('fastest')}
                                className={`route-toggle-option flex-1 ${activeRoute === 'fastest' ? 'active' : ''}`}
                            >
                                ⚡ Fastest
                            </button>
                            <button
                                onClick={() => setActiveRoute('safest')}
                                className={`route-toggle-option flex-1 ${activeRoute === 'safest' ? 'active' : ''}`}
                            >
                                🛡️ Safest
                            </button>
                        </div>

                        {/* Route Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border transition-all ${activeRoute === 'fastest'
                                    ? 'bg-amber-500/10 border-amber-500/50'
                                    : 'bg-dark-200/50 border-white/5'
                                }`}>
                                <p className="text-xs text-gray-400">Fastest</p>
                                <p className="text-lg font-bold text-amber-400">{fastestRoute?.duration || '15 min'}</p>
                                <p className="text-xs text-gray-500">{fastestRoute?.distance?.toFixed(1) || '5.2'} km</p>
                            </div>
                            <div className={`p-3 rounded-xl border transition-all ${activeRoute === 'safest'
                                    ? 'bg-safe-500/10 border-safe-500/50'
                                    : 'bg-dark-200/50 border-white/5'
                                }`}>
                                <p className="text-xs text-gray-400">Safest</p>
                                <p className="text-lg font-bold text-safe-400">{safestRoute?.duration || '18 min'}</p>
                                <p className="text-xs text-gray-500">Safety: {Math.round((safestRoute?.safetyScore || 0.85) * 100)}%</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
