import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, useWindowDimensions } from 'react-native';
import { X, TrendingUp, TrendingDown, Check, UploadCloud, Camera as CameraIcon, RefreshCw } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import BranchSelector from './BranchSelector';
import InputField from './InputField'; // <--- IMPORT REUSABLE COMPONENT
import { useSettingStore } from '../stores/settingStore';
import api from '../api/api';

// --- KOMPONEN KAMERA ---
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

const TypeButton = ({ label, active, onPress, color, icon }: any) => (
    <TouchableOpacity onPress={onPress} style={{ borderColor: active ? color : '#f1f5f9', backgroundColor: active ? color : 'white' }} className="items-center flex-1 py-3 border-2 rounded-xl">{icon}<Text className={`font-black mt-1 text-[9px] ${active ? 'text-white' : 'text-slate-400'}`}>{label}</Text></TouchableOpacity>
);

export default function CashFlowFormModal({ visible, onClose, onSubmit, initialData, branches, userRole, selectedBranchId }: any) {
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';
    
    // --- PENANGANAN RESPONSIVE & MENCEGAH OFFSIDE ---
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isTablet = windowWidth >= 768;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [formData, setFormData] = useState<any>({ id: '', amount: '', type: 'INCOME', category: '', description: '', branchId: '', receiptUrl: '' });

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setFormData({ id: initialData.id, amount: initialData.amount.toString(), type: initialData.type, category: initialData.category || '', description: initialData.description || '', branchId: initialData.branchId, receiptUrl: initialData.receiptUrl || '' });
            } else {
                setFormData({ id: '', amount: '', type: 'INCOME', category: '', description: '', branchId: selectedBranchId === 'all' ? '' : selectedBranchId, receiptUrl: '' });
            }
        }
    }, [visible, initialData, selectedBranchId]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (!result.canceled) setFormData({ ...formData, receiptUrl: result.assets[0].uri });
    };

    const handleSave = async () => {
        if (!formData.amount || !formData.category || (!formData.branchId && userRole === 'OWNER')) {
            return Alert.alert("Validasi", "Lengkapi nominal, kategori, dan cabang.");
        }
        setIsSubmitting(true);
        try {
            const dataToUpload = new FormData();
            dataToUpload.append('amount', formData.amount);
            dataToUpload.append('type', formData.type);
            dataToUpload.append('category', formData.category);
            dataToUpload.append('description', formData.description || '');
            dataToUpload.append('branchId', formData.branchId);
            
            if (formData.id) dataToUpload.append('id', formData.id);

            if (formData.receiptUrl && !formData.receiptUrl.startsWith('http')) {
                const uri = formData.receiptUrl;
                const filename = uri.split('/').pop() || 'receipt.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                
                dataToUpload.append('image', {
                    uri: Platform.OS === 'web' ? uri : uri.replace('file://', ''),
                    name: filename,
                    type,
                } as any);
            }

            await onSubmit(dataToUpload);
            onClose();
        } catch (e) {
            Alert.alert("Error", "Gagal menyimpan transaksi kas.");
        } finally { setIsSubmitting(false); }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="items-center justify-center flex-1 p-4 bg-black/60">
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                        style={{ width: isTablet ? 500 : '100%', maxHeight: '90%' }} // Membatasi tinggi maksimum agar tidak offside
                    >
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-[32px] overflow-hidden shadow-2xl flex-shrink">
                                
                                {/* Modal Header */}
                                <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                    <View>
                                        <Text className="text-lg italic font-black uppercase text-slate-900">{formData.id ? 'Edit Transaksi' : 'Catat Arus Kas'}</Text>
                                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Detail Keuangan</Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} className="p-2 bg-white border rounded-full border-slate-100">
                                        <X size={18} color="#64748b" />
                                    </TouchableOpacity>
                                </View>

                                {/* Modal Body (Diberi batas tinggi maksimal menggunakan windowHeight) */}
                                <ScrollView 
                                    className="px-6 py-4" 
                                    showsVerticalScrollIndicator={false} 
                                    keyboardShouldPersistTaps="handled"
                                    style={{ maxHeight: windowHeight * 0.65 }} // <--- INI KUNCI AGAR TIDAK OFFSIDE
                                >
                                    <View className="flex-row gap-3 mb-6">
                                        <TypeButton label="MASUK" active={formData.type === 'INCOME'} onPress={() => setFormData({ ...formData, type: 'INCOME' })} color="#10b981" icon={<TrendingUp size={18} color={formData.type === 'INCOME' ? 'white' : '#cbd5e1'} />} />
                                        <TypeButton label="KELUAR" active={formData.type === 'EXPENSE'} onPress={() => setFormData({ ...formData, type: 'EXPENSE' })} color="#f43f5e" icon={<TrendingDown size={18} color={formData.type === 'EXPENSE' ? 'white' : '#cbd5e1'} />} />
                                    </View>

                                    {/* MENGGUNAKAN INPUTFIELD GLOBAL */}
                                    <InputField 
                                        label="Nominal (Rp)" 
                                        isRequired={true} 
                                        keyboardType="numeric" 
                                        placeholder="0" 
                                        value={formData.amount} 
                                        onChangeText={(v: string) => setFormData({ ...formData, amount: v.replace(/[^0-9]/g, '') })} 
                                    />
                                    
                                    <InputField 
                                        label="Kategori" 
                                        isRequired={true} 
                                        placeholder="Sewa, Listrik, Bensin..." 
                                        value={formData.category} 
                                        onChangeText={(v: string) => setFormData({ ...formData, category: v })} 
                                    />
                                    
                                    <InputField 
                                        label="Catatan (Opsional)" 
                                        placeholder="..." 
                                        value={formData.description} 
                                        onChangeText={(v: string) => setFormData({ ...formData, description: v })} 
                                    />

                                    {userRole === 'OWNER' && (
                                        <View className="mb-6">
                                            <Text className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Alokasi Cabang</Text>
                                            <View className="overflow-hidden bg-white border border-slate-200 rounded-xl h-12 justify-center shadow-sm">
                                                <BranchSelector branches={branches} selectedId={formData.branchId} onSelect={(id) => setFormData({ ...formData, branchId: id })} />
                                            </View>
                                        </View>
                                    )}

                                    <View className="mb-6">
                                        <Text className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Lampiran Nota</Text>
                                        <View className="items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                            {formData.receiptUrl ? (
                                                <View className="items-center">
                                                    <Image source={{ uri: formData.receiptUrl.startsWith('blob') || formData.receiptUrl.startsWith('file') ? formData.receiptUrl : api.defaults.baseURL?.replace('/api', '') + formData.receiptUrl }} className="w-20 h-20 mb-3 border rounded-xl border-slate-200" resizeMode="cover" />
                                                    <View className="flex-row gap-x-6">
                                                        <TouchableOpacity onPress={pickImage}><Text className="text-indigo-600 font-black text-[9px] uppercase tracking-widest">Ganti Galeri</Text></TouchableOpacity>
                                                        <TouchableOpacity onPress={() => setShowCamera(true)}><Text className="text-indigo-600 font-black text-[9px] uppercase tracking-widest">Ganti Kamera</Text></TouchableOpacity>
                                                    </View>
                                                </View>
                                            ) : (
                                                <View className="flex-row justify-around w-full">
                                                    <TouchableOpacity onPress={pickImage} className="items-center"><UploadCloud size={24} color="#CBD5E1" /><Text className="mt-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Galeri</Text></TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setShowCamera(true)} className="items-center"><CameraIcon size={24} color="#CBD5E1" /><Text className="mt-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">Kamera</Text></TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View className="h-4" />
                                </ScrollView>

                                {/* Modal Footer (Tetap menempel di bawah tapi tidak keluar layar) */}
                                <View className="p-4 bg-white border-t border-slate-50">
                                    <TouchableOpacity onPress={handleSave} disabled={isSubmitting} style={{ backgroundColor: primaryColor }} className="items-center justify-center h-12 shadow-lg rounded-xl active:scale-95 shadow-indigo-200 flex-row">
                                        {isSubmitting ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Check size={18} color="white" />
                                                <Text className="ml-2 text-xs font-black tracking-widest text-white uppercase">SIMPAN TRANSAKSI</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
            <UniversalCamera visible={showCamera} onClose={() => setShowCamera(false)} onCaptured={(uri: string) => setFormData({ ...formData, receiptUrl: uri })} />
        </Modal>
    );
}