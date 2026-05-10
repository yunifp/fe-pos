import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { User, Lock, KeyRound, ChevronRight, LogOut, X, ShieldCheck } from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';

export default function ProfileScreen() {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();

    // State Data User
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // State Modals
    const [modalType, setModalType] = useState<'PROFILE' | 'PASSWORD' | 'PIN' | null>(null);

    // Form States
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [verifyPassword, setVerifyPassword] = useState('');
    const [newPin, setNewPin] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                setUser(parsed);

                // MAPPING LOAD: Ambil 'name' dari storage (sesuai request Anda), masukkan ke state 'fullName'
                setFullName(parsed.name || parsed.fullName || '');
                setEmail(parsed.email || '');
                setPhone(parsed.phone || '');
            }
        } catch (e) {
            console.error("Gagal load user", e);
        }
    };

    const handleLogout = () => {
        Alert.alert("Konfirmasi", "Yakin ingin keluar aplikasi?", [
            { text: "Batal", style: "cancel" },
            {
                text: "Keluar",
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
            }
        ]);
    };

    // --- LOGIKA API ---

    const updateProfile = async () => {
        const safeName = fullName ? fullName.trim() : "";
        const safeEmail = email ? email.trim() : "";

        if (!safeName || !safeEmail) {
            return Alert.alert("Validasi", "Nama dan Email wajib diisi");
        }

        setLoading(true);
        try {
            // Hit API Backend
            const res = await api.put('/users/profile/update', {
                fullName: safeName, // Kirim sebagai fullName ke backend
                email: safeEmail,
                phone: phone
            });

            const serverData = res.data.user; // Ini punya 'fullName' dari DB

            // MAPPING SAVE: 
            // Kita buat object baru untuk disimpan ke AsyncStorage
            // Kita paksa isi properti 'name' dengan nilai 'fullName' dari server
            const updatedUserForStorage = {
                ...user,
                ...serverData,
                name: serverData.fullName // <-- PENTING: Simpan sebagai 'name' di storage
            };

            setUser(updatedUserForStorage);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserForStorage));

            Alert.alert("Sukses", "Profil berhasil diperbarui");
            setModalType(null);
        } catch (e: any) {
            console.error(e);
            Alert.alert("Gagal", e.response?.data?.message || "Gagal update profil");
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async () => {
        if (!oldPassword || !newPassword) return Alert.alert("Validasi", "Isi password lama dan baru");

        setLoading(true);
        try {
            await api.put('/users/profile/change-password', { oldPassword, newPassword });
            Alert.alert("Sukses", "Password berhasil diubah. Silakan login ulang.");
            await AsyncStorage.multiRemove(['token', 'user']);
            navigation.replace('Login');
        } catch (e: any) {
            Alert.alert("Gagal", e.response?.data?.message || "Password lama salah");
        } finally {
            setLoading(false);
        }
    };

    const changePin = async () => {
        if (!verifyPassword || newPin.length !== 6) return Alert.alert("Validasi", "Password wajib diisi dan PIN harus 6 digit angka");

        setLoading(true);
        try {
            await api.put('/users/profile/change-pin', { password: verifyPassword, newPin });
            Alert.alert("Sukses", "PIN Akses berhasil diperbarui");
            setModalType(null);
            setVerifyPassword('');
            setNewPin('');
        } catch (e: any) {
            Alert.alert("Gagal", e.response?.data?.message || "Password verifikasi salah");
        } finally {
            setLoading(false);
        }
    };

    // --- UI HELPER ---
    // Pastikan UI menampilkan 'name' (karena di storage Anda 'name')
    const getDisplayName = () => user?.name || user?.fullName || 'User';
    const getInitial = () => getDisplayName().charAt(0).toUpperCase();

    // --- UI COMPONENTS ---
    const MenuItem = ({ icon, title, subtitle, onPress, isDanger = false }: any) => (
        <TouchableOpacity onPress={onPress} className="flex-row items-center p-4 mb-3 bg-white border shadow-sm border-slate-100 rounded-2xl active:bg-slate-50">
            <View className={`p-3 rounded-xl mr-4 ${isDanger ? 'bg-rose-50' : 'bg-slate-50'}`}>
                {icon}
            </View>
            <View className="flex-1">
                <Text className={`text-sm font-bold ${isDanger ? 'text-rose-600' : 'text-slate-700'}`}>{title}</Text>
                {subtitle && <Text className="text-xs text-slate-400 mt-0.5">{subtitle}</Text>}
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <MainLayout>
            <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24 }}>

                <Text className="mb-6 text-2xl font-black text-slate-800">Profil Pengguna</Text>

                <View className="items-center p-6 mb-8 bg-white border shadow-sm rounded-3xl border-slate-100">
                    <View className="items-center justify-center w-24 h-24 mb-4 bg-indigo-100 rounded-full">
                        <Text className="text-4xl font-black text-indigo-600">{getInitial()}</Text>
                    </View>
                    <Text className="text-xl font-black text-slate-800">{getDisplayName()}</Text>
                    <Text className="text-xs font-medium text-slate-400">{user?.email}</Text>
                    {user?.phone ? <Text className="mb-3 text-xs font-medium text-slate-400">{user.phone}</Text> : null}

                    <View className="flex-row mt-2">
                        <View className="px-3 py-1 mr-2 rounded-full bg-slate-100">
                            <Text className="text-xs font-bold uppercase text-slate-500">{user?.role}</Text>
                        </View>
                        <View className="px-3 py-1 rounded-full bg-indigo-50">
                            <Text className="text-xs font-bold text-indigo-600">{user?.branch?.name || 'Semua Cabang'}</Text>
                        </View>
                    </View>
                </View>

                <Text className="mb-3 text-xs font-bold tracking-widest uppercase text-slate-400">Akun & Keamanan</Text>

                <MenuItem
                    icon={<User size={20} color="#4F46E5" />}
                    title="Edit Informasi Profil"
                    subtitle="Ubah nama, email, dan telepon"
                    onPress={() => {
                        setFullName(user?.name || user?.fullName || '');
                        setEmail(user?.email || '');
                        setPhone(user?.phone || '');
                        setModalType('PROFILE');
                    }}
                />

                <MenuItem
                    icon={<Lock size={20} color="#F59E0B" />}
                    title="Ganti Password"
                    subtitle="Perbarui kata sandi akun Anda"
                    onPress={() => {
                        setOldPassword(''); setNewPassword('');
                        setModalType('PASSWORD');
                    }}
                />

                <MenuItem
                    icon={<KeyRound size={20} color="#10B981" />}
                    title="Ganti PIN Akses"
                    subtitle="PIN 6 digit untuk akses cepat"
                    onPress={() => {
                        setVerifyPassword(''); setNewPin('');
                        setModalType('PIN');
                    }}
                />

                <View className="h-6" />

                <MenuItem
                    icon={<LogOut size={20} color="#F43F5E" />}
                    title="Keluar Aplikasi"
                    isDanger
                    onPress={handleLogout}
                />

            </ScrollView>

            <Modal visible={!!modalType} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="justify-end flex-1 bg-black/50">
                    <View className="bg-white rounded-t-[32px] p-6 pb-10">

                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-black text-slate-800">
                                {modalType === 'PROFILE' ? 'Edit Profil' : modalType === 'PASSWORD' ? 'Ganti Password' : 'Ganti PIN'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalType(null)} className="p-2 rounded-full bg-slate-100">
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* --- FORM 1: EDIT PROFILE --- */}
                        {modalType === 'PROFILE' && (
                            <View>
                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Nama Lengkap</Text>
                                <TextInput
                                    className="h-12 px-4 mb-4 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    value={fullName} onChangeText={setFullName}
                                />

                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Email Login</Text>
                                <TextInput
                                    className="h-12 px-4 mb-4 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                                />

                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">No. Telepon</Text>
                                <TextInput
                                    className="h-12 px-4 mb-6 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08..."
                                />

                                <TouchableOpacity onPress={updateProfile} disabled={loading} className="items-center justify-center bg-indigo-600 shadow-lg h-14 rounded-2xl shadow-indigo-200">
                                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">SIMPAN PERUBAHAN</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* --- FORM 2: GANTI PASSWORD --- */}
                        {modalType === 'PASSWORD' && (
                            <View>
                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Password Lama</Text>
                                <TextInput
                                    className="h-12 px-4 mb-4 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    secureTextEntry value={oldPassword} onChangeText={setOldPassword}
                                />

                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Password Baru</Text>
                                <TextInput
                                    className="h-12 px-4 mb-6 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    secureTextEntry value={newPassword} onChangeText={setNewPassword}
                                />

                                <TouchableOpacity onPress={changePassword} disabled={loading} className="items-center justify-center bg-indigo-600 shadow-lg h-14 rounded-2xl shadow-indigo-200">
                                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">UPDATE PASSWORD</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* --- FORM 3: GANTI PIN --- */}
                        {modalType === 'PIN' && (
                            <View>
                                <View className="flex-row items-center p-3 mb-4 bg-yellow-50 rounded-xl">
                                    <ShieldCheck size={18} color="#D97706" />
                                    <Text className="flex-1 ml-2 text-xs text-yellow-700">
                                        Masukkan password akun Anda untuk verifikasi keamanan sebelum mengganti PIN.
                                    </Text>
                                </View>

                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">Verifikasi Password</Text>
                                <TextInput
                                    className="h-12 px-4 mb-4 border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    secureTextEntry value={verifyPassword} onChangeText={setVerifyPassword} placeholder="Masukan password Anda"
                                />

                                <Text className="mb-2 text-xs font-bold uppercase text-slate-500">PIN Baru (6 Angka)</Text>
                                <TextInput
                                    className="h-12 px-4 mb-6 text-lg font-black text-center border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                    keyboardType="numeric" maxLength={6} secureTextEntry value={newPin} onChangeText={setNewPin} placeholder="------"
                                />

                                <TouchableOpacity onPress={changePin} disabled={loading} className="items-center justify-center bg-indigo-600 shadow-lg h-14 rounded-2xl shadow-indigo-200">
                                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">SIMPAN PIN BARU</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </MainLayout>
    );
}