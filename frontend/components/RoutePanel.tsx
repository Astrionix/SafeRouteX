'use client';

import { useState } from 'react';
import { useMapStore } from '@/lib/store';
import { routeAPI } from '@/lib/api';
import { getDirections, searchPlace } from '@/lib/mapbox';
import { Search, Navigation, MapPin, Loader2, X, Car, Bike, Footprints, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoutePanel() {
    const [originInput, setOriginInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [vehicle, setVehicle] = useState<'car' | 'bike' | 'foot'>('car');

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
            // Geocode Origin
            let originCoords = parseCoordinates(originInput);
            if (!originCoords) {
                const place = await searchPlace(originInput);
                if (place) {
                    originCoords = { lat: place.lat, lon: place.lon };
                } else {
                    toast.error('Origin not found');
                    setLoading(false);
                    return;
                }
            }

            // Geocode Destination
            let destCoords = parseCoordinates(destInput);
            if (!destCoords) {
                const place = await searchPlace(destInput);
                if (place) {
                    destCoords = { lat: place.lat, lon: place.lon };
                } else {
                    toast.error('Destination not found');
                    setLoading(false);
                    return;
                }
            }

            setOrigin({ ...originCoords, address: originInput });
            setDestination({ ...destCoords, address: destInput });

            // Fetch Routes
            const routes = await getDirections(originCoords, destCoords, vehicle);

            if (routes && routes.length > 0) {
                const fastest = routes[0];
                const safest = routes.length > 1 ? routes[1] : routes[0];

                setRoutes(
                    {
                        geometry: fastest.geometry,
                        distance: fastest.distance / 1000,
                        duration: Math.round(fastest.duration / 60) + ' min',
                        safetyScore: fastest.safetyScore
                    },
                    {
                        geometry: safest.geometry,
                        distance: safest.distance / 1000,
                        duration: Math.round(safest.duration / 60) + ' min',
                        safetyScore: safest.safetyScore
                    }
                );
                toast.success('Routes calculated!');
            } else {
                toast.error('No routes found');
            }

        } catch (error: any) {
            console.error('Route error:', error);
            toast.error('Failed to calculate routes');
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

                {/* Top Row: Settings, Vehicles, Close */}
                <div className="flex items-center justify-between mb-6">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setVehicle('car')}
                            className={`p-2 rounded-full transition-all ${vehicle === 'car'
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            title="Car"
                        >
                            <Car className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setVehicle('bike')}
                            className={`p-2 rounded-full transition-all ${vehicle === 'bike'
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            title="Bike"
                        >
                            <Bike className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setVehicle('foot')}
                            className={`p-2 rounded-full transition-all ${vehicle === 'foot'
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                            title="Walk"
                        >
                            <Footprints className="w-5 h-5" />
                        </button>
                    </div>

                    {(origin || destination) ? (
                        <button onClick={handleClear} className="p-2 text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="w-9" /> /* Spacer to balance layout */
                    )}
                </div>

                {/* Inputs */}
                <div className="space-y-4 mb-6">
                    {/* Origin */}
                    <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-emerald-500 shrink-0" />
                        <input
                            type="text"
                            value={originInput}
                            onChange={(e) => setOriginInput(e.target.value)}
                            placeholder="From"
                            className="flex-1 bg-transparent border-b border-white/20 py-2 px-1 text-white placeholder-gray-500 
                                     focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-rose-500 shrink-0" />
                        <input
                            type="text"
                            value={destInput}
                            onChange={(e) => setDestInput(e.target.value)}
                            placeholder="To"
                            className="flex-1 bg-transparent border-b border-white/20 py-2 px-1 text-white placeholder-gray-500 
                                     focus:outline-none focus:border-rose-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Search Button */}
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2 mb-4 rounded-full"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {loading ? 'Calculating...' : 'Find Routes'}
                </button>

                {/* Route Results */}
                {(fastestRoute || safestRoute) && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="route-toggle mb-3">
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border transition-all ${activeRoute === 'fastest'
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-dark-200/50 border-white/5'
                                }`}>
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold text-amber-400">{fastestRoute?.duration}</span>
                                    <span className="text-xs text-gray-400 mb-1">{fastestRoute?.distance?.toFixed(1)} km</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Usual route</p>
                            </div>
                            <div className={`p-3 rounded-xl border transition-all ${activeRoute === 'safest'
                                ? 'bg-safe-500/10 border-safe-500/50'
                                : 'bg-dark-200/50 border-white/5'
                                }`}>
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold text-safe-400">{safestRoute?.duration}</span>
                                    <span className="text-xs text-gray-400 mb-1">{safestRoute?.distance?.toFixed(1)} km</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Safety: {Math.round((safestRoute?.safetyScore || 0.85) * 100)}%</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
