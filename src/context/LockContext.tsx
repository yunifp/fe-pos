import React, { createContext, useState, useContext, useRef, useEffect, ReactNode } from 'react';
import { PanResponder, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const AUTO_LOCK_TIME = 3 * 60 * 1000; // 3 Menit

interface LockContextType {
    isLocked: boolean;
    lockApp: () => void;
    unlockApp: (pin: string) => Promise<boolean>;
    setLockEnabled: (enabled: boolean) => void;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export const LockProvider = ({ children }: { children: ReactNode }) => {
    const [isLocked, setIsLocked] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);
    const timerId = useRef<NodeJS.Timeout | null>(null);

    // --- PERBAIKAN ANDROID 1: Ref untuk melacak status lock tanpa stale closure ---
    const isLockedRef = useRef(isLocked);
    useEffect(() => {
        isLockedRef.current = isLocked;
    }, [isLocked]);

    useEffect(() => {
        const checkInitialSession = async () => {
            try {
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                const userStr = await AsyncStorage.getItem('user');

                if (refreshToken && userStr) {
                    console.log("Session ditemukan, mengunci aplikasi untuk keamanan PIN...");
                    setIsLocked(true);
                }
            } catch (e) {
                console.error("Error checking initial session:", e);
            }
        };
        checkInitialSession();
    }, []);

    const resetInactivityTimeout = () => {
        if (timerId.current) {
            clearTimeout(timerId.current);
        }

        // --- PERBAIKAN ANDROID 2: Pastikan timer tidak di-restart jika sedang terkunci ---
        if (!isLockedRef.current && isEnabled) {
            timerId.current = setTimeout(() => {
                console.log("Waktu habis! Mengunci aplikasi...");
                setIsLocked(true);
            }, AUTO_LOCK_TIME);
        }
    };

    useEffect(() => {
        resetInactivityTimeout();
    }, [isEnabled, isLocked]);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleActivity = () => resetInactivityTimeout();
            window.addEventListener('mousemove', handleActivity);
            window.addEventListener('mousedown', handleActivity);
            window.addEventListener('keydown', handleActivity);
            window.addEventListener('scroll', handleActivity, true);
            window.addEventListener('touchstart', handleActivity);

            return () => {
                if (timerId.current) clearTimeout(timerId.current);
                window.removeEventListener('mousemove', handleActivity);
                window.removeEventListener('mousedown', handleActivity);
                window.removeEventListener('keydown', handleActivity);
                window.removeEventListener('scroll', handleActivity, true);
                window.removeEventListener('touchstart', handleActivity);
            };
        }
    }, [isLocked, isEnabled]);

    // --- PERBAIKAN ANDROID 3: Cegah PanResponder mereset timer saat Lock Screen aktif ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => {
                // Di Android, hanya reset timer jika sedang TIDAK terkunci.
                // Ini mencegah gangguan saat user sedang mengetik PIN.
                if (Platform.OS !== 'web' && !isLockedRef.current) {
                    resetInactivityTimeout();
                }
                return false;
            },
            onMoveShouldSetPanResponderCapture: () => {
                if (Platform.OS !== 'web' && !isLockedRef.current) {
                    resetInactivityTimeout();
                }
                return false;
            },
        })
    ).current;

    useEffect(() => {
        if (Platform.OS !== 'web') {
            resetInactivityTimeout();
        }
    }, [isLocked]);

    const lockApp = () => setIsLocked(true);

    const unlockApp = async (pin: string) => {
        try {
            // Ambil user secara fresh untuk menghindari kegagalan request karena data null di Android
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) throw new Error("User tidak ditemukan");

            const user = JSON.parse(userStr);

            const response = await api.post('/auth/unlock', {
                userId: user.id,
                pin: pin
            });

            const { token } = response.data;

            await AsyncStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setIsLocked(false);
            // Timer akan otomatis di-reset oleh useEffect [isLocked]
            return true;

        } catch (error: any) {
            console.error("Unlock failed:", error);
            throw error;
        }
    };

    return (
        <LockContext.Provider value={{ isLocked, lockApp, unlockApp, setLockEnabled: setIsEnabled }}>
            <View
                style={{ flex: 1 }}
                {...(isEnabled && Platform.OS !== 'web' ? panResponder.panHandlers : {})}
            >
                {children}
            </View>
        </LockContext.Provider>
    );
};

export const useLock = () => {
    const context = useContext(LockContext);
    if (!context) {
        throw new Error('useLock must be used within a LockProvider');
    }
    return context;
};