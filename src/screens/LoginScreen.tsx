import React, { useState, useEffect } from 'react';
import {
    View, Text, KeyboardAvoidingView, Platform, Alert,
    TouchableOpacity, Image, ActivityIndicator, ImageBackground,
    StatusBar, useWindowDimensions, ScrollView, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, Store, MapPin, SearchX, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

import api from '../api/api';
import MyInput from '../components/MyInput';
import { useSettingStore } from '../stores/settingStore';
import { CustomToast } from '../components/CustomToast';
import { useLock } from '../context/LockContext';

export default function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { width } = useWindowDimensions();
    const { setLockEnabled } = useLock();
    const isLargeScreen = width >= 768;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- STATE UNTUK VALIDASI TENANT ---
    // 'checking' | 'valid' | 'inactive' | 'not_found'
    const [tenantStatus, setTenantStatus] = useState<'checking' | 'valid' | 'inactive' | 'not_found'>('checking');

    // --- STATE UNTUK POP-UP PEMILIHAN CABANG ---
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [tempAuthData, setTempAuthData] = useState<{ token: string; refreshToken: string; user: any } | null>(null);
    const [loadingBranches, setLoadingBranches] = useState(false);

    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success' as 'success' | 'error'
    });

    const { settings, fetchSettings } = useSettingStore();

    useEffect(() => {
        setLockEnabled(false);
        fetchSettings();

        // --- LOGIKA VERIFIKASI TENANT KE BACKEND API SAAT PERTAMA KALI LOAD ---
        const verifyTenant = async () => {
            try {
                // Ekstrak slug dari hostname (Web) atau gunakan env fallback untuk testing mobile
                let currentSlug = "";
                if (Platform.OS === 'web') {
                    currentSlug = window.location.hostname.split('.')[0];
                } else {
                    currentSlug = process.env.EXPO_PUBLIC_TENANT_SLUG || "kopi-sunda-staging";
                }

                // Hit API Backend Anda (Route yang baru dibuat: /tenant/verify)
                const res = await api.get(`/tenant/verify?slug=${currentSlug}`);
                const { success, data, tenantIsActive } = res.data;

                if (success && data) {
                    if (data.exists === false) {
                        setTenantStatus('not_found');
                    } else if (data.isActive === false || tenantIsActive === false) {
                        setTenantStatus('inactive');
                    } else {
                        setTenantStatus('valid');
                    }
                }
            } catch (error: any) {
                // Tangkap response error (404 Not Found atau 403 Inactive) dari backend
                if (error.response) {
                    const status = error.response.status;
                    const resData = error.response.data;

                    if (status === 404 || resData?.data?.exists === false) {
                        setTenantStatus('not_found');
                    } else if (status === 403 || resData?.tenantIsActive === false) {
                        setTenantStatus('inactive');
                    } else {
                        setTenantStatus('not_found'); // Fallback jika error lain
                    }
                } else {
                    setTenantStatus('not_found');
                }
            }
        };

        const clearSession = async () => {
            await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
        };

        verifyTenant();
        clearSession();

        return () => {
            setLockEnabled(true);
        };
    }, []);

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
            const response = await api.post('/auth/login', { email, password });
            const { token, refreshToken, user } = response.data;

            // Pasang token di header default sementara agar bisa memuat cabang jika diperlukan
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // --- LOGIKA CEK MULTI-CABANG ---
            // Jika user adalah OWNER / MANAGER atau belum terikat pada branchId tertentu
            if (user.jobPosition === 'OWNER' || user.jobPosition === 'MANAGER' || !user.branchId) {
                setLoadingBranches(true);
                try {
                    const branchRes = await api.get('/branches');
                    const fetchedBranches = branchRes.data;

                    if (fetchedBranches.length > 1) {
                        setBranches(fetchedBranches);
                        // Fallback aman: gunakan "" (string kosong) jika refreshToken bernilai undefined dari backend
                        setTempAuthData({ token, refreshToken: refreshToken || "", user });
                        setShowBranchModal(true);
                        setLoadingBranches(false);
                        setLoading(false);
                        return;
                    } else if (fetchedBranches.length === 1) {
                        user.branchId = fetchedBranches[0].id;
                        user.branch = fetchedBranches[0];
                    }
                } catch (err) {
                    console.error("Gagal memuat daftar cabang:", err);
                }
                setLoadingBranches(false);
            }

            // --- PENYIMPANAN SESI AMAN (MENCEGAH CRASH) ---
            // Pastikan tidak mengirim nilai undefined ke AsyncStorage
            await Promise.all([
                AsyncStorage.setItem('token', token),
                AsyncStorage.setItem('refreshToken', refreshToken || ""),
                AsyncStorage.setItem('user', JSON.stringify(user))
            ]);

            navigation.replace('Dashboard');

        } catch (error: any) {
            // Tampilkan pesan error spesifik dari server jika tersedia
            const msg = error.response?.data?.message || "Gagal terhubung ke server (Periksa URL atau Koneksi)";
            showToast(msg, "error");
            setLoading(false);
        }
    };

    // --- HANDLER SAAT CABANG DIPILIH DARI POP-UP ---
    const handleSelectBranch = async (selectedBranch: any) => {
        if (!tempAuthData) return;
        setShowBranchModal(false);
        setLoading(true);

        const updatedUser = {
            ...tempAuthData.user,
            branchId: selectedBranch.id,
            branch: selectedBranch
        };

        await Promise.all([
            AsyncStorage.setItem('token', tempAuthData.token),
            AsyncStorage.setItem('refreshToken', tempAuthData.refreshToken),
            AsyncStorage.setItem('user', JSON.stringify(updatedUser))
        ]);

        navigation.replace('Dashboard');
    };

    // ==========================================
    // UI HALAMAN 404 NOT FOUND (Elegan & Interaktif)
    // ==========================================
    if (tenantStatus === 'not_found') {
        return (
            <View className="items-center justify-center flex-1 bg-slate-900">
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Background Decoration */}
                <View className="absolute w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl -top-10 -left-10" />
                <View className="absolute w-64 h-64 rounded-full bg-rose-500/10 blur-3xl -bottom-10 -right-10" />

                <View className="items-center px-6">
                    <View className="items-center justify-center w-32 h-32 mb-6 border rounded-full bg-slate-800/50 border-slate-700/50 shadow-2xl">
                        <SearchX size={60} color="#94A3B8" />
                    </View>

                    <Text className="text-[80px] md:text-[100px] font-black tracking-tighter text-rose-500">
                        404
                    </Text>

                    <Text className="mt-4 text-2xl font-bold text-center text-white md:text-3xl">
                        CARI APAAN BANG??
                    </Text>

                    <Text className="mt-2 text-base font-medium text-center text-slate-400 md:text-lg">
                        SALAH SUBDOMAIN TUH, TIDAK TERDAFTAR!
                    </Text>

                    <TouchableOpacity
                        onPress={() => Platform.OS === 'web' ? window.location.reload() : null}
                        className="px-8 py-4 mt-12 border rounded-full bg-white/5 border-white/10 active:bg-white/10"
                    >
                        <Text className="text-sm font-bold tracking-widest text-white uppercase">Refresh Halaman</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Tampilkan Loading jika masih mengecek Tenant ATAU Setting belum terload
    if (tenantStatus === 'checking' || !settings.isLoaded) {
        return (
            <View className="items-center justify-center flex-1 bg-gray-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const primaryColor = settings.themePrimaryColor || '#4F46E5';
    const secondaryColor = settings.themeSecondaryColor || '#0F172A';

    const renderBranding = () => (
        <View className="relative items-center justify-center flex-1 w-full h-full overflow-hidden bg-slate-900">
            {settings.loginBgUrl ? (
                <ImageBackground source={{ uri: settings.loginBgUrl }} className="absolute w-full h-full" resizeMode="cover">
                    <LinearGradient colors={['rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.95)']} className="absolute w-full h-full" />
                </ImageBackground>
            ) : (
                <LinearGradient colors={[primaryColor, secondaryColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="absolute w-full h-full" />
            )}

            <View className="z-10 items-center w-full max-w-lg p-8">
                <View className="items-center justify-center w-24 h-24 mb-6 overflow-hidden border rounded-full shadow-2xl bg-white/10 backdrop-blur-xl border-white/20">
                    {settings.logoUrl ? (
                        <Image source={{ uri: settings.logoUrl }} className="w-full h-full" resizeMode="cover" />
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

    const renderForm = () => (
        <ScrollView showsVerticalScrollIndicator={false} className="w-full max-w-sm">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-slate-800">Selamat Datang</Text>
                <Text className="mt-2 text-base text-slate-500">
                    Masuk untuk mengelola {settings.storeName}
                </Text>
            </View>

            {/* ========================================== */}
            {/* UI PERINGATAN TENANT TIDAK AKTIF / SUSPEND  */}
            {/* ========================================== */}
            {tenantStatus === 'inactive' && (
                <View className="p-4 mb-6 bg-red-50 border border-red-200 rounded-2xl">
                    <View className="flex-row items-center mb-2">
                        <AlertCircle color="#EF4444" size={20} />
                        <Text className="ml-2 font-bold text-red-600">Akses Tenant Dinonaktifkan</Text>
                    </View>
                    <Text className="text-sm leading-5 text-red-700">
                        Tenant Dinonaktifkan karena ada tagihan menunggu atau belum lunas. Mohon lakukan pembayaran terlebih dahulu melalui Control Plane.
                    </Text>
                </View>
            )}

            <View style={{ opacity: tenantStatus === 'inactive' ? 0.6 : 1 }}>
                <MyInput
                    label="Email"
                    placeholder="admin@example.com"
                    value={email}
                    onChangeText={setEmail}
                    icon={<Mail size={20} color="#64748B" />}
                    autoCapitalize="none"
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    editable={tenantStatus !== 'inactive'}
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
                        editable={tenantStatus !== 'inactive'}
                    />
                    <TouchableOpacity className="self-end mt-2" disabled={tenantStatus === 'inactive'}>
                        <Text className="text-sm font-medium" style={{ color: tenantStatus === 'inactive' ? '#94A3B8' : primaryColor }}>
                            Lupa Password?
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading || loadingBranches || tenantStatus === 'inactive'}
                className={`flex-row items-center justify-center mt-8 transition-all transform h-14 rounded-2xl ${tenantStatus === 'inactive' ? 'bg-slate-300' : 'shadow-lg shadow-blue-900/20 active:scale-95'
                    }`}
                style={{ backgroundColor: tenantStatus === 'inactive' ? '#CBD5E1' : primaryColor }}
            >
                {loading || loadingBranches ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Text className="mr-2 text-lg font-bold text-white">
                            {tenantStatus === 'inactive' ? 'Akses Terkunci' : 'Masuk Aplikasi'}
                        </Text>
                        {tenantStatus !== 'inactive' && <ArrowRight color="white" size={20} strokeWidth={2.5} />}
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

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <CustomToast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            {/* --- MODAL POP-UP PEMILIHAN CABANG --- */}
            <Modal visible={showBranchModal} transparent animationType="slide">
                <View className="items-center justify-center flex-1 px-4 bg-black/60 backdrop-blur-sm">
                    <View className="w-full max-w-md p-6 bg-white rounded-[28px] shadow-2xl max-h-[80%]">
                        <Text className="mb-2 text-xl font-black tracking-tight text-center text-slate-900">Pilih Cabang Aktif</Text>
                        <Text className="mb-6 text-xs text-center text-slate-500">
                            Akun Anda memiliki akses ke beberapa cabang. Silakan pilih cabang yang ingin Anda kelola saat ini.
                        </Text>

                        <FlatList
                            data={branches}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectBranch(item)}
                                    className="flex-row items-center justify-between p-4 mb-3 border border-slate-100 bg-slate-50 rounded-2xl active:bg-indigo-50 active:border-indigo-100"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View className="items-center justify-center w-10 h-10 mr-3 bg-white border rounded-full border-slate-200">
                                            <MapPin size={18} color={primaryColor} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-slate-800">{item.name}</Text>
                                            {item.address && <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>{item.address}</Text>}
                                        </View>
                                    </View>
                                    <ArrowRight size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {isLargeScreen ? (
                <View className="flex-row flex-1">
                    <View className="flex-1">
                        {renderBranding()}
                    </View>
                    <View className="items-center justify-center flex-1 p-12 bg-white">
                        {renderForm()}
                    </View>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
                        <View className="h-[45vh] w-full relative">
                            {renderBranding()}
                        </View>
                        <View className="flex-1 bg-white -mt-10 rounded-t-[30px] px-6 pt-10 pb-6 items-center shadow-2xl">
                            {renderForm()}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}