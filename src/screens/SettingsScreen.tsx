import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, useWindowDimensions } from 'react-native';
import { useSettingStore } from '../stores/settingStore';
import MainLayout from '../components/MainLayout';
import { CustomToast } from '../components/CustomToast';
import ModernColorPicker from '../components/ModernColorPicker';
import { Save, Store, Palette, Percent, Phone, Image as ImageIcon, ChevronRight, Star, Mail } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/api';

// --- Reusable Input Component ---
const SettingInput = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: any) => (
    <View className="mb-3">
        <Text className="text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">{label}</Text>
        <TextInput
            className={`bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-slate-800 text-sm font-semibold ${multiline ? 'h-20 py-2' : 'h-11'}`}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            keyboardType={keyboardType}
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
        />
    </View>
);

export default function SettingsScreen() {
    const { settings, fetchSettings, updateSettings, isLoading } = useSettingStore();
    const { width } = useWindowDimensions();

    // BREAKPOINTS TEROPTIMASI
    const isTabletOrDesktop = width >= 768;
    const isLargeDesktop = width >= 1280;

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [pickerVisible, setPickerVisible] = useState(false);
    const [activeColorField, setActiveColorField] = useState<'themePrimaryColor' | 'themeSecondaryColor' | null>(null);

    const [form, setForm] = useState<any>({
        appName: '', storeName: '', tagline: '', logoUrl: null, loginBgUrl: null,
        themePrimaryColor: '#4F46E5', themeSecondaryColor: '#F59E0B',
        taxRate: '', serviceChargeRate: '', address: '', phone: '', email: '', website: '',
        pointsPerAmount: '', pointsEarned: '', pointValue: '', minOrderToEarn: '',
        maxRedeemPercent: '', isActive: true,
    });

    useEffect(() => { fetchSettings(); }, []);

    useEffect(() => {
        if (settings && settings.isLoaded) {
            setForm({
                appName: settings.appName || '',
                storeName: settings.storeName || '',
                tagline: settings.tagline || '',
                logoUrl: settings.logoUrl || null,
                loginBgUrl: settings.loginBgUrl || null,
                themePrimaryColor: settings.themePrimaryColor || '#4F46E5',
                themeSecondaryColor: settings.themeSecondaryColor || '#F59E0B',
                taxRate: settings.taxRate?.toString() || '0',
                serviceChargeRate: settings.serviceChargeRate?.toString() || '0',
                address: settings.address || '',
                phone: settings.phone || '',
                email: settings.email || '',
                website: settings.website || '',
                pointsPerAmount: settings.pointsPerAmount?.toString() || '10000',
                pointsEarned: settings.pointsEarned?.toString() || '1',
                pointValue: settings.pointValue?.toString() || '1',
                minOrderToEarn: settings.minOrderToEarn?.toString() || '0',
                maxRedeemPercent: settings.maxRedeemPercent?.toString() || '50',
                isActive: settings.isActive ?? true,
            });
        }
    }, [settings]);

    const handleChange = (key: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [key]: value }));
    };

    const pickImage = async (field: 'logoUrl' | 'loginBgUrl') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Izin Ditolak', 'Butuh akses galeri.');
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: field === 'logoUrl' ? [1, 1] : [9, 16],
            quality: 0.7,
        });
        if (!result.canceled) handleChange(field, result.assets[0].uri);
    };

    const handleSave = async () => {
        try {
            await updateSettings(form);
            setToast({ visible: true, message: 'Pengaturan berhasil disimpan!', type: 'success' });
        } catch (error) {
            setToast({ visible: true, message: 'Gagal menyimpan pengaturan.', type: 'error' });
        }
    };

    const openColorPicker = (field: 'themePrimaryColor' | 'themeSecondaryColor') => {
        setActiveColorField(field);
        setPickerVisible(true);
    };

    const onColorSelected = (hex: string) => {
        if (activeColorField) handleChange(activeColorField, hex);
    };

    const SectionHeader = ({ icon: Icon, title, colorBg, colorIcon }: any) => (
        <View className="flex-row items-center mb-4">
            <View className={`p-2 mr-3 rounded-xl ${colorBg}`}><Icon size={18} color={colorIcon} /></View>
            <Text className="text-base font-black text-slate-800 tracking-tight">{title}</Text>
        </View>
    );

    return (
        <MainLayout>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <View className="flex-1 bg-slate-50">
                    <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                    {/* Header - Fixed & Centered */}
                    <View className="bg-white border-b border-slate-100 px-6 py-6 items-center">
                        <View className="w-full max-w-7xl flex-row justify-between items-center">
                            <View>
                                <Text className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Pengaturan</Text>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Konfigurasi Toko & Branding</Text>
                            </View>
                            {isTabletOrDesktop && (
                                <TouchableOpacity onPress={handleSave} disabled={isLoading} className="bg-indigo-600 px-6 py-2.5 rounded-xl flex-row items-center shadow-lg active:scale-95">
                                    {isLoading ? <ActivityIndicator size="small" color="white" /> : <><Save size={16} color="white" /><Text className="ml-2 text-xs font-black text-white uppercase tracking-widest">Simpan</Text></>}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View className="items-center w-full px-4 md:px-8 py-6">
                            <View className={`w-full max-w-7xl flex-row flex-wrap justify-between`}>

                                {/* KOLOM KIRI */}
                                <View style={{ width: isTabletOrDesktop ? '49%' : '100%' }}>
                                    {/* Branding */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <SectionHeader icon={ImageIcon} title="Visual Toko" colorBg="bg-indigo-50" colorIcon="#4F46E5" />
                                        <View className="flex-row justify-around items-center py-2">
                                            <TouchableOpacity onPress={() => pickImage('logoUrl')} className="items-center">
                                                <View className="relative w-24 h-24 overflow-hidden border-2 border-slate-200 border-dashed rounded-full bg-slate-50 items-center justify-center">
                                                    {form.logoUrl ? <Image source={{ uri: form.logoUrl }} className="w-full h-full" /> : <Text className="text-[10px] font-bold text-slate-300">LOGO</Text>}
                                                    <View className="absolute bottom-0 w-full py-1 bg-black/40"><Text className="text-[8px] text-white font-black text-center">UBAH</Text></View>
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => pickImage('loginBgUrl')} className="items-center">
                                                <View className="relative w-20 h-32 overflow-hidden border-2 border-slate-200 border-dashed rounded-2xl bg-slate-50 items-center justify-center">
                                                    {form.loginBgUrl ? <Image source={{ uri: form.loginBgUrl }} className="w-full h-full" /> : <Text className="text-[10px] font-bold text-slate-300">BG LOGIN</Text>}
                                                    <View className="absolute bottom-0 w-full py-1 bg-black/40"><Text className="text-[8px] text-white font-black text-center">UBAH</Text></View>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Theme */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <SectionHeader icon={Palette} title="Tema Aplikasi" colorBg="bg-orange-50" colorIcon="#F59E0B" />
                                        <View className="flex-row gap-3">
                                            <TouchableOpacity onPress={() => openColorPicker('themePrimaryColor')} className="flex-1 p-3 border border-slate-100 bg-slate-50 rounded-2xl items-center">
                                                <View className="w-8 h-8 rounded-full mb-2 shadow-sm border border-white" style={{ backgroundColor: form.themePrimaryColor }} />
                                                <Text className="text-[8px] font-black text-slate-400 uppercase">Primary</Text>
                                                <Text className="text-[10px] font-bold text-slate-800">{form.themePrimaryColor}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => openColorPicker('themeSecondaryColor')} className="flex-1 p-3 border border-slate-100 bg-slate-50 rounded-2xl items-center">
                                                <View className="w-8 h-8 rounded-full mb-2 shadow-sm border border-white" style={{ backgroundColor: form.themeSecondaryColor }} />
                                                <Text className="text-[8px] font-black text-slate-400 uppercase">Secondary</Text>
                                                <Text className="text-[10px] font-bold text-slate-800">{form.themeSecondaryColor}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Tax & Service */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <SectionHeader icon={Percent} title="Biaya & Pajak" colorBg="bg-emerald-50" colorIcon="#10B981" />
                                        <View className="flex-row gap-4">
                                            <View className="flex-1"><SettingInput label="Pajak (%)" value={form.taxRate} onChangeText={(t: string) => handleChange('taxRate', t)} keyboardType="numeric" /></View>
                                            <View className="flex-1"><SettingInput label="Service (%)" value={form.serviceChargeRate} onChangeText={(t: string) => handleChange('serviceChargeRate', t)} keyboardType="numeric" /></View>
                                        </View>
                                    </View>
                                </View>

                                {/* KOLOM KANAN */}
                                <View style={{ width: isTabletOrDesktop ? '49%' : '100%' }}>
                                    {/* Info Umum */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <SectionHeader icon={Store} title="Informasi Bisnis" colorBg="bg-blue-50" colorIcon="#3B82F6" />
                                        <SettingInput label="Nama Aplikasi" value={form.appName} onChangeText={(t: string) => handleChange('appName', t)} />
                                        <SettingInput label="Nama Store" value={form.storeName} onChangeText={(t: string) => handleChange('storeName', t)} />
                                        <SettingInput label="Tagline" value={form.tagline} onChangeText={(t: string) => handleChange('tagline', t)} />
                                    </View>

                                    {/* Loyalty */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-center">
                                                <View className="p-2 mr-3 rounded-xl bg-yellow-50"><Star size={18} color="#F59E0B" /></View>
                                                <Text className="text-base font-black text-slate-800 tracking-tight">Loyalty Member</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleChange('isActive', !form.isActive)}
                                                className={`px-3 py-1 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <Text className="text-[9px] font-black text-white">{form.isActive ? 'AKTIF' : 'OFF'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View className="flex-row gap-3">
                                            <View className="flex-1"><SettingInput label="Setiap (Rp)" value={form.pointsPerAmount} onChangeText={(t: string) => handleChange('pointsPerAmount', t)} keyboardType="numeric" /></View>
                                            <View className="flex-1"><SettingInput label="Dapat Poin" value={form.pointsEarned} onChangeText={(t: string) => handleChange('pointsEarned', t)} keyboardType="numeric" /></View>
                                        </View>
                                        <View className="flex-row gap-3">
                                            <View className="flex-1"><SettingInput label="Nilai 1 Poin" value={form.pointValue} onChangeText={(t: string) => handleChange('pointValue', t)} keyboardType="numeric" /></View>
                                            <View className="flex-1"><SettingInput label="Max Redeem %" value={form.maxRedeemPercent} onChangeText={(t: string) => handleChange('maxRedeemPercent', t)} keyboardType="numeric" /></View>
                                        </View>
                                    </View>

                                    {/* Kontak */}
                                    <View className="p-6 mb-5 bg-white border border-slate-100 shadow-sm rounded-[32px]">
                                        <SectionHeader icon={Phone} title="Kontak & Alamat" colorBg="bg-rose-50" colorIcon="#F43F5E" />
                                        <SettingInput label="Alamat Toko" value={form.address} onChangeText={(t: string) => handleChange('address', t)} multiline />
                                        <View className="flex-row gap-3">
                                            <View className="flex-1"><SettingInput label="WhatsApp" value={form.phone} onChangeText={(t: string) => handleChange('phone', t)} keyboardType="phone-pad" /></View>
                                            <View className="flex-1"><SettingInput label="Email" value={form.email} onChangeText={(t: string) => handleChange('email', t)} keyboardType="email-address" /></View>
                                        </View>
                                    </View>
                                </View>

                            </View>
                        </View>
                    </ScrollView>

                    {/* Mobile Save Button (Hanya tampil di HP) */}
                    {!isTabletOrDesktop && (
                        <View className="absolute bottom-0 w-full p-4 bg-white/90 border-t border-slate-100">
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isLoading}
                                className="flex-row items-center justify-center h-14 rounded-2xl bg-indigo-600 shadow-lg active:scale-95"
                                style={{ shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}>
                                {isLoading ? <ActivityIndicator color="white" /> : <><Save color="white" size={20} /><Text className="ml-3 text-base font-black text-white uppercase tracking-widest">Simpan Perubahan</Text></>}
                            </TouchableOpacity>
                        </View>
                    )}

                    <ModernColorPicker
                        visible={pickerVisible}
                        initialColor={activeColorField ? form[activeColorField] : '#000000'}
                        onClose={() => setPickerVisible(false)}
                        onSelect={onColorSelected}
                    />
                </View>
            </KeyboardAvoidingView>
        </MainLayout>
    );
}