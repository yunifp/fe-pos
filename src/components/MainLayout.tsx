import React, { useState, useEffect, useRef } from 'react'; // Tambah useRef
import { View, useWindowDimensions, TouchableOpacity, Text, StatusBar, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Sidebar from './Sidebar';
import { useSettingStore } from '../stores/settingStore';

interface Props {
    children: React.ReactNode;
}

const MainLayout: React.FC<Props> = ({ children }) => {
    const { width } = useWindowDimensions();
    const { settings } = useSettingStore();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState('');

    // Gunakan Ref untuk tracking mounting agar tidak error saat unmount
    const isMounted = useRef(true);

    // Definisi Layar Besar (Tablet/Desktop)
    const isLargeScreen = width >= 768;

    useEffect(() => {
        isMounted.current = true;

        AsyncStorage.getItem('user').then(u => {
            if (u && isMounted.current) setUserRole(JSON.parse(u).role);
        });

        return () => { isMounted.current = false; };
    }, []);

    // --- PERBAIKAN UTAMA DISINI ---
    useEffect(() => {
        // Gunakan Timeout (Debounce) saat rotasi layar
        // Agar tidak bentrok dengan proses render NativeWind/StyleSheet
        const timer = setTimeout(() => {
            if (!isMounted.current) return;

            // Auto collapse di layar medium (Tablet Portrait)
            if (width >= 768 && width < 1024) {
                setIsCollapsed(true);
            }

            // Tutup menu mobile jika layar tiba-tiba membesar (rotasi ke landscape)
            if (width >= 768) {
                setIsMobileMenuOpen(false);
            }
        }, 100); // Jeda 100ms agar aman

        return () => clearTimeout(timer);
    }, [width]); // Trigger hanya saat width berubah (Rotasi)

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View className="flex-row flex-1">
                {/* --- 1. SIDEBAR PERMANEN --- */}
                {isLargeScreen && (
                    <View className="z-20 h-full shadow-xl bg-slate-900">
                        <Sidebar
                            isCollapsed={isCollapsed}
                            toggleCollapse={toggleCollapse}
                            userRole={userRole}
                            isMobile={false}
                        />
                    </View>
                )}

                {/* --- 2. SIDEBAR DRAWER (MOBILE) --- */}
                <Modal
                    visible={!isLargeScreen && isMobileMenuOpen}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsMobileMenuOpen(false)}
                    statusBarTranslucent={true} // Tambahan agar full screen
                >
                    <View className="flex-row flex-1">
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => setIsMobileMenuOpen(false)}
                            className="absolute inset-0 bg-black/60"
                        />
                        <View className="h-full w-[80%] max-w-[300px] bg-slate-900 shadow-2xl">
                            <Sidebar
                                isCollapsed={false}
                                toggleCollapse={() => { }}
                                userRole={userRole}
                                isMobile={true}
                                closeMobileMenu={() => setIsMobileMenuOpen(false)}
                            />
                        </View>
                    </View>
                </Modal>

                {/* --- 3. KONTEN UTAMA --- */}
                <View className="flex-col flex-1 h-full overflow-hidden bg-gray-50">
                    {!isLargeScreen && (
                        <View className="z-10 flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
                            <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} className="p-1">
                                <Menu color={settings.themePrimaryColor || '#4F46E5'} size={28} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold tracking-wide text-slate-800">
                                {settings.appName || 'EPS POS'}
                            </Text>
                            <View className="w-8" />
                        </View>
                    )}
                    <View className="flex-1">
                        {children}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default MainLayout;