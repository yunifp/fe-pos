import React, { useState, useEffect, createElement } from 'react'; // Tambah createElement
import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
    useWindowDimensions, Keyboard, TouchableWithoutFeedback, ViewStyle
} from 'react-native';
import { X, Check, MapPin, Phone, Store, Globe, Crosshair, Map } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import LocationPickerModal from './LocationPickerModal';
import MyInput from './MyInput';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function BranchFormModal({ visible, onClose, onSubmit, initialData }: Props) {
    const { settings } = useSettingStore();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const isLarge = windowWidth >= 768;

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        address: '',
        phone: '',
        latitude: '0',
        longitude: '0',
        radius: '50'
    });

    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setFormData({
                    id: initialData.id || '',
                    name: initialData.name || '',
                    address: initialData.address || '',
                    phone: initialData.phone || '',
                    latitude: String(initialData.latitude || '0'),
                    longitude: String(initialData.longitude || '0'),
                    radius: String(initialData.radius || '50')
                });
            } else {
                setFormData({ id: '', name: '', address: '', phone: '', latitude: '0', longitude: '0', radius: '50' });
            }
        }
    }, [visible, initialData]);

    const handleSave = async () => {
        if (!formData.name.trim()) return Alert.alert("Validasi", "Nama cabang wajib diisi.");
        if (!formData.phone.trim()) return Alert.alert("Validasi", "Nomor telepon wajib diisi.");
        if (!formData.address.trim()) return Alert.alert("Validasi", "Alamat cabang wajib diisi.");

        setLoading(true);
        try {
            const payload = {
                ...formData,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                radius: parseInt(formData.radius)
            };
            await onSubmit(payload);
            onClose();
        } catch (e) {
            Alert.alert("Error", "Gagal menyimpan data cabang.");
        } finally {
            setLoading(false);
        }
    };

    const handleLocationSelect = (coords: { latitude: number; longitude: number }) => {
        setFormData(prev => ({
            ...prev,
            latitude: String(coords.latitude),
            longitude: String(coords.longitude)
        }));
    };

    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    // --- STYLE UNTUK CREATE ELEMENT (WEB) ---
    const webInputStyle = {
        width: '100%',
        height: 50,
        padding: '0 16px',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        outline: 'none',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit'
    };

    const modalLayout = isLarge
        ? { width: 550, maxHeight: windowHeight * 0.85, borderRadius: 32, alignSelf: 'center' as any }
        : { width: '100%', height: windowHeight * 0.94, borderTopLeftRadius: 40, borderTopRightRadius: 40 };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="items-center justify-center flex-1 p-4 bg-black/60 backdrop-blur-sm">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        className={`flex-1 w-full ${isLarge ? 'justify-center' : 'justify-end'}`}
                    >
                        <View style={modalLayout as ViewStyle} className="overflow-hidden bg-white border shadow-2xl border-slate-100">

                            <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                                <View>
                                    <Text className="text-xl italic font-black uppercase text-slate-900">
                                        {formData.id ? 'Edit' : 'Tambah'} Cabang
                                    </Text>
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Pengaturan Lokasi Outlet
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={onClose} className="p-2 bg-white border rounded-full shadow-sm border-slate-100">
                                    <X size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView className="p-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <View className="gap-y-1">
                                    {/* --- INPUT NAMA CABANG --- */}
                                    <View className="mb-4">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Cabang *</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('input', {
                                                placeholder: "Contoh: Cabang Jakarta Pusat",
                                                value: formData.name,
                                                onChange: (e: any) => setFormData({ ...formData, name: e.target.value }),
                                                style: webInputStyle
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="Contoh: Cabang Jakarta Pusat" value={formData.name} onChangeText={(text: string) => setFormData({ ...formData, name: text })} icon={<Store size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>

                                    {/* --- INPUT NOMOR TELEPON --- */}
                                    <View className="mb-4">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon *</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('input', {
                                                type: 'tel',
                                                placeholder: "0812xxxxxxxx",
                                                value: formData.phone,
                                                onChange: (e: any) => setFormData({ ...formData, phone: e.target.value }),
                                                style: webInputStyle
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="0812xxxxxxxx" value={formData.phone} keyboardType="phone-pad" onChangeText={(text: string) => setFormData({ ...formData, phone: text })} icon={<Phone size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>

                                    {/* --- INPUT ALAMAT LENGKAP (TEXTAREA) --- */}
                                    <View className="mb-4">
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Lengkap *</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('textarea', {
                                                placeholder: "Masukkan alamat fisik cabang...",
                                                value: formData.address,
                                                rows: 3,
                                                onChange: (e: any) => setFormData({ ...formData, address: e.target.value }),
                                                style: { ...webInputStyle, height: 'auto', padding: '12px 16px' }
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="Masukkan alamat fisik cabang..." value={formData.address} multiline numberOfLines={3} onChangeText={(text: string) => setFormData({ ...formData, address: text })} icon={<MapPin size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>

                                    <View className="p-4 mt-4 mb-6 border bg-slate-50 rounded-2xl border-slate-100">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-center">
                                                <Globe size={16} color="#10B981" />
                                                <Text className="ml-2 text-[10px] font-black text-slate-700 uppercase">Titik Koordinat</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setShowMapPicker(true)} className="flex-row items-center px-3 py-1.5 bg-indigo-600 rounded-lg shadow-sm">
                                                <Map size={14} color="white" />
                                                <Text className="ml-1.5 text-[10px] font-black text-white uppercase">Buka Peta</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View className="flex-row gap-3">
                                            <View className="flex-1">
                                                <Text className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Latitude</Text>
                                                <View className="justify-center h-10 px-3 bg-white border border-slate-200 rounded-xl">
                                                    <Text className="text-xs font-bold text-slate-500">{formData.latitude}</Text>
                                                </View>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Longitude</Text>
                                                <View className="justify-center h-10 px-3 bg-white border border-slate-200 rounded-xl">
                                                    <Text className="text-xs font-bold text-slate-500">{formData.longitude}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* --- INPUT RADIUS ABSENSI --- */}
                                        <View className="mt-4">
                                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Radius Absensi (Meter)</Text>
                                            {Platform.OS === 'web' ? (
                                                createElement('input', {
                                                    type: 'number',
                                                    placeholder: "50",
                                                    value: formData.radius,
                                                    onChange: (e: any) => setFormData({ ...formData, radius: e.target.value }),
                                                    style: webInputStyle
                                                })
                                            ) : (
                                                <MyInput label="" placeholder="50" value={formData.radius} keyboardType="numeric" onChangeText={(text: string) => setFormData({ ...formData, radius: text })} icon={<Crosshair size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <View className="h-10" />
                            </ScrollView>

                            <View className="flex-row gap-3 p-5 bg-white border-t border-slate-50">
                                <TouchableOpacity onPress={onClose} className="items-center justify-center flex-1 h-12 rounded-xl bg-slate-100 active:bg-slate-200">
                                    <Text className="font-black text-slate-400 text-[10px] uppercase">Batal</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleSave} disabled={loading} className="flex-[2] h-12 rounded-xl items-center justify-center shadow-lg active:scale-95" style={{ backgroundColor: primaryColor }}>
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <Check size={18} color="white" />
                                            <Text className="text-white font-black uppercase text-[10px] tracking-[1px] ml-2">Simpan Cabang</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>

                <LocationPickerModal
                    visible={showMapPicker}
                    onClose={() => setShowMapPicker(false)}
                    onSelect={handleLocationSelect}
                    initialLocation={formData.latitude !== '0' ? { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) } : undefined}
                />
            </View>
        </Modal>
    );
}