import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:4000/api'; // Update with your backend URL

export default function SOSScreen() {
    const [isActive, setIsActive] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [showCountdown, setShowCountdown] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for active SOS
    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActive]);

    // Countdown logic
    useEffect(() => {
        if (!showCountdown) return;

        if (countdown === 0) {
            activateSOS();
            return;
        }

        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, showCountdown]);

    // Watch location when SOS is active
    useEffect(() => {
        if (!isActive) return;

        let subscription: Location.LocationSubscription;

        (async () => {
            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
                (loc) => {
                    setLocation(loc);
                    // Send location update to backend
                    axios.post(`${API_URL}/sos/location`, {
                        sosId: 'current',
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                    }).catch(console.error);
                }
            );
        })();

        return () => { subscription?.remove(); };
    }, [isActive]);

    const handleSOSPress = () => {
        if (isActive) {
            deactivateSOS();
        } else {
            Vibration.vibrate([100, 100, 100]);
            setShowCountdown(true);
            setCountdown(3);
        }
    };

    const activateSOS = async () => {
        setShowCountdown(false);
        setIsActive(true);
        Vibration.vibrate([0, 500, 200, 500]);

        try {
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            await axios.post(`${API_URL}/sos/start`, {
                lat: loc.coords.latitude,
                lon: loc.coords.longitude,
                message: 'Emergency SOS activated',
            });
        } catch (error) {
            console.error('SOS activation error:', error);
        }
    };

    const deactivateSOS = async () => {
        setIsActive(false);
        Vibration.cancel();

        try {
            await axios.post(`${API_URL}/sos/stop`, { sosId: 'current' });
        } catch (error) {
            console.error('SOS deactivation error:', error);
        }
    };

    const cancelCountdown = () => {
        setShowCountdown(false);
        setCountdown(3);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Active SOS Banner */}
            {isActive && (
                <View style={styles.activeBanner}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>SOS Active - Sharing your location</Text>
                </View>
            )}

            {/* Main Content */}
            <View style={styles.content}>
                {showCountdown ? (
                    <>
                        <View style={styles.countdownContainer}>
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                            <Text style={styles.countdownLabel}>Activating SOS...</Text>
                        </View>
                        <TouchableOpacity style={styles.cancelButton} onPress={cancelCountdown}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>{isActive ? '🆘 SOS Active' : 'Emergency SOS'}</Text>
                        <Text style={styles.subtitle}>
                            {isActive
                                ? 'Your location is being shared with emergency contacts'
                                : 'Press and hold the button to activate emergency mode'}
                        </Text>

                        {/* SOS Button */}
                        <Animated.View style={[styles.sosButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <TouchableOpacity
                                style={[styles.sosButton, isActive && styles.sosButtonActive]}
                                onPress={handleSOSPress}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={isActive ? 'close' : 'warning'}
                                    size={60}
                                    color="#fff"
                                />
                                <Text style={styles.sosButtonText}>
                                    {isActive ? 'STOP' : 'SOS'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Location Info */}
                        {isActive && location && (
                            <View style={styles.locationCard}>
                                <Ionicons name="location" size={20} color="#33a7ff" />
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationLabel}>Current Location</Text>
                                    <Text style={styles.locationCoords}>
                                        {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Quick Actions */}
                        {!isActive && (
                            <View style={styles.quickActions}>
                                <TouchableOpacity style={styles.quickAction}>
                                    <View style={[styles.quickIcon, { backgroundColor: '#22c55e20' }]}>
                                        <Ionicons name="call" size={24} color="#22c55e" />
                                    </View>
                                    <Text style={styles.quickLabel}>Call 112</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickAction}>
                                    <View style={[styles.quickIcon, { backgroundColor: '#33a7ff20' }]}>
                                        <Ionicons name="people" size={24} color="#33a7ff" />
                                    </View>
                                    <Text style={styles.quickLabel}>Alert Contacts</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickAction}>
                                    <View style={[styles.quickIcon, { backgroundColor: '#a855f720' }]}>
                                        <Ionicons name="shield" size={24} color="#a855f7" />
                                    </View>
                                    <Text style={styles.quickLabel}>Fake Call</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Emergency Contact */}
            <TouchableOpacity style={styles.emergencyCall}>
                <Ionicons name="call" size={20} color="#f83b3b" />
                <Text style={styles.emergencyCallText}>Emergency: 112</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    activeBanner: {
        backgroundColor: '#dc2626',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    activeText: {
        color: '#fff',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    sosButtonContainer: {
        marginBottom: 40,
    },
    sosButton: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    sosButtonActive: {
        backgroundColor: '#991b1b',
    },
    sosButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 8,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        width: '100%',
    },
    locationInfo: {
        marginLeft: 12,
    },
    locationLabel: {
        color: '#94a3b8',
        fontSize: 13,
    },
    locationCoords: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '500',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    quickAction: {
        alignItems: 'center',
    },
    quickIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    quickLabel: {
        color: '#94a3b8',
        fontSize: 12,
    },
    countdownContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    countdownNumber: {
        fontSize: 120,
        fontWeight: 'bold',
        color: '#f83b3b',
    },
    countdownLabel: {
        fontSize: 18,
        color: '#94a3b8',
    },
    cancelButton: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 12,
    },
    cancelButtonText: {
        color: '#f1f5f9',
        fontSize: 18,
        fontWeight: '600',
    },
    emergencyCall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    emergencyCallText: {
        color: '#f83b3b',
        fontSize: 16,
        fontWeight: '500',
    },
});
