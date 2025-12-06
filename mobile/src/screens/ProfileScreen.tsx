import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', color: '#33a7ff' },
        { icon: 'people-outline', label: 'Emergency Contacts', color: '#22c55e' },
        { icon: 'notifications-outline', label: 'Notifications', color: '#a855f7' },
        { icon: 'shield-outline', label: 'Privacy & Safety', color: '#f59e0b' },
        { icon: 'map-outline', label: 'Saved Routes', color: '#ec4899' },
        { icon: 'time-outline', label: 'Trip History', color: '#6366f1' },
        { icon: 'help-circle-outline', label: 'Help & Support', color: '#64748b' },
        { icon: 'information-circle-outline', label: 'About', color: '#64748b' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color="#64748b" />
                        </View>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.name}>Demo User</Text>
                    <Text style={styles.email}>demo@saferoutex.com</Text>
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                        <Text style={styles.verifiedText}>Verified Account</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                        <Text style={styles.statNumber}>12</Text>
                        <Text style={styles.statLabel}>Safe Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statNumber}>3</Text>
                        <Text style={styles.statLabel}>Reports</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={[styles.statNumber, { color: '#22c55e' }]}>0</Text>
                        <Text style={styles.statLabel}>SOS Used</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                                <Ionicons name={item.icon as any} size={20} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#64748b" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={20} color="#f83b3b" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.version}>SafeRouteX v1.0.0</Text>
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
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#33a7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f1f5f9',
    },
    email: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
    },
    verifiedText: {
        color: '#22c55e',
        fontSize: 12,
        marginLeft: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
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
    menuContainer: {
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        flex: 1,
        color: '#f1f5f9',
        fontSize: 15,
        marginLeft: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f83b3b30',
    },
    logoutText: {
        color: '#f83b3b',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    version: {
        textAlign: 'center',
        color: '#475569',
        fontSize: 12,
        marginTop: 24,
        marginBottom: 100,
    },
});
