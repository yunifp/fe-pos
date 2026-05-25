import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, useWindowDimensions } from 'react-native';
import { X, CheckCircle2, User, AlertCircle, Printer, Star } from 'lucide-react-native';
import MyInput from './MyInput';
import { usePOSStore } from '../stores/posStore';
import { usePrintStore } from '../stores/printStore';
import { useSettingStore } from '../stores/settingStore';
import { useReceiptStore } from '../stores/receiptStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { generateReceiptHTML, executePrint } from '../utils/printerDriver';

const SHORTCUTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function PaymentModal({ visible, total, orderType, onClose }: any) {
    const { width, height } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768;
    const isHorizontalSplit = height < 500;
    const useTwoColumns = isTablet && !isHorizontalSplit;

    const pos = usePOSStore();
    const { settings } = useSettingStore();
    const { getPrintPayload } = usePrintStore();
    const { fetchSetting: fetchReceiptSetting, setting: receiptSetting } = useReceiptStore();

    const [cashReceived, setCashReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [isProcessing, setIsProcessing] = useState(false);
    const [manualCustomerName, setManualCustomerName] = useState('');

    const [pointsToUse, setPointsToUse] = useState('');
    const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning';
    }>({ visible: false, title: '', message: '', type: 'success' });

    const triggerAlert = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (visible) {
                const userData = await AsyncStorage.getItem('user');
                let branchId = undefined;
                if (userData) {
                    const user = JSON.parse(userData);
                    branchId = user.branch?.id || user.branchId;
                }
                if (pos.currentOrder?.customerName) setManualCustomerName(pos.currentOrder.customerName);
                if (branchId) {
                    await fetchReceiptSetting(branchId);
                }
            }
        };
        loadInitialData();
    }, [visible]);

    const resetAll = () => {
        setCashReceived('');
        setPaymentMethod('CASH');
        setManualCustomerName('');
        setSavedOrderId(null);
        setPointsToUse('');
        setAlertConfig(p => ({ ...p, visible: false }));
    };

    const finalCalculations = useMemo(() => {
        let pointsDiscount = 0;
        const pts = parseInt(pointsToUse) || 0;

        if (pos.selectedMember && settings.isActive && pts > 0) {
            pointsDiscount = pts * (settings.pointValue || 1);
            const maxAllowed = (total * (settings.maxRedeemPercent || 100)) / 100;
            if (pointsDiscount > maxAllowed) pointsDiscount = maxAllowed;
        }

        return {
            pointsDiscount,
            grandTotal: Math.max(0, total - pointsDiscount)
        };
    }, [total, pointsToUse, pos.selectedMember, settings]);

    const change = Number(cashReceived) - finalCalculations.grandTotal;

    const handleFinish = async () => {
        if (paymentMethod === 'CASH' && change < 0) {
            return triggerAlert('Peringatan', 'Uang tunai pembayaran kurang!', 'warning');
        }

        const pointsNum = parseInt(pointsToUse) || 0;
        if (pos.selectedMember && pointsNum > pos.selectedMember.points) {
            return triggerAlert('Peringatan', 'Saldo poin member tidak mencukupi!', 'warning');
        }

        setIsProcessing(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : null;
            const branchIdToUse = user?.branch?.id || user?.branchId;

            let orderData;

            // Transaksi Pembayaran dari Tiket PENDING
            if (pos.currentOrder?.id) {
                const payload = {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    paymentMethod: paymentMethod,
                };
                const res = await api.patch(`/pos/orders/${pos.currentOrder.id}/status`, payload);
                orderData = res.data.data;
            } 
            // Transaksi Pembayaran Langsung Baru
            else {
                const payload = {
                    branchId: branchIdToUse,
                    orderType: orderType,
                    customerName: pos.selectedMember ? pos.selectedMember.name : (manualCustomerName || 'Walk-in'),
                    memberId: pos.selectedMember ? pos.selectedMember.id : undefined,
                    paymentMethod: paymentMethod,
                    paymentStatus: 'PAID',
                    items: pos.cart.map((i: any) => ({
                        variantId: i.variantId,
                        quantity: i.quantity,
                    }))
                };
                const res = await api.post('/pos/orders', payload);
                orderData = res.data.data;
            }

            setSavedOrderId(orderData.id);
            onClose(); 

            setTimeout(() => {
                setAlertConfig({
                    visible: true,
                    title: 'Transaksi Berhasil',
                    message: `Invoice: ${orderData.invoiceNumber}\nKembalian: Rp ${Math.max(0, change).toLocaleString('id-ID')}`,
                    type: 'success'
                });
                pos.resetPOS();
            }, 500);

        } catch (e: any) {
            triggerAlert('Error', e.response?.data?.message || 'Gagal memproses transaksi (Cek Stok Bahan Baku)', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = async () => {
        if (!savedOrderId) return;
        if (!receiptSetting) {
            triggerAlert("Error", "Pengaturan struk belum dimuat. Mohon tunggu.", 'error');
            return;
        }

        setIsPrinting(true);
        try {
            const payload = await getPrintPayload(savedOrderId);
            if (payload) {
                const printData = {
                    order: payload.order,
                    receiptSetting: receiptSetting,
                    earnedPoints: payload.earnedPoints,
                    redeemedPoints: payload.redeemedPoints
                };
                const htmlContent = generateReceiptHTML(printData);
                await executePrint(printData, htmlContent);
                if (Platform.OS !== 'web') {
                    setAlertConfig(p => ({ ...p, visible: false }));
                    resetAll();
                }
            }
        } catch (error: any) {
            triggerAlert('Print Gagal', error.message || 'Cek koneksi printer bluetooth', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} className="items-center justify-center p-2 md:p-4 bg-black/60">
                    <View
                        style={{ width: isDesktop ? '70%' : isTablet ? '85%' : '100%', maxHeight: '95%', flexDirection: useTwoColumns ? 'row' : 'column' }}
                        className="bg-slate-50 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl relative"
                    >
                        {useTwoColumns ? (
                            <TouchableOpacity onPress={onClose} className="absolute z-50 p-2 bg-white border rounded-full shadow-sm border-slate-100 top-4 right-4">
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        ) : (
                            <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
                                <Text className="text-sm italic font-black uppercase text-slate-800">Selesaikan Pembayaran</Text>
                                <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                            </View>
                        )}

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                            <View className={`${useTwoColumns ? 'flex-row' : 'flex-col'} flex-1`}>

                                {/* KOLOM KIRI: MEMBER & PAYMENT METHOD */}
                                <View className={`${useTwoColumns ? 'flex-1 border-r border-slate-200' : 'w-full'} p-4 md:p-6 bg-slate-50/50`}>
                                    
                                    {/* MEMBER POINTS */}
                                    {pos.selectedMember && settings.isActive && pos.selectedMember.points > 0 && (
                                        <View className="p-4 mb-5 bg-white border shadow-sm border-slate-100 rounded-2xl">
                                            <View className="flex-row items-center justify-between mb-3">
                                                <View className="flex-row items-center">
                                                    <View className="p-2 bg-amber-50 rounded-xl"><Star size={16} color="#D97706" /></View>
                                                    <View className="ml-3">
                                                        <Text className="text-xs font-bold text-slate-800">Tukar Poin</Text>
                                                        <Text className="text-[10px] text-amber-600 font-medium">Tersedia: {pos.selectedMember.points} Pts</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="flex-row items-center px-4 py-2 border bg-amber-50 rounded-xl border-amber-200">
                                                <TextInput 
                                                    placeholder="Jumlah Poin..." 
                                                    className="flex-1 font-black text-amber-700 outline-none" 
                                                    value={pointsToUse} 
                                                    onChangeText={setPointsToUse} 
                                                    keyboardType="numeric" 
                                                />
                                                <Text className="text-xs font-bold text-amber-600">Pts</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* METODE PEMBAYARAN */}
                                    <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest ml-1">Pilih Metode Pembayaran</Text>
                                    <View className="flex-row flex-wrap justify-between">
                                        {['CASH', 'QRIS', 'CARD', 'TRANSFER', 'MARKETPLACE', 'MIDTRANS', 'COMPLIMENTARY'].map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => setPaymentMethod(m)}
                                                className={`w-[48%] p-3 mb-3 rounded-2xl border-2 items-center justify-center ${paymentMethod === m ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-200 active:bg-slate-50'}`}
                                            >
                                                <Text className={`font-black text-[11px] uppercase tracking-wider ${paymentMethod === m ? 'text-white' : 'text-slate-600'}`}>
                                                    {m === "MIDTRANS" ? "QRIS (AUTO)" : m === 'COMPLIMENTARY' ? 'GRATIS' : m === 'QRIS' ? 'QRIS (EDC)' : m}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* KOLOM KANAN: CASH INPUT & TOTAL */}
                                <View className={`${useTwoColumns ? 'flex-1' : 'w-full'} p-4 md:p-6 bg-white justify-between`}>
                                    <View>
                                        {paymentMethod === 'CASH' && (
                                            <View className="mb-6">
                                                <MyInput
                                                    label="Nominal Uang Diterima"
                                                    keyboardType="numeric"
                                                    value={cashReceived}
                                                    onChangeText={setCashReceived}
                                                    primaryColor="#4F46E5"
                                                />
                                                <View className="flex-row flex-wrap gap-2 mt-3">
                                                    {(() => {
                                                        const exactAmount = finalCalculations.grandTotal.toString();
                                                        const isExactActive = cashReceived === exactAmount;
                                                        return (
                                                            <TouchableOpacity
                                                                onPress={() => setCashReceived(exactAmount)}
                                                                className={`px-4 py-3 border rounded-xl ${isExactActive ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200'}`}
                                                            >
                                                                <Text className={`text-[11px] font-black tracking-widest ${isExactActive ? 'text-white' : 'text-slate-600'}`}>UANG PAS</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })()}
                                                    {SHORTCUTS.map(amt => {
                                                        const isActive = cashReceived === amt.toString();
                                                        return (
                                                            <TouchableOpacity
                                                                key={amt}
                                                                onPress={() => setCashReceived(amt.toString())}
                                                                className={`px-4 py-3 border rounded-xl ${isActive ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-200'}`}
                                                            >
                                                                <Text className={`text-[11px] font-black ${isActive ? 'text-white' : 'text-slate-600'}`}>{amt / 1000}k</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}

                                        <View className="p-6 bg-slate-900 rounded-[30px] mt-2 shadow-2xl">
                                            <View className="flex-row justify-between mb-3">
                                                <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Total Tagihan</Text>
                                                <Text className="text-sm font-black text-slate-200">Rp {total.toLocaleString()}</Text>
                                            </View>

                                            {finalCalculations.pointsDiscount > 0 && (
                                                <View className="flex-row justify-between mb-3">
                                                    <Text className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Tukar Poin</Text>
                                                    <Text className="text-sm font-black text-amber-400">- Rp {finalCalculations.pointsDiscount.toLocaleString()}</Text>
                                                </View>
                                            )}

                                            <View className="flex-row justify-between pt-4 mt-2 border-t border-white/10">
                                                <Text className="text-indigo-400 text-xs font-black uppercase tracking-widest">SISA BAYAR</Text>
                                                <Text className="text-2xl italic font-black text-indigo-400">Rp {finalCalculations.grandTotal.toLocaleString()}</Text>
                                            </View>

                                            {paymentMethod === 'CASH' && (
                                                <View className="flex-row justify-between pt-3 mt-3 border-t border-white/5">
                                                    <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Kembalian</Text>
                                                    <Text className={`text-lg font-black ${change < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                        Rp {Math.max(0, change).toLocaleString()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View className="mt-6">
                                        {!pos.selectedMember && !pos.currentOrder?.customerName && (
                                            <TextInput
                                                placeholder="Nama Pelanggan / Notes (Opsional)"
                                                placeholderTextColor="#94A3B8"
                                                className="mb-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 p-4 rounded-2xl"
                                                value={manualCustomerName}
                                                onChangeText={setManualCustomerName}
                                            />
                                        )}
                                        
                                        <TouchableOpacity disabled={isProcessing} onPress={handleFinish} className="flex-row items-center justify-center w-full py-5 bg-indigo-600 shadow-2xl shadow-indigo-300 rounded-[28px] active:scale-95">
                                            {isProcessing ? <ActivityIndicator color="white" /> : (
                                                <>
                                                    <Text className="mr-3 text-sm italic font-black tracking-widest text-white uppercase">Selesaikan Transaksi</Text>
                                                    <CheckCircle2 size={24} color="white" strokeWidth={3} />
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL NOTIFIKASI & PRINT STRUK */}
            <Modal visible={alertConfig.visible} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/70">
                    <View className="bg-white w-full max-w-[340px] rounded-[40px] p-8 items-center shadow-2xl">
                        <View className={`p-5 rounded-full mb-6 ${alertConfig.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                            {alertConfig.type === 'success' ? <CheckCircle2 size={48} color="#10B981" /> : <AlertCircle size={48} color="#F43F5E" />}
                        </View>
                        <Text className="mb-3 text-2xl font-black text-center uppercase text-slate-800 tracking-tighter">{alertConfig.title}</Text>
                        <Text className="mb-8 text-sm font-bold leading-5 text-center text-slate-500">{alertConfig.message}</Text>

                        {alertConfig.type === 'success' && savedOrderId && (
                            <TouchableOpacity onPress={handlePrint} className="flex-row items-center justify-center w-full py-4 mb-3 bg-indigo-600 shadow-lg rounded-full shadow-indigo-200 active:scale-95">
                                {isPrinting ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Printer size={20} color="white" />
                                        <Text className="ml-3 text-sm font-black tracking-widest text-white uppercase">Cetak Struk</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={resetAll} className="items-center w-full py-4 bg-slate-100 rounded-full active:bg-slate-200">
                            <Text className="text-xs font-black tracking-widest uppercase text-slate-600">Tutup Transaksi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}