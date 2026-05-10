import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import React, { useState, useEffect } from 'react';
import {
    View, Text, KeyboardAvoidingView, Platform, Alert,
    TouchableOpacity, Image, ActivityIndicator, ImageBackground,
    StatusBar, useWindowDimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, Store } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/api';
import MyInput from '../components/MyInput';
import { useSettingStore } from '../stores/settingStore';
import { CustomToast } from '../components/CustomToast'; // Import komponen CustomToast
import { useLock } from '../context/LockContext';

export default function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { width } = useWindowDimensions();

    const { setLockEnabled } = useLock();

    // Deteksi Layar Besar (Tablet Landscape / Web)
    const isLargeScreen = width >= 768;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- STATE UNTUK CUSTOM TOAST ---
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success' as 'success' | 'error'
    });

    const { settings, fetchSettings } = useSettingStore();

    useEffect(() => {
        setLockEnabled(false);
        fetchSettings();
        const clearSession = async () => {
            await AsyncStorage.multiRemove(['user', 'token']);
        };
        clearSession();

        return () => {
            setLockEnabled(true);
        };
    }, []);

    // Helper untuk menampilkan toast
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ visible: true, message, type });
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showToast("Mohon isi email dan password.", "error");
            return;
        }

        if (password.length < 8) {
            showToast("Password minimal 8 karakter.", "error");
            return;
        }

        setLoading(true);

        try {
            // 1. Kirim request login ke backend
            const response = await api.post('/auth/login', { email, password });

            // 2. Destructure data (Pastikan mengambil refreshToken juga)
            const { token, refreshToken, user } = response.data;

            // 3. Simpan seluruh data ke AsyncStorage
            // PENTING: Key harus sama dengan yang dipanggil di api.ts interceptor
            await Promise.all([
                AsyncStorage.setItem('token', token),
                AsyncStorage.setItem('refreshToken', refreshToken), // Simpan kunci sesi panjang
                AsyncStorage.setItem('user', JSON.stringify(user))    // Simpan profil user
            ]);

            // 4. Pindah ke halaman Dashboard
            navigation.replace('Dashboard');

        } catch (error: any) {
            // Handle error seperti kredensial salah atau server mati
            const msg = error.response?.data?.message || "Gagal terhubung ke server";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!settings.isLoaded) {
        return (
            <View className="items-center justify-center flex-1 bg-gray-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const primaryColor = settings.themePrimaryColor || '#4F46E5';
    const secondaryColor = settings.themeSecondaryColor || '#0F172A';

    // --- BAGIAN UI 1: BRANDING (Kiri/Atas) ---
    const renderBranding = () => (
        <View className="relative items-center justify-center flex-1 w-full h-full overflow-hidden bg-slate-900">
            {/* Background Image / Gradient */}
            {settings.loginBgUrl ? (
                <ImageBackground
                    source={{ uri: settings.loginBgUrl }}
                    className="absolute w-full h-full"
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.95)']}
                        className="absolute w-full h-full"
                    />
                </ImageBackground>
            ) : (
                <LinearGradient
                    colors={[primaryColor, secondaryColor]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    className="absolute w-full h-full"
                />
            )}

            {/* Content Branding */}
            <View className="z-10 items-center w-full max-w-lg p-8">
                <View className="items-center justify-center w-24 h-24 mb-6 overflow-hidden border rounded-full shadow-2xl bg-white/10 backdrop-blur-xl border-white/20">
                    {settings.logoUrl ? (
                        <Image
                            source={{ uri: settings.logoUrl }}
                            className="w-full h-full"
                            resizeMode="cover" // Gunakan cover agar gambar memenuhi lingkaran
                        />
                    ) : (
                        <Store color="white" size={40} />
                    )}
                </View>

                <Text className="text-4xl font-extrabold tracking-widest text-center text-white shadow-lg">
                    {settings.appName.toUpperCase()}
                </Text>

                <View className="w-20 h-1 my-6 rounded-full bg-white/40" />

                <Text className="text-lg italic font-light leading-8 text-center text-gray-200">
                    "{settings.tagline || 'Solusi Pintar untuk Bisnis Anda'}"
                </Text>
            </View>
        </View>
    );

    // --- BAGIAN UI 2: FORM INPUT (Kanan/Bawah) ---
    const renderForm = () => (
        <ScrollView showsVerticalScrollIndicator={false} className="w-full max-w-sm">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-slate-800">Selamat Datang</Text>
                <Text className="mt-2 text-base text-slate-500">
                    Masuk untuk mengelola {settings.storeName}
                </Text>
            </View>
            <View>
                <MyInput
                    label="Email"
                    placeholder="admin@example.com"
                    value={email}
                    onChangeText={setEmail}
                    icon={<Mail size={20} color="#64748B" />}
                    autoCapitalize="none"
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                />
                <View>
                    <MyInput
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        isPassword
                        icon={<Lock size={20} color="#64748B" />}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                    />
                    <TouchableOpacity className="self-end mt-2">
                        <Text className="text-sm font-medium" style={{ color: primaryColor }}>
                            Lupa Password?
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="flex-row items-center justify-center mt-8 transition-all transform shadow-lg h-14 rounded-2xl shadow-blue-900/20 active:scale-95"
                style={{ backgroundColor: primaryColor }}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Text className="mr-2 text-lg font-bold text-white">Masuk Aplikasi</Text>
                        <ArrowRight color="white" size={20} strokeWidth={2.5} />
                    </>
                )}
            </TouchableOpacity>

            <View className="items-center mt-12 mb-4">
                <Text className="text-xs text-center text-slate-400">
                    Copyright © 2025 {settings.storeName}.{'\n'}All rights reserved.
                </Text>
            </View>
        </ScrollView>
    );

    // --- RENDER UTAMA ---
    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle={isLargeScreen ? "light-content" : "light-content"} translucent backgroundColor="transparent" />

            {/* INTEGRASI CUSTOM TOAST */}
            <CustomToast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            {isLargeScreen ? (
                // ==========================================
                // LAYOUT 1: TABLET LANDSCAPE / WEB (SPLIT)
                // ==========================================
                <View className="flex-row flex-1">
                    {/* Kiri: Branding Full Height */}
                    <View className="flex-1">
                        {renderBranding()}
                    </View>

                    {/* Kanan: Form Center */}
                    <View className="items-center justify-center flex-1 p-12 bg-white">
                        {renderForm()}
                    </View>
                </View>
            ) : (
                // ==========================================
                // LAYOUT 2: MOBILE / TABLET PORTRAIT (STACK)
                // ==========================================
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>

                        {/* Header Branding (Tinggi Fixed) */}
                        <View className="h-[45vh] w-full relative">
                            {renderBranding()}
                        </View>

                        {/* Form Container (Melengkung ke atas menutupi header) */}
                        <View className="flex-1 bg-white -mt-10 rounded-t-[30px] px-6 pt-10 pb-6 items-center shadow-2xl">
                            {renderForm()}
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}