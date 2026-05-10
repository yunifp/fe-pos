import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Modal, FlatList, useWindowDimensions, Platform
} from 'react-native';
import {
    QrCode, Printer, ChevronDown, Check, X, Store,
    LayoutGrid, Settings2, Eye
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCodeJS from 'qrcode';

import MainLayout from '../components/MainLayout';
import { useBranchStore } from '../stores/branchStore';

export default function QrGeneratorScreen() {
    const { width } = useWindowDimensions();

    // --- BREAKPOINTS RESPONSIF ---
    const isDesktop = width >= 1024;
    const isTablet = width >= 640 && width < 1024;
    const numColumns = isDesktop ? 4 : isTablet ? 2 : 1;

    const { branches, fetchBranches, isLoading: isBranchLoading } = useBranchStore();
    const [user, setUser] = useState<any>(null);

    // State Form
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [startTable, setStartTable] = useState('1');
    const [endTable, setEndTable] = useState('10');
    const [generatedTables, setGeneratedTables] = useState<number[]>([]);

    const [showBranchModal, setShowBranchModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                if (parsedUser.role === 'OWNER') {
                    await fetchBranches();
                } else {
                    if (parsedUser.branch?.id) {
                        setSelectedBranchId(parsedUser.branch.id);
                    }
                }
            }
        };
        init();
    }, []);

    const handleGeneratePreview = () => {
        const start = parseInt(startTable);
        const end = parseInt(endTable);

        if (!selectedBranchId) return Alert.alert("Error", "Cabang belum terpilih.");
        if (isNaN(start) || isNaN(end) || start < 1 || end < start) return Alert.alert("Error", "Rentang nomor tidak valid.");
        if ((end - start) > 50) return Alert.alert("Warning", "Maksimal 50 meja sekaligus.");

        setIsGenerating(true);
        setTimeout(() => {
            const tables = [];
            for (let i = start; i <= end; i++) tables.push(i);
            setGeneratedTables(tables);
            setIsGenerating(false);
        }, 300);
    };

    const handlePrintIsolated = async () => {
        if (generatedTables.length === 0) return;
        setIsPrinting(true);

        const branchName = getBranchName();

        const qrImages = await Promise.all(generatedTables.map(async (num) => {
            const url = `https://webeps.andisurandi.online/order/${selectedBranchId}/${num}`;
            try {
                return await QRCodeJS.toDataURL(url, {
                    width: 500,
                    margin: 2,
                    color: { dark: '#1e293b', light: '#ffffff' }
                });
            } catch (err) {
                console.error(err);
                return '';
            }
        }));

        let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Order - ${branchName}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap');
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 20px; background: white; font-family: 'Plus Jakarta Sans', sans-serif; }
              .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; width: 100%; box-sizing: border-box; }
              .card-wrapper { page-break-inside: avoid; padding: 10px; }
              .card { border: 2px solid #1e293b; border-radius: 16px; padding: 25px; text-align: center; position: relative; overflow: hidden; background: #fff; height: 380px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
              .card-header { background: #1e293b; color: white; position: absolute; top: 0; left: 0; right: 0; padding: 10px; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
              .qr-box { border: 2px dashed #cbd5e1; padding: 10px; border-radius: 12px; margin-top: 20px; margin-bottom: 10px; background: white; }
              .qr-img { width: 180px; height: 180px; object-fit: contain; display: block; }
              .label-meja { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .nomor-meja { font-size: 56px; font-weight: 900; color: #1e293b; line-height: 1; margin: 5px 0 15px 0; }
              .scan-pill { background: #1e293b; color: white; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: bold; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="grid-container">
        `;

        generatedTables.forEach((num, index) => {
            const qrBase64 = qrImages[index];
            htmlContent += `
              <div class="card-wrapper">
                <div class="card">
                  <div class="card-header">${branchName}</div>
                  <div class="qr-box"><img src="${qrBase64}" class="qr-img" /></div>
                  <div>
                    <div class="label-meja">Meja</div>
                    <div class="nomor-meja">${num}</div>
                  </div>
                  <div class="scan-pill">SCAN MENU & ORDER</div>
                </div>
              </div>
            `;
        });

        htmlContent += `</div></body></html>`;

        if (Platform.OS === 'web') {
            try {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
                iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
                document.body.appendChild(iframe);
                const doc = iframe.contentWindow?.document;
                if (doc) {
                    doc.open(); doc.write(htmlContent); doc.close();
                    setTimeout(() => {
                        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
                        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
                        setIsPrinting(false);
                    }, 100);
                }
            } catch (e) {
                Alert.alert("Gagal", "Browser memblokir pencetakan.");
                setIsPrinting(false);
            }
        } else {
            await Print.printAsync({ html: htmlContent, orientation: Print.Orientation.portrait });
            setIsPrinting(false);
        }
    };

    const getBranchName = () => {
        if (!selectedBranchId) return 'Pilih Cabang...';
        const b = branches.find(br => br.id === selectedBranchId);
        if (b) return b.name;
        if (user && (user.branchId === selectedBranchId || user.branch?.id === selectedBranchId)) {
            return user.branch?.name || 'Cabang Anda';
        }
        return 'Cabang';
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                {/* --- HEADER COMPACT --- */}
                <View className="px-5 py-4 bg-white border-b shadow-sm border-slate-100 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <View className="p-2 bg-indigo-50 rounded-xl">
                            <QrCode size={20} color="#4F46E5" />
                        </View>
                        <View className="ml-3">
                            <Text className="text-lg font-black tracking-tighter text-slate-800 uppercase">QR Meja</Text>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generator Kartu Meja</Text>
                        </View>
                    </View>
                </View>

                <ScrollView className="flex-1 p-3 md:p-6" showsVerticalScrollIndicator={false}>

                    {/* STEP 1: CONFIGURATION (Responsive Row/Column) */}
                    <View className="bg-white p-4 md:p-6 rounded-[24px] border border-slate-200 shadow-sm mb-4">
                        <View className="flex-row items-center mb-4">
                            <Settings2 size={16} color="#64748B" />
                            <Text className="ml-2 text-xs font-black tracking-widest uppercase text-slate-500">Konfigurasi</Text>
                        </View>

                        <View className={`${isDesktop || isTablet ? 'flex-row items-end' : 'flex-col'} gap-3`}>
                            <View className="flex-1">
                                <Text className="text-[10px] font-black text-slate-400 mb-1.5 uppercase ml-1">Pilih Cabang</Text>
                                <TouchableOpacity
                                    onPress={() => user?.role === 'OWNER' && setShowBranchModal(true)}
                                    activeOpacity={user?.role === 'OWNER' ? 0.7 : 1}
                                    className={`flex-row items-center justify-between h-11 px-4 border rounded-xl ${user?.role === 'OWNER' ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-100'}`}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <Store size={14} color="#64748B" />
                                        <Text className="ml-2 text-xs font-bold uppercase text-slate-700" numberOfLines={1}>
                                            {getBranchName()}
                                        </Text>
                                    </View>
                                    {user?.role === 'OWNER' && <ChevronDown size={14} color="#94A3B8" />}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-3">
                                <View className="w-20 md:w-24">
                                    <Text className="text-[10px] font-black text-slate-400 mb-1.5 uppercase ml-1">Mulai</Text>
                                    <TextInput
                                        className="h-11 px-3 font-black text-center border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                        keyboardType="numeric" value={startTable} onChangeText={setStartTable}
                                    />
                                </View>
                                <View className="w-20 md:w-24">
                                    <Text className="text-[10px] font-black text-slate-400 mb-1.5 uppercase ml-1">Sampai</Text>
                                    <TextInput
                                        className="h-11 px-3 font-black text-center border bg-slate-50 border-slate-200 rounded-xl text-slate-800"
                                        keyboardType="numeric" value={endTable} onChangeText={setEndTable}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleGeneratePreview}
                                disabled={isBranchLoading || isGenerating}
                                className={`h-11 px-6 bg-indigo-600 rounded-xl flex-row items-center justify-center shadow-md active:scale-95 ${!isDesktop && !isTablet ? 'w-full' : ''}`}
                            >
                                {isGenerating ? <ActivityIndicator size="small" color="white" /> : (
                                    <><Eye size={16} color="white" /><Text className="ml-2 text-[11px] font-black text-white uppercase tracking-widest">Preview</Text></>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* STEP 2: PREVIEW GRID */}
                    {generatedTables.length > 0 && (
                        <View className="mt-2">
                            <View className="flex-row items-center justify-between mb-4 px-1">
                                <View className="flex-row items-center">
                                    <LayoutGrid size={16} color="#64748B" />
                                    <Text className="ml-2 text-xs font-black tracking-widest uppercase text-slate-500">Preview ({generatedTables.length})</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={handlePrintIsolated}
                                    disabled={isPrinting}
                                    className="flex-row items-center px-4 py-2.5 bg-emerald-600 rounded-xl shadow-lg active:scale-95 shadow-emerald-100"
                                >
                                    {isPrinting ? <ActivityIndicator size="small" color="white" /> : <Printer size={16} color="white" />}
                                    <Text className="ml-2 text-[10px] font-black text-white uppercase">Cetak Semua</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row flex-wrap -mx-1.5">
                                {generatedTables.map((num) => (
                                    <View key={num} style={{ width: `${100 / numColumns}%`, padding: 6 }}>
                                        <View className="bg-white border-2 border-slate-800 rounded-2xl overflow-hidden items-center p-4">
                                            <View className="absolute top-0 left-0 right-0 bg-slate-800 py-1 items-center">
                                                <Text className="text-[8px] text-white font-black uppercase tracking-widest" numberOfLines={1}>{getBranchName()}</Text>
                                            </View>
                                            <View className="mt-4 p-1.5 border border-dashed border-slate-200 rounded-lg bg-white">
                                                <QRCode
                                                    value={`https://webeps.andisurandi.online/order/${selectedBranchId}/${num}`}
                                                    size={isDesktop ? 100 : 80}
                                                    color="#1e293b"
                                                />
                                            </View>
                                            <Text className="text-[8px] font-black text-slate-400 uppercase mt-2">Meja</Text>
                                            <Text className="text-3xl font-black text-slate-800 leading-none mb-2">{num}</Text>
                                            <View className="px-3 py-1 bg-slate-100 rounded-full">
                                                <Text className="text-[7px] font-black text-slate-500 uppercase">Scan to Order</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View className="h-20" />
                </ScrollView>

                {/* --- BRANCH MODAL COMPACT --- */}
                <Modal visible={showBranchModal} transparent animationType="fade">
                    <View className="items-center justify-center flex-1 p-5 bg-black/60 backdrop-blur-sm">
                        <View className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl">
                            <View className="flex-row items-center justify-between p-5 border-b border-slate-50">
                                <Text className="text-base font-black text-slate-800 uppercase italic">Pilih Cabang</Text>
                                <TouchableOpacity onPress={() => setShowBranchModal(false)} className="p-2 bg-slate-50 rounded-full">
                                    <X size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <View className="p-4">
                                <FlatList
                                    data={branches}
                                    keyExtractor={item => item.id}
                                    style={{ maxHeight: 300 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => { setSelectedBranchId(item.id); setShowBranchModal(false); }}
                                            className={`flex-row items-center p-4 mb-2 rounded-2xl border ${selectedBranchId === item.id ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-100'}`}
                                        >
                                            <Store size={18} color={selectedBranchId === item.id ? '#4F46E5' : '#94A3B8'} />
                                            <Text className={`ml-3 font-bold flex-1 text-xs uppercase ${selectedBranchId === item.id ? 'text-indigo-700' : 'text-slate-600'}`}>{item.name}</Text>
                                            {selectedBranchId === item.id && <Check size={16} color="#4F46E5" />}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </MainLayout>
    );
}