import dynamic from 'next/dynamic';
import RoutePanel from '@/components/RoutePanel';
import MapControls from '@/components/MapControls';
import SOSButton from '@/components/SOSButton';
import ReportIncident from '@/components/ReportIncident';
import AIChatbot from '@/components/AIChatbot';

// Dynamic import for MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-dark-200">
            <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-400">Loading map...</p>
            </div>
        </div>
    )
});

export default function HomePage() {
    return (
        <main className="relative w-full h-screen overflow-hidden">
            {/* Map Background */}
            <MapView />

            {/* Route Planning Panel */}
            <RoutePanel />

            {/* Map Layer Controls */}
            <MapControls />

            {/* Report Incident Button */}
            <ReportIncident />

            {/* AI Safety Chatbot */}
            <AIChatbot />

            {/* SOS Emergency Button */}
            <SOSButton />

            {/* Branding */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <div className="glass px-4 py-2 rounded-full shadow-glass">
                    <span className="text-sm font-semibold bg-gradient-to-r from-primary-400 to-safe-400 bg-clip-text text-transparent">
                        🛡️ SafeRouteX
                    </span>
                </div>
            </div>
        </main>
    );
}
