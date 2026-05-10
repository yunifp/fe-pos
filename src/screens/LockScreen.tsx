import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Alert, ActivityIndicator,
    useWindowDimensions, Platform, ScrollView, StatusBar, Modal
} from 'react-native';
import { Delete, LockKeyhole, User, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLock } from '../context/LockContext';
import { useNavigation } from '@react-navigation/native';

export default function LockScreen() {
    const { width, height } = useWindowDimensions();
    const { isLocked, unlockApp } = useLock(); // Ambil isLocked dari context
    const navigation = useNavigation<any>();

    // Responsive Breakpoints
    const isLandscape = width > height;
    const isLargeScreen = width >= 768;

    const [user, setUser] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) setUser(JSON.parse(u));
        });
    }, []);

    useEffect(() => {
        if (pin.length === 6) {
            handleUnlock();
        }
    }, [pin]);

    const handlePress = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setErrorMsg('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setErrorMsg('');
    };

    const handleUnlock = async () => {
        setLoading(true);
        try {
            await unlockApp(pin);
            setPin(''); // Reset setelah berhasil
        } catch (error: any) {
            setPin('');
            setErrorMsg(error.response?.data?.message || 'PIN Salah / Akses Ditolak');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        const performLogout = async () => {
            try {
                setLoading(true);
                await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (e) {
                navigation.navigate('Login');
            } finally {
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Keluar dari akun?")) performLogout();
        } else {
            Alert.alert("Logout", "Yakin ingin keluar?", [
                { text: "Batal", style: "cancel" },
                { text: "Keluar", style: 'destructive', onPress: performLogout }
            ]);
        }
    };

    const KeyButton = ({ value, onPress, icon, isDanger }: any) => {
        const size = isLargeScreen ? 'w-20 h-20' : 'w-16 h-16';
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={loading}
                className={`${size} m-2 items-center justify-center rounded-full bg-slate-900 border border-slate-800 active:bg-indigo-600`}
            >
                {icon ? icon : <Text className={`text-2xl font-bold ${isDanger ? 'text-rose-500' : 'text-white'}`}>{value}</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={isLocked}
            animationType="fade"
            transparent={false} // Menjamin latar belakang di bawahnya tertutup total
            statusBarTranslucent={true}
        >
            <View className="flex-1 bg-slate-950">
                <StatusBar barStyle="light-content" backgroundColor="#020617" />

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    bounces={false}
                >
                    <View className={`p-6 items-center justify-center ${isLandscape && isLargeScreen ? 'flex-row' : 'flex-col'}`}>

                        {/* INFO SECTION */}
                        <View className={`${isLandscape && isLargeScreen ? 'w-1/2 items-center pr-12' : 'items-center mb-10'}`}>
                            {loading && (
                                <View className="absolute inset-0 bg-slate-950/90 items-center justify-center z-[100]">
                                    <ActivityIndicator size="large" color="#6366F1" />
                                    <Text className="mt-4 font-bold tracking-widest text-white">VERIFIKASI...</Text>
                                </View>
                            )}
                            <View className="items-center justify-center w-20 h-20 mb-6 bg-indigo-600 shadow-xl rounded-3xl shadow-indigo-500/50">
                                <LockKeyhole size={40} color="white" />
                            </View>
                            <View className={isLandscape && isLargeScreen ? 'items-center' : 'items-center'}>
                                <Text className="text-3xl font-black tracking-tighter text-white">SESI TERKUNCI</Text>
                                <View className="flex-row items-center px-3 py-1 mt-2 border rounded-lg bg-white/10 border-white/5">
                                    <User size={12} color="#818cf8" />
                                    <Text className="ml-2 text-xs font-bold tracking-widest text-indigo-300 uppercase">
                                        {user?.fullName || user?.name || 'User'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* KEYPAD SECTION */}
                        <View className={`${isLandscape && isLargeScreen ? 'w-1/2 items-center pl-12 border-l border-slate-900' : 'w-full items-center'}`}>
                            {/* PIN DOTS */}
                            <View className="flex-row items-center mb-6">
                                {[...Array(6)].map((_, i) => (
                                    <View
                                        key={i}
                                        className={`mx-2 rounded-full ${i < pin.length ? 'w-4 h-4 bg-indigo-500' : 'w-3 h-3 bg-slate-800'}`}
                                    />
                                ))}
                            </View>

                            {/* ERROR MSG */}
                            <View className="h-6 mb-4">
                                {errorMsg ? <Text className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{errorMsg}</Text> : null}
                            </View>

                            {/* NUMPAD */}
                            <View className="flex-row flex-wrap justify-center max-w-[300px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                    <KeyButton key={n} value={n.toString()} onPress={() => handlePress(n.toString())} />
                                ))}
                                <KeyButton icon={<LogOut size={22} color="#f43f5e" />} onPress={handleLogout} />
                                <KeyButton value="0" onPress={() => handlePress("0")} />
                                <KeyButton icon={<Delete size={22} color="#94a3b8" />} onPress={handleDelete} />
                            </View>
                        </View>

                    </View>
                </ScrollView>


            </View>
        </Modal>
    );
}