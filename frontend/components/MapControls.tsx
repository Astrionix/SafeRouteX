'use client';

import { useMapStore } from '@/lib/store';
import { Flame, Camera, Lightbulb, Layers } from 'lucide-react';

export default function MapControls() {
    const { showHeatmap, showCCTV, showStreetlights, toggleHeatmap, toggleCCTV, toggleStreetlights } = useMapStore();

    return (
        <div className="absolute top-4 right-4 z-10">
            <div className="glass rounded-xl p-2 shadow-glass">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={toggleHeatmap}
                        className={`p-3 rounded-lg transition-all duration-200 group ${showHeatmap ? 'bg-danger-500/20 text-danger-400' : 'text-gray-400 hover:text-white'
                            }`}
                        title="Crime Heatmap"
                    >
                        <Flame className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleCCTV}
                        className={`p-3 rounded-lg transition-all duration-200 ${showCCTV ? 'bg-safe-500/20 text-safe-400' : 'text-gray-400 hover:text-white'
                            }`}
                        title="CCTV Cameras"
                    >
                        <Camera className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleStreetlights}
                        className={`p-3 rounded-lg transition-all duration-200 ${showStreetlights ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white'
                            }`}
                        title="Streetlights"
                    >
                        <Lightbulb className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="glass rounded-xl p-3 mt-2 shadow-glass">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Legend
                </p>
                <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-red-500" />
                        <span className="text-gray-300">Crime Density</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-safe-500" />
                        <span className="text-gray-300">CCTV Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <span className="text-gray-300">Streetlight</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-safe-500 rounded" />
                        <span className="text-gray-300">Safest Route</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-amber-500 rounded" />
                        <span className="text-gray-300">Fastest Route</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
