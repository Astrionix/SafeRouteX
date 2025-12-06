import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Bangalore center
const INITIAL_REGION = {
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function MapScreen() {
    const mapRef = useRef<MapView>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [showLayers, setShowLayers] = useState({
        heatmap: true,
        cctv: false,
        streetlights: false,
    });
    const [routes, setRoutes] = useState<{ fastest: any; safest: any } | null>(null);
    const [activeRoute, setActiveRoute] = useState<'fastest' | 'safest'>('safest');

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
            }
        })();
    }, []);

    const handleFindRoute = async () => {
        // Demo routes
        setRoutes({
            fastest: {
                coords: [
                    { latitude: 12.9716, longitude: 77.5946 },
                    { latitude: 12.9352, longitude: 77.6245 },
                ],
                distance: 5.2,
                duration: '15 min',
                safetyScore: 0.65,
            },
            safest: {
                coords: [
                    { latitude: 12.9716, longitude: 77.5946 },
                    { latitude: 12.96, longitude: 77.58 },
                    { latitude: 12.95, longitude: 77.61 },
                    { latitude: 12.9352, longitude: 77.6245 },
                ],
                distance: 6.1,
                duration: '18 min',
                safetyScore: 0.89,
            },
        });
    };

    // Demo crime heatmap points
    const heatmapPoints = [
        { latitude: 12.9716, longitude: 77.5946, weight: 1 },
        { latitude: 12.975, longitude: 77.590, weight: 0.8 },
        { latitude: 12.968, longitude: 77.600, weight: 0.6 },
        { latitude: 12.935, longitude: 77.625, weight: 0.7 },
    ];

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={INITIAL_REGION}
                showsUserLocation
                showsMyLocationButton={false}
                customMapStyle={mapDarkStyle}
            >
                {/* Crime Heatmap */}
                {showLayers.heatmap && (
                    <Heatmap
                        points={heatmapPoints}
                        radius={50}
                        opacity={0.7}
                        gradient={{
                            colors: ['#00ff00', '#ffff00', '#ff0000'],
                            startPoints: [0.1, 0.5, 1],
                            colorMapSize: 256,
                        }}
                    />
                )}

                {/* Routes */}
                {routes?.fastest && (
                    <Polyline
                        coordinates={routes.fastest.coords}
                        strokeColor={activeRoute === 'fastest' ? '#f59e0b' : '#f59e0b50'}
                        strokeWidth={activeRoute === 'fastest' ? 5 : 3}
                    />
                )}
                {routes?.safest && (
                    <Polyline
                        coordinates={routes.safest.coords}
                        strokeColor={activeRoute === 'safest' ? '#22c55e' : '#22c55e50'}
                        strokeWidth={activeRoute === 'safest' ? 5 : 3}
                    />
                )}

                {/* User Location Marker */}
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="You are here"
                    >
                        <View style={styles.userMarker}>
                            <View style={styles.userMarkerInner} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Route Input Panel */}
            <View style={styles.panel}>
                <View style={styles.inputRow}>
                    <Ionicons name="ellipse" size={12} color="#22c55e" />
                    <TextInput
                        style={styles.input}
                        placeholder="Origin"
                        placeholderTextColor="#64748b"
                        value={origin}
                        onChangeText={setOrigin}
                    />
                </View>
                <View style={styles.inputRow}>
                    <Ionicons name="location" size={14} color="#f83b3b" />
                    <TextInput
                        style={styles.input}
                        placeholder="Destination"
                        placeholderTextColor="#64748b"
                        value={destination}
                        onChangeText={setDestination}
                    />
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleFindRoute}>
                    <Ionicons name="search" size={20} color="#fff" />
                    <Text style={styles.searchButtonText}>Find Safe Route</Text>
                </TouchableOpacity>
            </View>

            {/* Layer Controls */}
            <View style={styles.layerControls}>
                <TouchableOpacity
                    style={[styles.layerBtn, showLayers.heatmap && styles.layerBtnActive]}
                    onPress={() => setShowLayers(p => ({ ...p, heatmap: !p.heatmap }))}
                >
                    <Ionicons name="flame" size={20} color={showLayers.heatmap ? '#f83b3b' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.layerBtn, showLayers.cctv && styles.layerBtnActive]}
                    onPress={() => setShowLayers(p => ({ ...p, cctv: !p.cctv }))}
                >
                    <Ionicons name="videocam" size={20} color={showLayers.cctv ? '#22c55e' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.layerBtn, showLayers.streetlights && styles.layerBtnActive]}
                    onPress={() => setShowLayers(p => ({ ...p, streetlights: !p.streetlights }))}
                >
                    <Ionicons name="bulb" size={20} color={showLayers.streetlights ? '#eab308' : '#64748b'} />
                </TouchableOpacity>
            </View>

            {/* Route Selection */}
            {routes && (
                <View style={styles.routeSelector}>
                    <TouchableOpacity
                        style={[styles.routeOption, activeRoute === 'fastest' && styles.routeOptionActiveFast]}
                        onPress={() => setActiveRoute('fastest')}
                    >
                        <Ionicons name="flash" size={18} color={activeRoute === 'fastest' ? '#f59e0b' : '#94a3b8'} />
                        <View>
                            <Text style={styles.routeLabel}>Fastest</Text>
                            <Text style={styles.routeInfo}>{routes.fastest.duration} • {routes.fastest.distance}km</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.routeOption, activeRoute === 'safest' && styles.routeOptionActiveSafe]}
                        onPress={() => setActiveRoute('safest')}
                    >
                        <Ionicons name="shield-checkmark" size={18} color={activeRoute === 'safest' ? '#22c55e' : '#94a3b8'} />
                        <View>
                            <Text style={styles.routeLabel}>Safest</Text>
                            <Text style={styles.routeInfo}>{Math.round(routes.safest.safetyScore * 100)}% safe • {routes.safest.distance}km</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* My Location Button */}
            <TouchableOpacity
                style={styles.myLocationBtn}
                onPress={() => {
                    if (location) {
                        mapRef.current?.animateToRegion({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                    }
                }}
            >
                <Ionicons name="locate" size={24} color="#33a7ff" />
            </TouchableOpacity>
        </View>
    );
}

const mapDarkStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width, height },
    panel: {
        position: 'absolute',
        top: 10,
        left: 16,
        right: 16,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        color: '#f1f5f9',
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 15,
    },
    searchButton: {
        backgroundColor: '#33a7ff',
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    layerControls: {
        position: 'absolute',
        right: 16,
        top: 200,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 8,
    },
    layerBtn: {
        padding: 10,
        borderRadius: 8,
    },
    layerBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    routeSelector: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
    },
    routeOption: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    routeOptionActiveFast: { borderColor: '#f59e0b' },
    routeOptionActiveSafe: { borderColor: '#22c55e' },
    routeLabel: { color: '#f1f5f9', fontWeight: '600' },
    routeInfo: { color: '#64748b', fontSize: 12 },
    myLocationBtn: {
        position: 'absolute',
        right: 16,
        bottom: 180,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
    },
    userMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(51, 167, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#33a7ff',
    },
});
