import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Switch,
    useWindowDimensions, ActivityIndicator, Modal,
    Platform, Image, StyleSheet, Alert, PermissionsAndroid
} from 'react-native';
import {
    Save, Printer, Type, MapPin, Info, CheckCircle2,
    AlertCircle, Layout, TextCursorInput, Upload, X,
    Bluetooth, RefreshCw, Smartphone, Check, Trash2, Star
} from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import MyInput from '../components/MyInput';
import { useReceiptStore } from '../stores/receiptStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// --- IMPORT WRAPPER PLATFORM-SPECIFIC ---
import { GrayscaleWrapper } from '../components/GrayscaleWrapper';

// BluetoothManager hanya di-require di dalam fungsi agar tidak crash di web
let BluetoothManager: any;

export default function ReceiptSettingScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const store = useReceiptStore();

    const [activeTab, setActiveTab] = useState<'DESIGN' | 'PRINTER'>('DESIGN');
    const [form, setForm] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [devices, setDevices] = useState({ paired: [], found: [] });
    const [savedPrinters, setSavedPrinters] = useState<any[]>([]);
    const [connectedMac, setConnectedMac] = useState<string | null>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean; title: string; message: string; type: 'success' | 'error';
    }>({ visible: false, title: '', message: '', type: 'success' });

    useEffect(() => {
        init();
        if (Platform.OS !== 'web') {
            loadSavedPrinters();
            checkAutoConnect();
        }
    }, []);

    useEffect(() => { if (store.setting) setForm(store.setting); }, [store.setting]);

    const init = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const branchId = user.branchId || (user.branch ? user.branch.id : null);

                if (branchId) {
                    // Beri pembungkus try-catch spesifik untuk fetch agar tidak crash satu layar
                    try {
                        await store.fetchSetting(branchId);
                    } catch (fetchErr) {
                        console.warn("Gagal mengambil data struk dari server:", fetchErr);
                        // Set form minimal agar UI tidak error saat render
                        setForm(store.setting || { branchId });
                    }
                }
            }
        } catch (err) {
            console.error("AsyncStorage Error:", err);
            setForm({}); // Fallback agar tidak stuck di loading
        }
    };

    const loadSavedPrinters = async () => {
        const res = await AsyncStorage.getItem('SAVED_PRINTERS');
        if (res) setSavedPrinters(JSON.parse(res));
    };

    const updatePrintersList = async (newList: any[]) => {
        setSavedPrinters(newList);
        await AsyncStorage.setItem('SAVED_PRINTERS', JSON.stringify(newList));
    };

    const checkAutoConnect = async () => {
        if (Platform.OS === 'web') return;
        try {
            const { BluetoothManager: NativeBM } = require('react-native-bluetooth-escpos-printer');
            BluetoothManager = NativeBM;
            const lastMac = await AsyncStorage.getItem('LAST_PRINTER_MAC');
            if (lastMac) {
                const enabled = await BluetoothManager.isBluetoothEnabled();
                if (enabled) {
                    await BluetoothManager.connect(lastMac);
                    setConnectedMac(lastMac);
                }
            }
        } catch (e) { console.log("Auto-connect failed"); }
    };

    const handleScan = async () => {
        if (Platform.OS === 'web') return;
        setScanning(true);
        try {
            const { BluetoothManager: NativeBM } = require('react-native-bluetooth-escpos-printer');
            BluetoothManager = NativeBM;
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Izin Ditolak", "Izin lokasi diperlukan.");
                return;
            }
            if (Platform.OS === 'android' && Platform.Version >= 31) {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);
            }
            const enabled = await BluetoothManager.isBluetoothEnabled();
            if (!enabled) await BluetoothManager.enableBluetooth();
            const results = await BluetoothManager.scanDevices();
            const parsed = JSON.parse(results);
            setDevices({ paired: parsed.paired || [], found: parsed.found || [] });
        } catch (err) { Alert.alert("Error", "Gagal mencari perangkat."); } finally { setScanning(false); }
    };

    const handleConnect = async (device: any) => {
        if (Platform.OS === 'web') return;
        setScanning(true);
        try {
            const { BluetoothManager: NativeBM } = require('react-native-bluetooth-escpos-printer');
            BluetoothManager = NativeBM;
            await BluetoothManager.connect(device.address);
            setConnectedMac(device.address);
            await AsyncStorage.setItem('LAST_PRINTER_MAC', device.address);
            const exists = savedPrinters.find(p => p.address === device.address);
            if (!exists) {
                const newList = [...savedPrinters, {
                    name: device.name || 'Printer',
                    address: device.address,
                    isActive: true,
                    isDefault: savedPrinters.length === 0
                }];
                await updatePrintersList(newList);
            }
            setAlertConfig({ visible: true, title: 'Berhasil', message: 'Printer terhubung!', type: 'success' });
        } catch (err) { Alert.alert("Gagal", "Tidak dapat terhubung."); } finally { setScanning(false); }
    };

    const togglePrinterStatus = (address: string) => {
        const newList = savedPrinters.map(p => p.address === address ? { ...p, isActive: !p.isActive } : p);
        updatePrintersList(newList);
    };

    const setDefaultPrinter = (address: string) => {
        const newList = savedPrinters.map(p => ({ ...p, isDefault: p.address === address }));
        updatePrintersList(newList);
        AsyncStorage.setItem('LAST_PRINTER_MAC', address);
    };

    const deletePrinter = (address: string) => {
        const newList = savedPrinters.filter(p => p.address !== address);
        updatePrintersList(newList);
        if (connectedMac === address) setConnectedMac(null);
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await store.updateSetting(form.branchId, form);
        setSaving(false);
        setAlertConfig({ visible: true, title: res.success ? 'Berhasil' : 'Gagal', message: res.success ? 'Pengaturan disimpan' : 'Terjadi kesalahan', type: res.success ? 'success' : 'error' });
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { alert('Ijin akses galeri dibutuhkan!'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!result.canceled) handleUpload(result.assets[0]);
    };

    const handleUpload = async (asset: any) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const localUri = asset.uri;
            const filename = asset.fileName || localUri.split('/').pop() || 'logo.jpg';
            const type = asset.mimeType || asset.type || 'image/jpeg';
            if (Platform.OS === 'web') {
                const response = await fetch(localUri);
                const blob = await response.blob();
                formData.append('logo', blob, filename);
            } else {
                // @ts-ignore
                formData.append('logo', { uri: Platform.OS === 'android' ? localUri : localUri.replace('file://', ''), name: filename, type: type });
            }
            const res = await store.uploadLogo(form.branchId, formData);
            if (res.success && res.url) {
                updateForm('logoUrl', res.url + '?t=' + new Date().getTime());
                setAlertConfig({ visible: true, title: 'Sukses', message: 'Logo berhasil diupload', type: 'success' });
            }
        } catch (error) { alert('Gagal upload logo'); } finally { setUploading(false); }
    };

    const updateForm = (key: string, val: any) => setForm({ ...form, [key]: val });

    if (!form) return <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} />;

    const fontFamily = Platform.OS === 'ios' ? 'Courier' : 'monospace';
    const baseSize = form.fontSize || 12;
    const fsBody = baseSize;
    const fsSmall = baseSize - 2;
    const fsTitle = baseSize + 4;
    const marginSeparator = form.compactMode ? 5 : 10;
    const marginItem = form.compactMode ? 2 : 5;
    const FONT_OPTIONS = [{ label: 'KECIL', value: 10 }, { label: 'SEDANG', value: 12 }, { label: 'BESAR', value: 14 }];

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                <View className="flex-row px-4 pt-6 bg-white border-b border-slate-100">
                    <TouchableOpacity onPress={() => setActiveTab('DESIGN')} className={`flex-1 items-center pb-4 border-b-4 ${activeTab === 'DESIGN' ? 'border-indigo-600' : 'border-transparent'}`}>
                        <Layout size={20} color={activeTab === 'DESIGN' ? '#4F46E5' : '#94A3B8'} />
                        <Text className={`text-[10px] font-black uppercase mt-2 ${activeTab === 'DESIGN' ? 'text-indigo-600' : 'text-slate-400'}`}>Desain Struk</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('PRINTER')} className={`flex-1 items-center pb-4 border-b-4 ${activeTab === 'PRINTER' ? 'border-indigo-600' : 'border-transparent'}`}>
                        <Bluetooth size={20} color={activeTab === 'PRINTER' ? '#4F46E5' : '#94A3B8'} />
                        <Text className={`text-[10px] font-black uppercase mt-2 ${activeTab === 'PRINTER' ? 'text-indigo-600' : 'text-slate-400'}`}>Koneksi Printer</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="w-full p-4 mx-auto md:p-6 lg:p-8 max-w-7xl">
                        {activeTab === 'DESIGN' ? (
                            <>
                                <View className="flex-row flex-wrap items-center justify-between gap-4 mb-8">
                                    <View>
                                        <Text className="text-3xl font-black tracking-tighter uppercase text-slate-900">Kustomisasi Struk</Text>
                                        <View className="flex-row items-center mt-1">
                                            <View className="w-2 h-2 mr-2 bg-indigo-500 rounded-full" /><Text className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Live Preview WYSIWYG</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={handleSave} disabled={saving} className="flex-row items-center px-10 py-4 transition-all bg-indigo-600 shadow-lg rounded-2xl active:scale-95">
                                        {saving ? <ActivityIndicator color="white" /> : <><Save size={20} color="white" /><Text className="ml-2 text-sm font-black tracking-widest text-white uppercase">Simpan Perubahan</Text></>}
                                    </TouchableOpacity>
                                </View>

                                <View className={`${isDesktop ? 'flex-row items-start' : 'flex-col'} gap-10`}>
                                    <View className={`${isDesktop ? 'flex-[1.4]' : 'w-full'}`}>
                                        <Section title="Header" icon={<Type size={18} color="#6366F1" />}>
                                            <MyInput label="Nama Toko" value={form.storeName} onChangeText={(v: any) => updateForm('storeName', v)} />
                                            <MyInput label="Alamat" value={form.headerAddress} onChangeText={(v: any) => updateForm('headerAddress', v)} multiline />
                                            <View className="flex-row gap-4"><View className="flex-1"><MyInput label="Telepon" value={form.headerPhone} onChangeText={(v: any) => updateForm('headerPhone', v)} keyboardType="phone-pad" /></View><View className="flex-1"><MyInput label="NPWP" value={form.headerTaxId} onChangeText={(v: any) => updateForm('headerTaxId', v)} /></View></View>
                                        </Section>
                                        <Section title="Tampilan Item" icon={<Layout size={18} color="#6366F1" />}>
                                            <ToggleRow label="Mode Padat (Hemat Kertas)" value={form.compactMode} onValueChange={(v: any) => updateForm('compactMode', v)} />
                                            <ToggleRow label="Tampilkan Nama Varian" value={form.showVariantName} onValueChange={(v: any) => updateForm('showVariantName', v)} />
                                            <ToggleRow label="Tampilkan SKU Item" value={form.showItemSku} onValueChange={(v: any) => updateForm('showItemSku', v)} />
                                            <ToggleRow label="Tampilkan Diskon Item" value={form.showItemDiscount} onValueChange={(v: any) => updateForm('showItemDiscount', v)} />
                                            <ToggleRow label="Tampilkan Catatan Item" value={form.showItemNotes} onValueChange={(v: any) => updateForm('showItemNotes', v)} />
                                        </Section>
                                        <Section title="Branding & Logo" icon={<Info size={18} color="#6366F1" />}>
                                            <ToggleRow label="Tampilkan Logo" value={form.showLogo} onValueChange={(v: any) => updateForm('showLogo', v)} />
                                            <ToggleRow label="Logo Hitam Putih (Grayscale)" value={form.grayscaleLogo} onValueChange={(v: any) => updateForm('grayscaleLogo', v)} />
                                            <MyInput label="Ukuran Logo Web (px)" value={form.logoSize?.toString()} onChangeText={(v: any) => updateForm('logoSize', parseInt(v) || 0)} keyboardType="numeric" />
                                            <MyInput label="Ukuran Logo Android (px)" value={form.logoSizeAndroid?.toString()} onChangeText={(v: any) => updateForm('logoSizeAndroid', parseInt(v) || 0)} keyboardType="numeric" />
                                            <View className="pt-4 mt-2 border-t border-slate-50">
                                                <Text className="mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Logo Baru</Text>
                                                <View className="flex-row items-center gap-4">
                                                    <View className="items-center justify-center w-16 h-16 overflow-hidden border bg-slate-100 rounded-2xl border-slate-200">{form.logoUrl ? (<Image source={{ uri: form.logoUrl }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />) : <Type size={20} color="#cbd5e1" />}</View>
                                                    <TouchableOpacity onPress={pickImage} disabled={uploading} className="flex-row items-center justify-center flex-1 border border-indigo-100 border-dashed bg-indigo-50 rounded-2xl h-14">{uploading ? <ActivityIndicator size="small" color="#4F46E5" /> : <><Upload size={18} color="#4F46E5" className="mr-2" /><Text className="text-xs font-black tracking-widest text-indigo-600 uppercase">Pilih Gambar</Text></>}</TouchableOpacity>
                                                </View>
                                            </View>
                                        </Section>
                                        <Section title="Format" icon={<Printer size={18} color="#6366F1" />}>
                                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Lebar Kertas</Text>
                                            <View className="flex-row gap-4 mb-6">{[58, 80].map(s => <TouchableOpacity key={s} onPress={() => updateForm('paperWidth', s)} className={`flex-1 py-4 rounded-2xl border ${form.paperWidth === s ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}><Text className={`font-black text-center ${form.paperWidth === s ? 'text-indigo-600' : 'text-slate-400'}`}>{s}mm</Text></TouchableOpacity>)}</View>
                                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Ukuran Font</Text>
                                            <View className="flex-row gap-2">{FONT_OPTIONS.map(opt => <TouchableOpacity key={opt.value} onPress={() => updateForm('fontSize', opt.value)} className={`flex-1 py-4 rounded-2xl border ${form.fontSize === opt.value ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}><Text className={`text-center font-black text-[10px] ${form.fontSize === opt.value ? 'text-white' : 'text-slate-400'}`}>{opt.label}</Text></TouchableOpacity>)}</View>
                                        </Section>
                                        <Section title="Footer" icon={<MapPin size={18} color="#6366F1" />}>
                                            <MyInput label="Pesan Footer" value={form.footerMessage} onChangeText={(v: any) => updateForm('footerMessage', v)} multiline />
                                            <MyInput label="Kebijakan Refund" value={form.isRefundPolicy} onChangeText={(v: any) => updateForm('isRefundPolicy', v)} multiline />
                                            <ToggleRow label="Tampilkan Poin Member" value={form.showPointsEarned} onValueChange={(v: any) => updateForm('showPointsEarned', v)} />
                                            <ToggleRow label="Tampilkan Barcode Invoice" value={form.showBarcode} onValueChange={(v: any) => updateForm('showBarcode', v)} />
                                        </Section>
                                    </View>

                                    <View className={`${isDesktop ? 'w-[400px]' : 'w-full'} items-center`}>
                                        <View className="sticky items-center w-full top-10">
                                            <Text className="self-start mb-4 text-[10px] font-black tracking-widest uppercase text-slate-400 ml-2">Rendering Preview</Text>
                                            <View style={[styles.receiptPaper, { width: form.paperWidth === 58 ? 280 : 360 }]}>
                                                <View className="items-center">
                                                    {form.showLogo && form.logoUrl && (
                                                        <View className="items-center mb-3">
                                                            <GrayscaleWrapper active={form.grayscaleLogo}>
                                                                <Image
                                                                    source={{ uri: form.logoUrl }}
                                                                    style={{
                                                                        width: form.logoSize || 80,
                                                                        height: form.logoSize || 80,
                                                                        resizeMode: 'contain',
                                                                    }}
                                                                />
                                                            </GrayscaleWrapper>
                                                        </View>
                                                    )}
                                                    <Text style={{ fontSize: fsTitle, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', color: '#000', fontFamily }}>{form.storeName || 'NAMA TOKO'}</Text>
                                                    <Text style={{ fontSize: fsSmall, marginTop: 5, color: '#000', textAlign: 'center', fontFamily }}>{form.headerAddress}</Text>
                                                    {form.headerPhone && <Text style={{ fontSize: fsSmall, marginTop: 2, color: '#000', textAlign: 'center', fontFamily, fontWeight: 'bold' }}>Telp: {form.headerPhone}</Text>}
                                                    {form.headerEmail && <Text style={{ fontSize: fsSmall, color: '#000', textAlign: 'center', fontFamily }}>{form.headerEmail}</Text>}
                                                    {form.headerWebsite && <Text style={{ fontSize: fsSmall, color: '#000', textAlign: 'center', fontFamily }}>{form.headerWebsite}</Text>}
                                                    {form.headerTaxId && <Text style={{ fontSize: fsSmall, marginTop: 2, color: '#000', textAlign: 'center', fontFamily }}>NPWP: {form.headerTaxId}</Text>}
                                                </View>
                                                <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000', marginVertical: marginSeparator }} />
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>10/01/2026 15:30</Text><Text style={{ fontSize: fsSmall, fontWeight: 'bold', color: '#000', fontFamily }}>INV-20260110</Text></View>
                                                <View style={{ marginTop: 2 }}>{form.showOrderType && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Tipe: <Text style={{ fontWeight: 'bold' }}>DINE IN</Text></Text>}{form.showTableNumber && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Meja: <Text style={{ fontWeight: 'bold' }}>09</Text></Text>}{form.showCashierName && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Kasir: <Text style={{ fontWeight: 'bold' }}>Admin POS</Text></Text>}{form.showCustomerName && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Pelanggan: <Text style={{ fontStyle: 'italic' }}>Bpk. Arfian</Text></Text>}</View>
                                                <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000', marginVertical: marginSeparator }} />
                                                <View style={{ flexDirection: 'row', marginBottom: 5 }}><Text style={{ flex: 1, fontSize: fsSmall, fontWeight: 'bold', color: '#000', fontFamily }}>ITEM</Text><Text style={{ width: 30, fontSize: fsSmall, fontWeight: 'bold', color: '#000', textAlign: 'right', fontFamily }}>QTY</Text><Text style={{ width: 80, fontSize: fsSmall, fontWeight: 'bold', color: '#000', textAlign: 'right', fontFamily }}>TOTAL</Text></View>
                                                <View style={{ marginBottom: marginItem }}><View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><Text style={{ flex: 1, fontSize: fsBody, fontWeight: 'bold', color: '#000', fontFamily }}>Kopi Susu Aren</Text><Text style={{ width: 30, fontSize: fsBody, color: '#000', textAlign: 'right', fontFamily }}>2</Text><Text style={{ width: 80, fontSize: fsBody, color: '#000', textAlign: 'right', fontFamily }}>44.000</Text></View>{form.showItemSku && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>SKU: SKU-001</Text>}{form.showVariantName && <Text style={{ fontSize: fsSmall, color: '#000', fontStyle: 'italic', fontFamily }}>• Less Sugar, Ice</Text>}{form.showItemNotes && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Catatan: Gelas plastik</Text>}{form.showItemDiscount && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Disc: -4.000</Text>}</View>
                                                <View style={{ marginBottom: marginItem }}><View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><Text style={{ flex: 1, fontSize: fsBody, fontWeight: 'bold', color: '#000', fontFamily }}>Roti Bakar</Text><Text style={{ width: 30, fontSize: fsBody, color: '#000', textAlign: 'right', fontFamily }}>1</Text><Text style={{ width: 80, fontSize: fsBody, color: '#000', textAlign: 'right', fontFamily }}>15.000</Text></View>{form.showItemSku && <Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>SKU: RTB-002</Text>}</View>
                                                <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000', marginVertical: marginSeparator }} />
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}><Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Subtotal</Text><Text style={{ fontSize: fsSmall, fontWeight: 'bold', color: '#000', fontFamily }}>59.000</Text></View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ fontSize: fsBody, fontWeight: 'bold', color: '#000', textTransform: 'uppercase', fontFamily }}>TOTAL</Text><Text style={{ fontSize: fsBody, fontWeight: 'bold', color: '#000', fontFamily }}>59.000</Text></View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Metode: CASH</Text><Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Bayar: 59.000</Text></View>
                                                {form.showPointsEarned && (<View style={{ marginTop: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#000', padding: 5, alignItems: 'center' }}><Text style={{ fontSize: fsSmall, color: '#000', fontFamily }}>Member: Bpk. Arfian</Text><Text style={{ fontSize: fsBody, fontWeight: 'bold', color: '#000', fontFamily }}>Poin Didapat: +44 pts</Text><Text style={{ fontSize: fsSmall, fontStyle: 'italic', color: '#000', fontFamily }}>Total Poin: 259</Text></View>)}
                                                <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#000', marginVertical: marginSeparator }} /><View style={{ marginTop: 5, alignItems: 'center' }}><Text style={{ fontSize: fsSmall, fontStyle: 'italic', textAlign: 'center', color: '#000', fontFamily }}>{form.footerMessage || 'Terima Kasih'}</Text>{form.isRefundPolicy && <Text style={{ fontSize: fsSmall - 2, marginTop: 10, color: '#000', textAlign: 'center', fontFamily }}>{form.isRefundPolicy}</Text>}</View>
                                                {form.showBarcode && (<View style={{ marginTop: 15, alignItems: 'center', width: '100%' }}><View style={{ height: 40, width: '80%', backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}><View style={{ flexDirection: 'row', gap: 2 }}>{[...Array(25)].map((_, i) => <View key={i} style={{ width: 2, height: '100%', backgroundColor: 'black' }} />)}</View></View><Text style={{ fontSize: 8, marginTop: 2, letterSpacing: 2, color: '#000', fontFamily }}>SCAN UNTUK STRUK DIGITAL</Text></View>)}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View className="w-full">
                                <View className="flex-row items-center justify-between mb-8">
                                    <View>
                                        <Text className="text-2xl italic font-black tracking-tighter uppercase text-slate-900">Hardware Printer</Text>
                                        <Text className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Multi-Printer & Default Management</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleScan}
                                        disabled={scanning}
                                        className="bg-indigo-600 px-6 py-3.5 rounded-2xl flex-row items-center shadow-lg active:scale-95"
                                    >
                                        {scanning ? <ActivityIndicator color="white" size="small" /> : <><RefreshCw size={18} color="white" /><Text className="ml-2 text-xs font-black tracking-widest text-white uppercase">Scan Perangkat</Text></>}
                                    </TouchableOpacity>
                                </View>

                                {/* Saved Printers Section */}
                                <Text className="text-[11px] font-black text-slate-400 uppercase mb-4 tracking-[2px] ml-1">Printer Tersimpan</Text>
                                {savedPrinters.length > 0 ? (
                                    savedPrinters.map((p: any) => (
                                        <View key={p.address} className="p-5 mb-4 bg-white border border-slate-100 shadow-sm rounded-[35px]">
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center flex-1">
                                                    <View className={`p-3 rounded-2xl ${connectedMac === p.address ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                                                        <Printer size={20} color={connectedMac === p.address ? '#10B981' : '#64748B'} />
                                                    </View>
                                                    <View className="flex-1 ml-4">
                                                        <View className="flex-row items-center">
                                                            <Text className="text-sm font-black uppercase text-slate-800">{p.name}</Text>
                                                            {p.isDefault && <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 6 }} />}
                                                        </View>
                                                        <Text className="text-[10px] font-bold text-slate-400 tracking-widest">{p.address}</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity onPress={() => deletePrinter(p.address)} className="p-2 ml-2 bg-rose-50 rounded-xl">
                                                    <Trash2 size={16} color="#F43F5E" />
                                                </TouchableOpacity>
                                            </View>

                                            <View className="flex-row items-center justify-between pt-4 mt-5 border-t border-slate-50">
                                                <View className="flex-row items-center">
                                                    <Switch
                                                        value={p.isActive}
                                                        onValueChange={() => togglePrinterStatus(p.address)}
                                                        trackColor={{ false: '#E2E8F0', true: '#818CF8' }}
                                                        thumbColor={p.isActive ? '#4F46E5' : '#94A3B8'}
                                                        style={{ transform: [{ scale: 0.8 }] }}
                                                    />
                                                    <Text className={`text-[10px] font-black ml-1 ${p.isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                        {p.isActive ? 'AKTIF' : 'NON-AKTIF'}
                                                    </Text>
                                                </View>

                                                <View className="flex-row gap-2">
                                                    {!p.isDefault && p.isActive && (
                                                        <TouchableOpacity onPress={() => setDefaultPrinter(p.address)} className="px-4 py-2 bg-slate-100 rounded-xl">
                                                            <Text className="text-[9px] font-black text-slate-500 uppercase">Set Utama</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity
                                                        onPress={() => handleConnect(p)}
                                                        className={`px-6 py-2 rounded-xl ${connectedMac === p.address ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                    >
                                                        {connectedMac === p.address ? <Check size={14} color="white" /> : <Text className="text-[9px] font-black text-white">HUBUNGKAN</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View className="p-10 bg-slate-100/50 rounded-[40px] items-center border border-dashed border-slate-200 mb-8">
                                        <Smartphone size={32} color="#CBD5E1" />
                                        <Text className="mt-4 text-xs font-bold uppercase text-slate-400">Belum ada printer tersimpan</Text>
                                    </View>
                                )}

                                {/* Scanned Devices List */}
                                {devices.found.length > 0 && (
                                    <>
                                        <Text className="text-[11px] font-black text-slate-400 uppercase mt-4 mb-4 tracking-[2px] ml-1">Hasil Scan Perangkat</Text>
                                        {devices.found.map((d: any) => (
                                            <TouchableOpacity
                                                key={d.address}
                                                onPress={() => handleConnect(d)}
                                                className="flex-row items-center justify-between p-5 mb-4 bg-white border shadow-sm border-slate-100 rounded-3xl active:bg-slate-50"
                                            >
                                                <View className="flex-row items-center">
                                                    <Bluetooth size={18} color="#94A3B8" />
                                                    <Text className="ml-4 text-sm font-bold uppercase text-slate-700">{d.name || "Unknown Device"}</Text>
                                                </View>
                                                <View className="bg-indigo-50 px-3 py-1.5 rounded-lg">
                                                    <Text className="text-[9px] font-black text-indigo-600 uppercase">Gunakan</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            <Modal visible={alertConfig.visible} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/50">
                    <View className="bg-white w-full max-w-[340px] rounded-[40px] p-8 items-center shadow-2xl">
                        <View className={`p-4 rounded-full mb-4 ${alertConfig.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>{alertConfig.type === 'success' ? <CheckCircle2 size={42} color="#10B981" /> : <AlertCircle size={42} color="#F43F5E" />}</View>
                        <Text className="mb-2 text-xl font-black uppercase text-slate-800">{alertConfig.title}</Text>
                        <Text className="mb-8 font-medium leading-5 text-center text-slate-500">{alertConfig.message}</Text>
                        <TouchableOpacity onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))} className="items-center w-full py-4 bg-indigo-600 shadow-lg rounded-3xl"><Text className="text-xs font-black tracking-widest text-white uppercase">Mengerti</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
}

function Section({ title, children, icon }: any) {
    return (
        <View className="bg-white p-6 md:p-7 rounded-[40px] border border-slate-100 shadow-sm mb-6">
            <View className="flex-row items-center mb-8">
                <View className="p-3 mr-4 shadow-sm rounded-2xl bg-indigo-50">{icon}</View>
                <Text className="text-base font-black tracking-tighter uppercase text-slate-800">{title}</Text>
            </View>
            {children}
        </View>
    );
}

function ToggleRow({ label, value, onValueChange }: any) {
    return (
        <View className="flex-row items-center justify-between py-3.5 border-b border-slate-50">
            <Text className="flex-1 pr-4 text-xs font-bold text-slate-600">{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#E2E8F0', true: '#818CF8' }}
                thumbColor={value ? '#4F46E5' : '#94A3B8'}
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : { transform: [{ scale: 0.9 }] }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    receiptPaper: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
});