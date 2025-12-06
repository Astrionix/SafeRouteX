import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const navigation = useNavigation();

    const features = [
        { icon: 'map', title: 'Safe Routes', desc: 'Find the safest path', color: '#22c55e', screen: 'Map' },
        { icon: 'camera', title: 'CCTV Coverage', desc: 'View camera locations', color: '#33a7ff', screen: 'Map' },
        { icon: 'bulb', title: 'Streetlights', desc: 'Check lighting', color: '#eab308', screen: 'Map' },
        { icon: 'warning', title: 'Crime Hotspots', desc: 'View danger zones', color: '#f83b3b', screen: 'Map' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>Hello! 👋</Text>
                    <Text style={styles.title}>SafeRouteX</Text>
                    <Text style={styles.subtitle}>Navigate safely, anywhere</Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={() => navigation.navigate('SOS' as never)}
                    >
                        <Ionicons name="warning" size={32} color="#fff" />
                        <Text style={styles.sosText}>SOS</Text>
                        <Text style={styles.sosSubtext}>Emergency Alert</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.routeButton}
                        onPress={() => navigation.navigate('Map' as never)}
                    >
                        <Ionicons name="navigate" size={32} color="#fff" />
                        <Text style={styles.routeText}>Find Route</Text>
                        <Text style={styles.routeSubtext}>Safe Navigation</Text>
                    </TouchableOpacity>
                </View>

                {/* Features Grid */}
                <Text style={styles.sectionTitle}>Safety Features</Text>
                <View style={styles.featuresGrid}>
                    {features.map((feature, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.featureCard}
                            onPress={() => navigation.navigate(feature.screen as never)}
                        >
                            <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                                <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                            </View>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDesc}>{feature.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stats */}
                <Text style={styles.sectionTitle}>Safety Stats</Text>
                <View style={styles.statsCard}>
                    <View style={styles.stat}>
                        <Text style={styles.statNumber}>1,250+</Text>
                        <Text style={styles.statLabel}>CCTV Cameras</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statNumber}>26,000+</Text>
                        <Text style={styles.statLabel}>Streetlights</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={[styles.statNumber, { color: '#22c55e' }]}>92%</Text>
                        <Text style={styles.statLabel}>Coverage</Text>
                    </View>
                </View>

                {/* AI Assistant */}
                <TouchableOpacity style={styles.aiCard}>
                    <View style={styles.aiIcon}>
                        <Ionicons name="sparkles" size={24} color="#a855f7" />
                    </View>
                    <View style={styles.aiContent}>
                        <Text style={styles.aiTitle}>AI Safety Assistant</Text>
                        <Text style={styles.aiDesc}>Ask about safe routes and areas</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    greeting: {
        fontSize: 16,
        color: '#94a3b8',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginTop: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    sosButton: {
        flex: 1,
        backgroundColor: '#dc2626',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    sosText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    sosSubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    routeButton: {
        flex: 1,
        backgroundColor: '#22c55e',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    routeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    routeSubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f1f5f9',
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 20,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 14,
    },
    featureCard: {
        width: (width - 52) / 2,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        margin: 6,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f1f5f9',
    },
    featureDesc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    statsCard: {
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#33a7ff',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#334155',
    },
    aiCard: {
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 100,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiContent: {
        flex: 1,
        marginLeft: 12,
    },
    aiTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f1f5f9',
    },
    aiDesc: {
        fontSize: 13,
        color: '#64748b',
    },
});
