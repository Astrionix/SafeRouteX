import { create } from 'zustand';
import { User } from 'firebase/auth';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string;
    emergencyContacts?: Array<{ id: string; name: string; phone: string; relationship?: string }>;
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    logout: () => set({ user: null, profile: null }),
}));

interface MapState {
    origin: { lat: number; lon: number; address?: string } | null;
    destination: { lat: number; lon: number; address?: string } | null;
    fastestRoute: any | null;
    safestRoute: any | null;
    activeRoute: 'fastest' | 'safest';
    showHeatmap: boolean;
    showCCTV: boolean;
    showStreetlights: boolean;
    setOrigin: (origin: { lat: number; lon: number; address?: string } | null) => void;
    setDestination: (destination: { lat: number; lon: number; address?: string } | null) => void;
    setRoutes: (fastest: any, safest: any) => void;
    setActiveRoute: (route: 'fastest' | 'safest') => void;
    toggleHeatmap: () => void;
    toggleCCTV: () => void;
    toggleStreetlights: () => void;
    clearRoutes: () => void;
}

export const useMapStore = create<MapState>((set) => ({
    origin: null,
    destination: null,
    fastestRoute: null,
    safestRoute: null,
    activeRoute: 'safest',
    showHeatmap: true,
    showCCTV: false,
    showStreetlights: false,
    setOrigin: (origin) => set({ origin }),
    setDestination: (destination) => set({ destination }),
    setRoutes: (fastest, safest) => set({ fastestRoute: fastest, safestRoute: safest }),
    setActiveRoute: (route) => set({ activeRoute: route }),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    toggleCCTV: () => set((state) => ({ showCCTV: !state.showCCTV })),
    toggleStreetlights: () => set((state) => ({ showStreetlights: !state.showStreetlights })),
    clearRoutes: () => set({ fastestRoute: null, safestRoute: null, origin: null, destination: null }),
}));

interface SOSState {
    isActive: boolean;
    sosId: string | null;
    startTime: Date | null;
    locations: Array<{ lat: number; lon: number; timestamp: Date }>;
    startSOS: (sosId: string) => void;
    addLocation: (lat: number, lon: number) => void;
    stopSOS: () => void;
}

export const useSOSStore = create<SOSState>((set) => ({
    isActive: false,
    sosId: null,
    startTime: null,
    locations: [],
    startSOS: (sosId) => set({ isActive: true, sosId, startTime: new Date(), locations: [] }),
    addLocation: (lat, lon) => set((state) => ({
        locations: [...state.locations, { lat, lon, timestamp: new Date() }]
    })),
    stopSOS: () => set({ isActive: false, sosId: null, startTime: null, locations: [] }),
}));
