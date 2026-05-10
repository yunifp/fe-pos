import React, { useState, useEffect, createElement, useMemo, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { X, Check, Tag, Calendar, Box, Ticket, ShoppingBag, Search, Store, Layers, DollarSign } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettingStore } from '../stores/settingStore';
import InputField from './InputField'; // <--- IMPORT KOMPONEN INPUTFIELD REUSABLE

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    branches: any[];
    products: any[];
    userRole: string;
}

const DatePickerField = ({ label, dateValue, onDateChange }: { label: string, dateValue: Date, onDateChange: (d: Date) => void }) => {
    const [showPicker, setShowPicker] = useState(false);
    const displayDate = dateValue.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    if (Platform.OS === 'web') {
        const dateString = dateValue.toISOString().split('T')[0];
        return (
            <View className="flex-1 mb-5">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">{label}</Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 h-12 shadow-sm overflow-hidden">
                    <Calendar size={16} color="#64748B" style={{ opacity: 0.5, marginRight: 10 }} />
                    {createElement('input', {
                        type: 'date',
                        value: dateString,
                        onChange: (e: any) => onDateChange(new Date(e.target.value)),
                        style: { border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600', color: '#1E293B', background: 'transparent', flex: 1, height: '100%' }
                    })}
                </View>
            </View>
        );
    }
    return (
        <View className="flex-1 mb-5">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">{label}</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 h-12 shadow-sm active:bg-slate-50">
                <Calendar size={16} color="#64748B" style={{ opacity: 0.5, marginRight: 10 }} />
                <Text className="text-sm font-semibold text-slate-800">{displayDate}</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker value={dateValue} mode="date" minimumDate={new Date()}
                    onChange={(event, selectedDate) => { if (Platform.OS === 'android') setShowPicker(false); if (selectedDate) onDateChange(selectedDate); }}
                />
            )}
        </View>
    );
};

const SegmentedControl = ({ options, selected, onSelect }: any) => (
    <View className="flex-row bg-slate-100 p-1.5 rounded-2xl mb-6">
        {options.map((opt: any) => {
            const isActive = selected === opt.value;
            return (
                <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)} className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl ${isActive ? 'bg-white shadow-sm' : ''}`}>
                    {opt.icon && <View className="mr-2 opacity-80">{opt.icon(isActive)}</View>}
                    <Text className={`text-[10px] font-bold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{opt.label}</Text>
                </TouchableOpacity>
            )
        })}
    </View>
);

export default function PromotionFormModal({ visible, onClose, onSubmit, initialData, branches, products, userRole }: Props) {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();
    const isLarge = width >= 768;
    const [loading, setLoading] = useState(false);

    const formRef = useRef({ name: '', code: '', discountValue: '', minPurchase: '', maxDiscount: '' });
    const [type, setType] = useState<'TRANSACTION' | 'PRODUCT_DISCOUNT' | 'BUNDLE'>('TRANSACTION');
    const [discountMode, setDiscountMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
    const [searchProduct, setSearchProduct] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                formRef.current = {
                    name: initialData.name, code: initialData.code,
                    discountValue: initialData.discountPct ? initialData.discountPct.toString() : initialData.discountAmt?.toString() || '',
                    minPurchase: initialData.minPurchase?.toString() || '',
                    maxDiscount: initialData.maxDiscount?.toString() || ''
                };
                setType(initialData.type);
                setDiscountMode(initialData.discountPct ? 'PERCENT' : 'AMOUNT');
                setStartDate(initialData.startDate ? new Date(initialData.startDate) : new Date());
                setEndDate(initialData.endDate ? new Date(initialData.endDate) : new Date());
                setSelectedVariants(initialData.targets ? initialData.targets.map((t: any) => t.variantId.toString()) : []);
            } else {
                formRef.current = { name: '', code: '', discountValue: '', minPurchase: '', maxDiscount: '' };
                setType('TRANSACTION'); setDiscountMode('PERCENT'); setStartDate(new Date()); setSelectedVariants([]);
            }
            setRefreshTrigger(prev => prev + 1);
        }
    }, [visible, initialData]);

    const validateForm = () => {
        const f = formRef.current;
        if (!f.name.trim()) return "Nama promo wajib diisi";
        if (!f.code.trim()) return "Kode voucher wajib diisi";
        if (!f.discountValue || parseFloat(f.discountValue) <= 0) return "Nilai diskon harus lebih dari 0";
        if (type === 'BUNDLE' && selectedVariants.length < 2) return "Promo Bundle wajib memilih minimal 2 produk";
        if (type === 'PRODUCT_DISCOUNT' && selectedVariants.length === 0) return "Pilih minimal satu produk untuk diskon";
        if (endDate < startDate) return "Tanggal berakhir tidak boleh sebelum tanggal mulai";
        return null;
    };

    const handleSubmitInternal = async () => {
        const error = validateForm();
        if (error) return Alert.alert("Lengkapi Data", error);
        
        setLoading(true);
        try {
            const { name, code, discountValue, minPurchase, maxDiscount } = formRef.current;
            const payload: any = {
                id: initialData?.id,
                name, code, type,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                minPurchase: parseFloat(minPurchase || '0'),
                maxDiscount: parseFloat(maxDiscount || '0'),
                discountPct: discountMode === 'PERCENT' ? (parseInt(discountValue || '0')) : null,
                discountAmt: discountMode === 'AMOUNT' ? (parseFloat(discountValue || '0')) : null,
                targetBranchIds: userRole === 'OWNER' ? branches.map(b => b.id) : undefined,
                targetProductIds: type !== 'TRANSACTION' 
                    ? selectedVariants.map(id => ({ variantId: parseInt(id), quantity: 1 })) 
                    : undefined
            };

            await onSubmit(payload);
            onClose();
        } catch (e) { 
            Alert.alert("Error", "Gagal menyimpan promosi. Pastikan koneksi stabil."); 
        } finally { 
            setLoading(false); 
        }
    };

    const productsByBranch = useMemo(() => {
        const grouped: any = {};
        products.forEach(p => {
            if (p.name.toLowerCase().includes(searchProduct.toLowerCase())) {
                const bName = p.branch?.name || 'Cabang';
                if (!grouped[bName]) grouped[bName] = [];
                grouped[bName].push(p);
            }
        });
        return grouped;
    }, [products, searchProduct]);

    const modalLayout = isLarge
        ? { width: 600, height: '85%', borderRadius: 32, alignSelf: 'center' as any, marginTop: '5%' } as any
        : { width: '100%', height: '94%', borderTopLeftRadius: 40, borderTopRightRadius: 40 } as any;

    const ModalContent = (
        <View style={modalLayout} className="overflow-hidden bg-white shadow-2xl">
            <View className="z-20 flex-row items-center justify-between px-8 pt-8 pb-5 bg-white border-b border-slate-50">
                <View>
                    <Text className="text-2xl italic font-extrabold text-slate-900">{initialData ? 'Edit Promo' : 'Buat Promo'}</Text>
                    <Text className="text-xs font-medium text-slate-400">Manajemen Diskon & Penawaran</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="items-center justify-center w-10 h-10 rounded-full bg-slate-50 border border-slate-100">
                    <X size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-8 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
                <SegmentedControl selected={type} onSelect={(val: any) => { setType(val); setSelectedVariants([]); }} options={[
                    { value: 'TRANSACTION', label: 'BILLING', icon: (active: any) => <Ticket size={14} color={active ? '#1E293B' : '#94A3B8'} /> },
                    { value: 'PRODUCT_DISCOUNT', label: 'DISKON', icon: (active: any) => <ShoppingBag size={14} color={active ? '#1E293B' : '#94A3B8'} /> },
                    { value: 'BUNDLE', label: 'BUNDLE', icon: (active: any) => <Layers size={14} color={active ? '#1E293B' : '#94A3B8'} /> }
                ]} />

                {/* MENGGUNAKAN INPUTFIELD GLOBAL */}
                <InputField key={`name-${refreshTrigger}`} label="Nama Promo" isRequired defaultValue={formRef.current.name} onChangeText={(t: string) => formRef.current.name = t} placeholder="Flash Sale" icon={<Tag size={16} color="#64748B" />} />
                <InputField key={`code-${refreshTrigger}`} label="Kode Voucher" isRequired defaultValue={formRef.current.code} onChangeText={(t: string) => formRef.current.code = t.toUpperCase()} placeholder="PROMO" icon={<Box size={16} color="#64748B" />} disabled={!!initialData} />

                <View className="p-5 mb-8 border bg-slate-50 rounded-3xl border-slate-100">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-sm font-bold text-slate-800">Nilai Promo</Text>
                        <View className="flex-row p-1 bg-white border border-slate-200 rounded-lg">
                            <TouchableOpacity onPress={() => setDiscountMode('PERCENT')} className={`px-3 py-1.5 rounded-md ${discountMode === 'PERCENT' ? 'bg-indigo-50' : ''}`}><Text className={`text-xs font-bold ${discountMode === 'PERCENT' ? 'text-indigo-600' : 'text-slate-400'}`}>%</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setDiscountMode('AMOUNT')} className={`px-3 py-1.5 rounded-md ${discountMode === 'AMOUNT' ? 'bg-indigo-50' : ''}`}><Text className={`text-xs font-bold ${discountMode === 'AMOUNT' ? 'text-indigo-600' : 'text-slate-400'}`}>Rp</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View className="flex-row items-center h-16 px-4 mb-4 bg-white border border-slate-200 rounded-2xl">
                        <Text className="mr-2 text-2xl font-bold text-slate-300">{discountMode === 'PERCENT' ? '%' : 'Rp'}</Text>
                        <TextInput
                            className="flex-1 h-full text-2xl font-extrabold text-slate-800"
                            keyboardType="numeric" placeholder="0" defaultValue={formRef.current.discountValue}
                            onChangeText={(text) => formRef.current.discountValue = text.replace(/[^0-9]/g, '')}
                            disableFullscreenUI={true} importantForAutofill="no" autoComplete="off"
                            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : { textAlignVertical: 'center' }}
                        />
                    </View>
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <InputField key={`min-${refreshTrigger}`} label="Minimal Belanja" defaultValue={formRef.current.minPurchase} onChangeText={(t: string) => formRef.current.minPurchase = t} keyboardType="numeric" disabled={type !== 'TRANSACTION'} icon={<DollarSign size={14} color="#94A3B8" />} />
                        </View>
                        <View className="flex-1">
                            <InputField key={`max-${refreshTrigger}`} label="Max Diskon" defaultValue={formRef.current.maxDiscount} onChangeText={(t: string) => formRef.current.maxDiscount = t} keyboardType="numeric" icon={<DollarSign size={14} color="#94A3B8" />} />
                        </View>
                    </View>
                </View>

                <View className="flex-row gap-4 mb-8">
                    <DatePickerField label="Mulai" dateValue={startDate} onDateChange={setStartDate} />
                    <DatePickerField label="Berakhir" dateValue={endDate} onDateChange={setEndDate} />
                </View>

                {type !== 'TRANSACTION' && (
                    <View className="mb-20">
                        <Text className="text-slate-500 text-[10px] font-black uppercase mb-3 ml-1 opacity-80">Pilih Produk Target *</Text>
                        <View className="flex-row items-center h-12 px-4 mb-4 border border-slate-200 shadow-inner bg-slate-50 rounded-xl">
                            <Search size={16} color="#94A3B8" />
                            <TextInput
                                className="flex-1 py-0 ml-2 text-xs font-semibold text-slate-700"
                                placeholder="Cari Produk..." placeholderTextColor="#94A3B8"
                                value={searchProduct} onChangeText={setSearchProduct}
                                disableFullscreenUI={true}
                                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : { textAlignVertical: 'center' }}
                            />
                            {searchProduct !== '' && <TouchableOpacity onPress={() => setSearchProduct('')}><X size={14} color="#CBD5E1" /></TouchableOpacity>}
                        </View>

                        {(() => {
                            let lockedBranchId: string | null = null;
                            if (type === 'BUNDLE' && selectedVariants.length > 0) {
                                const firstSelectedId = selectedVariants[0];
                                const product = products.find(p => p.variants.some((v: any) => v.id.toString() === firstSelectedId));
                                lockedBranchId = product?.branchId || product?.branch?.id || null;
                            }

                            return Object.keys(productsByBranch).length > 0 ? Object.keys(productsByBranch).map((branchName) => {
                                const currentBranchId = productsByBranch[branchName][0]?.branchId || productsByBranch[branchName][0]?.branch?.id;
                                const isBranchDisabled = type === 'BUNDLE' && lockedBranchId !== null && lockedBranchId !== currentBranchId;
                                const branchVariants = productsByBranch[branchName].flatMap((p: any) => p.variants.map((v: any) => v.id.toString()));
                                const isAllSelected = branchVariants.length > 0 && branchVariants.every((id: string) => selectedVariants.includes(id));

                                const toggleSelectAllBranch = () => {
                                    if (isBranchDisabled) return Alert.alert("Cabang Berbeda", "Untuk tipe Bundle, semua produk harus berasal dari cabang yang sama.");
                                    if (isAllSelected) setSelectedVariants(prev => prev.filter(id => !branchVariants.includes(id)));
                                    else {
                                        const otherSelected = selectedVariants.filter(id => !branchVariants.includes(id));
                                        setSelectedVariants([...otherSelected, ...branchVariants]);
                                    }
                                };

                                return (
                                    <View key={branchName} className={`mb-6 ${isBranchDisabled ? 'opacity-40' : 'opacity-100'}`}>
                                        <View className="flex-row items-center justify-between bg-slate-100 px-3 py-2.5 rounded-xl mb-3 border border-slate-200">
                                            <View className="flex-row items-center flex-1">
                                                <Store size={12} color={isBranchDisabled ? "#94A3B8" : "#475569"} />
                                                <Text className="ml-2 text-[10px] font-black text-slate-600 uppercase flex-1" numberOfLines={1}>
                                                    {branchName} {isBranchDisabled && "(Terkunci)"}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={toggleSelectAllBranch} disabled={isBranchDisabled} activeOpacity={0.7} className={`px-3 py-1.5 rounded-lg border ${isAllSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-200'}`}>
                                                <Text className={`text-[9px] font-black uppercase ${isAllSelected ? 'text-white' : 'text-indigo-600'}`}>{isAllSelected ? 'Batal Semua' : 'Pilih Semua'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {productsByBranch[branchName].map((p: any) => p.variants.map((v: any) => {
                                            const isSelected = selectedVariants.includes(v.id.toString());
                                            return (
                                                <TouchableOpacity
                                                    key={v.id} disabled={isBranchDisabled} activeOpacity={0.6}
                                                    onPress={() => setSelectedVariants(isSelected ? selectedVariants.filter(id => id !== v.id.toString()) : [...selectedVariants, v.id.toString()])}
                                                    className={`flex-row items-center p-3.5 mb-1.5 rounded-xl border ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}
                                                >
                                                    <View className={`w-5 h-5 mr-3 border-2 items-center justify-center rounded-md ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                                        {isSelected && <Check size={12} color="white" strokeWidth={4} />}
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</Text>
                                                        <Text className="text-[10px] text-slate-400 font-medium">Varian: {v.name}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )
                                        }))}
                                    </View>
                                );
                            }) : <View className="items-center py-10"><Text className="text-xs italic font-bold text-slate-400">Produk tidak ditemukan</Text></View>;
                        })()}
                    </View>
                )}
                <View className="h-32" />
            </ScrollView>

            <View className="absolute bottom-0 w-full p-5 bg-white border-t border-slate-50">
                <TouchableOpacity onPress={handleSubmitInternal} disabled={loading} className="flex-row items-center justify-center shadow-lg h-14 rounded-xl active:scale-95" style={{ backgroundColor: settings.themePrimaryColor }}>
                    {loading ? <ActivityIndicator color="white" /> : <><Text className="mr-2 text-sm italic font-black tracking-widest text-white uppercase">Simpan Promo</Text><Check size={18} color="white" strokeWidth={3} /></>}
                </TouchableOpacity>
            </View>
        </View>
    );

    if (Platform.OS === 'web') return visible ? <View style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end' } as any}>{ModalContent}</View> : null;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className={`flex-1 bg-black/60 ${isLarge ? 'justify-center' : 'justify-end'}`}>
                        <TouchableWithoutFeedback>{ModalContent}</TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}