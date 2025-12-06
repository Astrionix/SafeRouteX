'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setProfile, setLoading } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setLoading(false); // Set loading false initially for demo mode
    }, [setLoading]);

    useEffect(() => {
        if (!mounted) return;

        // Dynamic import to completely avoid SSR
        const initAuth = async () => {
            try {
                const { auth, onAuthStateChanged } = await import('@/lib/firebase');

                if (!auth) {
                    setLoading(false);
                    return;
                }

                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    setUser(user);

                    if (user) {
                        try {
                            const token = await user.getIdToken();
                            localStorage.setItem('authToken', token);

                            const response = await authAPI.login(token);
                            setProfile(response.data.user);
                            socketService.connect(token);
                        } catch (error) {
                            console.error('Error syncing user:', error);
                        }
                    } else {
                        localStorage.removeItem('authToken');
                        setProfile(null);
                        socketService.disconnect();
                    }

                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Firebase init error:', error);
                setLoading(false);
            }
        };

        initAuth();
    }, [mounted, setUser, setProfile, setLoading]);

    if (!mounted) {
        return null;
    }

    return <>{children}</>;
}
