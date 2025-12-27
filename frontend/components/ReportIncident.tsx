'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { reportAPI } from '@/lib/api';
import { AlertCircle, MapPin, Send, X, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const REPORT_TYPES = [
    { id: 'unsafe_street', label: 'Unsafe Street', icon: '⚠️' },
    { id: 'harassment', label: 'Harassment', icon: '🚨' },
    { id: 'robbery', label: 'Robbery', icon: '💰' },
    { id: 'dark_street', label: 'Dark Street', icon: '🌑' },
    { id: 'missing_streetlight', label: 'Missing Streetlight', icon: '💡' },
    { id: 'broken_cctv', label: 'Broken CCTV', icon: '📹' },
    { id: 'other', label: 'Other', icon: '📝' },
];

export default function ReportIncident() {
    const { profile } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleGetLocation = () => {
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                setGettingLocation(false);
                toast.success('Location captured');
            },
            (error) => {
                setGettingLocation(false);
                toast.error('Could not get location');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async () => {
        if (!selectedType) {
            toast.error('Please select incident type');
            return;
        }
        if (!location) {
            toast.error('Please add location');
            return;
        }

        setLoading(true);
        try {
            await reportAPI.create({
                type: selectedType,
                lat: location.lat,
                lon: location.lon,
                description
            });
            toast.success('Report submitted! Thank you for keeping the community safe.');
            setIsOpen(false);
            resetForm();
        } catch (error: any) {
            if (error.response?.status === 401) {
                toast.error('Please login to submit reports');
            } else {
                toast.error('Failed to submit report');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedType('');
        setDescription('');
        setLocation(null);
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-32 z-40 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 
          text-white font-semibold rounded-xl shadow-lg hover:shadow-amber-500/25 
          transition-all duration-200 flex items-center gap-2 hover:scale-105"
            >
                <AlertCircle className="w-5 h-5" />
                Report Incident
            </button>

            {/* Report Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-dark-100 border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-glass"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-400" />
                                    Report Incident
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Type Selection */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Incident Type *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {REPORT_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setSelectedType(type.id)}
                                                className={`p-3 rounded-xl text-left transition-all duration-200 border ${selectedType === type.id
                                                    ? 'bg-primary-500/20 border-primary-500 text-white'
                                                    : 'bg-dark-200/50 border-white/5 text-gray-300 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="text-lg mr-2">{type.icon}</span>
                                                <span className="text-sm">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Location *</label>
                                    <button
                                        onClick={handleGetLocation}
                                        disabled={gettingLocation}
                                        className={`w-full p-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${location
                                            ? 'bg-safe-500/20 border-safe-500 text-safe-400'
                                            : 'bg-dark-200/50 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                    >
                                        {gettingLocation ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <MapPin className="w-4 h-4" />
                                        )}
                                        {location
                                            ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                                            : 'Use Current Location'
                                        }
                                    </button>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Description (optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what happened..."
                                        rows={3}
                                        className="input-field resize-none"
                                    />
                                </div>

                                {/* Photo Upload (placeholder) */}
                                <button className="w-full p-3 rounded-xl border border-dashed border-white/20 text-gray-400 
                  hover:border-white/30 hover:text-gray-300 transition-all flex items-center justify-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    Add Photo (optional)
                                </button>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !selectedType || !location}
                                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Submit Report
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    Your report will be reviewed by moderators and may be shared with authorities.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
