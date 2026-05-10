import React, { useState, useEffect, createElement, useMemo, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, useWindowDimensions, Image } from 'react-native';
import { X, Check, UploadCloud, Camera as CameraIcon, Clock, RefreshCw } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import InputField from './InputField';
import { useSettingStore } from '../stores/settingStore'; // <--- IMPORT SETTING STORE

// --- UNIVERSAL CAMERA LOCAL COMPONENT TETAP SAMA ---
const UniversalCamera = ({ visible, onClose, onCaptured }: any) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<any>('back');
    const cameraRef = useRef<any>(null);

    if (!visible) return null;
    if (!permission || !permission.granted) {
        return (
            <Modal visible={visible}>
                <View className="items-center justify-center flex-1 p-6 bg-white">
                    <Text className="mb-4 font-bold text-center">Butuh izin kamera untuk lanjut.</Text>
                    <TouchableOpacity onPress={requestPermission} className="px-8 py-3 bg-indigo-600 rounded-xl"><Text className="font-bold text-white">Beri Izin</Text></TouchableOpacity>
                </View>
            </Modal>
        );
    }
    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            onCaptured(photo.uri);
            onClose();
        }
    };
    return (
        <Modal visible={visible} animationType="slide">
            <View className="flex-1 bg-black">
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
                    <View className="justify-between flex-1 p-8">
                        <TouchableOpacity onPress={onClose} className="items-center justify-center w-10 h-10 rounded-full bg-black/50"><X color="white" size={24} /></TouchableOpacity>
                        <View className="flex-row items-center justify-around pb-10">
                            <TouchableOpacity onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} className="items-center justify-center rounded-full w-14 h-14 bg-white/20"><RefreshCw color="white" size={24} /></TouchableOpacity>
                            <TouchableOpacity onPress={takePicture} className="items-center justify-center w-20 h-20 bg-white border-8 rounded-full border-white/30" />
                            <View className="w-14 h-14" />
                        </View>
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
};

export default function ExpenseFormModal({ visible, onClose, onSubmit, initialData, suggestions, userRole, isSaving }: any) {
    const { width, height } = useWindowDimensions();
    const isTablet = width >= 768;

    // --- AMBIL TEMA WARNA ---
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    const [form, setForm] = useState({ amount: '', category: 'BELANJA', description: '', date: moment().format('YYYY-MM-DD'), receiptUrl: '' });
    const [showCamera, setShowCamera] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setForm({
                    amount: initialData.amount.toString(),
                    category: initialData.category || 'BELANJA',
                    description: initialData.description,
                    date: moment(initialData.date).format('YYYY-MM-DD'),
                    receiptUrl: initialData.receiptUrl ? initialData.receiptUrl : ''
                });
            } else {
                setForm({ amount: '', category: 'BELANJA', description: '', date: moment().format('YYYY-MM-DD'), receiptUrl: '' });
            }
            setShowSuggestions(false);
        }
    }, [visible, initialData]);

    const filteredSuggestions = useMemo(() => {
        if (!form.description || initialData) return [];
        return suggestions.filter((s: any) =>
            s.keterangan.toLowerCase().includes(form.description.toLowerCase()) &&
            s.keterangan.toLowerCase() !== form.description.toLowerCase()
        ).slice(0, 5);
    }, [form.description, suggestions, initialData]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (!result.canceled) setForm({ ...form, receiptUrl: result.assets[0].uri });
    };

    const handleSave = () => {
        if (!form.amount || Number(form.amount) <= 0) return Alert.alert("Validasi", "Nominal tidak valid.");
        if (!form.description) return Alert.alert("Validasi", "Keterangan wajib diisi.");
        onSubmit(form);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowSuggestions(false); }}>
                <View className="justify-center flex-1 p-4 bg-black/80">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: isTablet ? 500 : '100%', maxHeight: '90%', alignSelf: 'center' }}>
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-[32px] overflow-hidden shadow-2xl flex-shrink">
                                
                                <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                                    <View>
                                        <Text className="text-lg italic font-black uppercase text-slate-900">{initialData ? 'Update Transaksi' : 'Catat Belanja'}</Text>
                                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pengeluaran Operasional</Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} className="p-2 bg-white border rounded-full border-slate-100"><X size={18} color="black" /></TouchableOpacity>
                                </View>

                                <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: height * 0.65 }}>
                                    
                                    <View className="relative z-50">
                                        <InputField 
                                            label="Keterangan Belanja" 
                                            isRequired={true} 
                                            placeholder="Beli token listrik..." 
                                            value={form.description} 
                                            onChangeText={(v: string) => { setForm({ ...form, description: v }); setShowSuggestions(true); }} 
                                        />
                                        
                                        {showSuggestions && filteredSuggestions.length > 0 && (
                                            <View className="absolute top-[70px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                                                {filteredSuggestions.map((item: any) => (
                                                    <TouchableOpacity 
                                                        key={item.id} 
                                                        onPress={() => { setForm({ ...form, description: item.keterangan, amount: Number(item.nominal).toString() }); setShowSuggestions(false); }} 
                                                        className="flex-row items-center justify-between p-4 border-b border-slate-50 active:bg-slate-50"
                                                    >
                                                        <View className="flex-row items-center flex-1">
                                                            <Clock size={12} color="#94A3B8" />
                                                            <Text className="ml-2 text-xs font-bold uppercase text-slate-700" numberOfLines={1}>{item.keterangan}</Text>
                                                        </View>
                                                        {/* Gunakan primaryColor untuk rekomendasi harga */}
                                                        <Text className="text-[9px] font-black ml-2" style={{ color: primaryColor }}>
                                                            Rp {Number(item.nominal).toLocaleString('id-ID')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <View className="-mt-1 z-10">
                                        <InputField label="Nominal (Rp)" isRequired={true} keyboardType="numeric" placeholder="0" value={form.amount} onChangeText={(v: string) => setForm({ ...form, amount: v.replace(/[^0-9]/g, '') })} />
                                    </View>

                                    <View className="mb-6 z-10">
                                        <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Waktu Transaksi</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('input', {
                                                type: 'date', value: form.date, disabled: userRole !== 'OWNER',
                                                onChange: (e: any) => setForm({ ...form, date: e.target.value }),
                                                style: { width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                            })
                                        ) : (
                                            <TouchableOpacity disabled={userRole !== 'OWNER'} onPress={() => setShowDatePicker(true)} className="flex-row items-center justify-between h-12 px-4 border bg-slate-50 rounded-xl border-slate-200">
                                                <Text className="text-sm font-semibold text-slate-700">{moment(form.date).format('DD/MM/YYYY')}</Text>
                                                <Clock size={16} color="#64748B" style={{ opacity: 0.5 }} />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View className="mb-6 z-10">
                                        <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Lampiran Nota</Text>
                                        <View className="items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                            {form.receiptUrl ? (
                                                <View className="items-center">
                                                    <Image source={{ uri: form.receiptUrl.startsWith('http') ? form.receiptUrl : form.receiptUrl }} className="w-16 h-16 mb-2 rounded-lg border border-slate-200" resizeMode="cover" />
                                                    <View className="flex-row mt-1 gap-x-6">
                                                        <TouchableOpacity onPress={pickImage}><Text style={{ color: primaryColor }} className="font-black text-[9px] uppercase tracking-widest">Galeri</Text></TouchableOpacity>
                                                        <TouchableOpacity onPress={() => setShowCamera(true)}><Text style={{ color: primaryColor }} className="font-black text-[9px] uppercase tracking-widest">Kamera</Text></TouchableOpacity>
                                                    </View>
                                                </View>
                                            ) : (
                                                <View className="flex-row justify-around w-full">
                                                    <TouchableOpacity onPress={pickImage} className="items-center"><UploadCloud size={24} color="#CBD5E1" /><Text className="mt-2 text-slate-400 font-black text-[8px] uppercase tracking-widest">Galeri</Text></TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setShowCamera(true)} className="items-center"><CameraIcon size={24} color="#CBD5E1" /><Text className="mt-2 text-slate-400 font-black text-[8px] uppercase tracking-widest">Kamera</Text></TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View className="h-4" />
                                </ScrollView>

                                <View className="p-4 bg-white border-t border-slate-50">
                                    <TouchableOpacity 
                                        onPress={handleSave} 
                                        disabled={isSaving} 
                                        style={{ backgroundColor: primaryColor }} // <--- Terapkan primaryColor di sini
                                        className="flex-row items-center justify-center h-12 shadow-lg rounded-xl active:scale-95 shadow-slate-200"
                                    >
                                        {isSaving ? <ActivityIndicator color="white" size="small" /> : <><Check size={16} color="white" /><Text className="ml-2 text-[11px] font-black text-white uppercase tracking-widest">Simpan Data</Text></>}
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>

            {showDatePicker && (
                <DateTimePicker value={new Date(form.date)} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setForm({ ...form, date: moment(d).format('YYYY-MM-DD') }) }} />
            )}
            <UniversalCamera visible={showCamera} onClose={() => setShowCamera(false)} onCaptured={(uri: string) => setForm({ ...form, receiptUrl: uri })} />
        </Modal>
    );
}