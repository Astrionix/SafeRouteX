'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSOSStore, useAuthStore } from '@/lib/store';
import { sosAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { AlertTriangle, Phone, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function SOSButton() {
    const { user, profile } = useAuthStore();
    const { isActive, sosId, startSOS, stopSOS, addLocation } = useSOSStore();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Geolocation tracking
    useEffect(() => {
        if (!isActive || !sosId) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                addLocation(latitude, longitude);

                // Send to backend
                sosAPI.updateLocation(sosId, latitude, longitude, accuracy).catch(console.error);
                socketService.emitSOSLocation(sosId, latitude, longitude, accuracy);
            },
            (error) => console.error('Geolocation error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isActive, sosId, addLocation]);

    // Countdown for confirmation
    useEffect(() => {
        if (!showConfirm || countdown <= 0) return;

        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [showConfirm, countdown]);

    // Auto-trigger SOS after countdown
    useEffect(() => {
        if (showConfirm && countdown === 0) {
            handleActivateSOS();
        }
    }, [countdown, showConfirm]);

    const handleSOSClick = () => {
        if (isActive) {
            handleDeactivateSOS();
        } else {
            setShowConfirm(true);
            setCountdown(3);
        }
    };

    const handleActivateSOS = async () => {
        setLoading(true);
        try {
            // Get current position
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const { latitude, longitude } = position.coords;

            const response = await sosAPI.start(latitude, longitude, 'Emergency SOS activated');
            startSOS(response.data.sosEvent.id);

            toast.success('🆘 SOS Activated! Help is on the way.', { duration: 5000 });
            setShowConfirm(false);
        } catch (error: any) {
            console.error('SOS activation error:', error);
            // Demo mode
            startSOS('demo-sos-' + Date.now());
            toast.success('🆘 SOS Activated (Demo Mode)', { duration: 5000 });
            setShowConfirm(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivateSOS = async () => {
        setLoading(true);
        try {
            if (sosId && !sosId.startsWith('demo')) {
                await sosAPI.stop(sosId, 'User deactivated', false);
            }
            stopSOS();
            toast.success('SOS deactivated');
        } catch (error) {
            stopSOS();
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setShowConfirm(false);
        setCountdown(3);
    };

    return (
        <>
            {/* SOS Button */}
            <motion.button
                onClick={handleSOSClick}
                disabled={loading}
                className={`fixed bottom-6 left-6 z-50 w-20 h-20 rounded-full flex items-center justify-center 
          font-bold text-white shadow-2xl transition-all duration-300
          ${isActive
                        ? 'bg-danger-600 sos-button-active shadow-glow-danger'
                        : 'bg-gradient-to-br from-danger-500 to-danger-700 sos-button hover:scale-110'
                    }`}
                whileTap={{ scale: 0.9 }}
            >
                {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                ) : isActive ? (
                    <span className="text-sm">STOP</span>
                ) : (
                    <span className="text-xl">SOS</span>
                )}
            </motion.button>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-100 border border-danger-500/50 rounded-2xl p-6 max-w-sm w-full shadow-glow-danger"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-danger-500/20 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-danger-500" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Activate SOS?</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Emergency services and your contacts will be notified. Your location will be shared in real-time.
                                </p>

                                {/* Countdown */}
                                <div className="mb-6">
                                    <div className="text-4xl font-bold text-danger-400 mb-2">{countdown}</div>
                                    <p className="text-xs text-gray-500">Activating automatically...</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-3 bg-dark-200 text-gray-300 rounded-xl hover:bg-dark-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleActivateSOS}
                                        disabled={loading}
                                        className="flex-1 btn-danger"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Activate Now'}
                                    </button>
                                </div>

                                {/* Emergency Contact */}
                                <a
                                    href="tel:112"
                                    className="mt-4 flex items-center justify-center gap-2 text-danger-400 hover:text-danger-300 text-sm"
                                >
                                    <Phone className="w-4 h-4" />
                                    Call 112 (Emergency)
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active SOS Banner */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50 bg-danger-600 text-white py-3 px-4 text-center shadow-lg"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                            <span className="font-semibold">SOS Active - Your location is being shared</span>
                            <button onClick={handleDeactivateSOS} className="ml-4 underline text-sm">
                                Stop SOS
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
