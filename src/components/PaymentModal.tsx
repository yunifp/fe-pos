import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, useWindowDimensions, Alert } from 'react-native';
import { X, ShoppingBag, Search, CheckCircle2, User, AlertCircle, Printer, Star, Tag, Ticket } from 'lucide-react-native';
import MyInput from './MyInput';
import { usePOSStore } from '../stores/posStore';
import { usePromotionStore } from '../stores/promotionStore';
import { usePrintStore } from '../stores/printStore';
import { useSettingStore } from '../stores/settingStore';
import { useReceiptStore } from '../stores/receiptStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
// PERUBAHAN: Import keduanya dari printerDriver agar sesuai dengan file sebelumnya
import { generateReceiptHTML, executePrint } from '../utils/printerDriver';

const SHORTCUTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function PaymentModal({ visible, total, orderType, onClose }: any) {
    const { width, height } = useWindowDimensions();

    // Breakpoints responsif untuk mendukung Split Screen
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;
    // Jika tinggi layar sangat pendek (Landscape Split Screen), kita paksa mode kolom
    const isHorizontalSplit = height < 500;
    const useTwoColumns = isTablet && !isHorizontalSplit;

    const pos = usePOSStore();
    const { settings } = useSettingStore();
    const { getPrintPayload } = usePrintStore();
    const { fetchPromotionsByType, promotions } = usePromotionStore(); // Ambil promotions dari store
    const { fetchSetting: fetchReceiptSetting, setting: receiptSetting } = useReceiptStore();

    const [cashReceived, setCashReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [isProcessing, setIsProcessing] = useState(false);
    const [memberPhone, setMemberPhone] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<any>(null);
    const [manualCustomerName, setManualCustomerName] = useState('');

    // --- STATE POINT LOYALTY ---
    const [pointsToUse, setPointsToUse] = useState('');
    const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

    // State khusus print agar sama dengan history screen
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
                    branchId = user.branch?.id;
                }
                await fetchPromotionsByType(branchId, 'TRANSACTION');
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
        setMemberPhone('');
        setSelectedPromo(null);
        setManualCustomerName('');
        setSavedOrderId(null);
        setPointsToUse('');
        setAlertConfig(p => ({ ...p, visible: false }));
    };

    const handleVerifyMember = async () => {
        if (!memberPhone) return;
        setIsVerifying(true);
        try {
            const res = await api.get(`/members/verify/${memberPhone}`);
            pos.setSelectedMember(res.data);
            setMemberPhone('');
            triggerAlert('Berhasil', `Member ${res.data.name} terdeteksi`, 'success');
        } catch (e) {
            triggerAlert('Gagal', 'Member tidak ditemukan', 'error');
        } finally { setIsVerifying(false); }
    };

    const finalCalculations = useMemo(() => {
        let promoDiscount = 0;
        if (selectedPromo) {
            promoDiscount = selectedPromo.discountPct ? (total * selectedPromo.discountPct) / 100 : Number(selectedPromo.discountAmt || 0);
            if (selectedPromo.maxDiscount && promoDiscount > selectedPromo.maxDiscount) promoDiscount = Number(selectedPromo.maxDiscount);
        }

        let pointsDiscount = 0;
        const pts = parseInt(pointsToUse) || 0;

        if (pos.selectedMember && settings.isActive && pts > 0) {
            pointsDiscount = pts * (settings.pointValue || 1);
            const maxAllowed = (total * (settings.maxRedeemPercent || 100)) / 100;
            if (pointsDiscount > maxAllowed) pointsDiscount = maxAllowed;
        }

        const totalDiscount = promoDiscount + pointsDiscount;
        return {
            promoDiscount,
            pointsDiscount,
            totalDiscount,
            grandTotal: Math.max(0, total - totalDiscount)
        };
    }, [total, selectedPromo, pointsToUse, pos.selectedMember, settings]);

    const change = Number(cashReceived) - finalCalculations.grandTotal;

    const handleFinish = async () => {
        if (paymentMethod === 'CASH' && change < 0) {
            return triggerAlert('Peringatan', 'Uang tunai kurang!', 'warning');
        }

        const pointsNum = parseInt(pointsToUse) || 0;

        if (pos.selectedMember && pointsNum > pos.selectedMember.points) {
            return triggerAlert('Peringatan', 'Saldo poin member tidak mencukupi!', 'warning');
        }

        setIsProcessing(true);
        try {
            const subtotalRaw = pos.cart.reduce((acc: number, i: any) =>
                acc + (Number(i.originalPrice || i.price) * i.quantity), 0
            );

            const payload = {
                id: pos.currentOrder?.id || null,
                items: pos.cart.map((i: any) => ({
                    variantId: i.variantId,
                    quantity: i.quantity,
                    price: i.price,
                    hpp: i.hpp,
                    originalPrice: i.originalPrice || i.price,
                    subtotal: i.subtotal,
                    appliedBundleId: i.appliedBundleId || null,
                    appliedProductId: i.appliedProductId || null,
                    notes: i.notes || ""
                })),
                customerName: pos.selectedMember ? pos.selectedMember.name : (manualCustomerName || 'Walk-in Customer'),
                orderType: orderType,
                platformName: 'POS',
                paymentMethod: paymentMethod,
                paymentStatus: 'PAID',
                status: 'PENDING',
                subtotal: subtotalRaw,
                discount: finalCalculations.totalDiscount,
                tax: 0,
                serviceCharge: 0,
                totalAmount: finalCalculations.grandTotal,
                memberId: pos.selectedMember?.id || null,
                promotionId: selectedPromo?.id || null,
                pointsUsed: pointsNum
            };

            const res = await api.post('/orders/pos', payload);
            const newId = res.data.id;
            setSavedOrderId(newId);

            onClose();

            setTimeout(() => {
                setAlertConfig({
                    visible: true,
                    title: 'Transaksi Berhasil',
                    message: `Invoice: ${res.data.invoiceNumber}\nKembalian: Rp ${Math.max(0, change).toLocaleString('id-ID')}`,
                    type: 'success'
                });
                pos.resetPOS();
            }, 500);

        } catch (e: any) {
            triggerAlert('Error', e.response?.data?.message || 'Gagal memproses transaksi', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = async () => {
        if (!savedOrderId) return;
        if (!receiptSetting) {
            triggerAlert("Error", "Pengaturan struk belum dimuat. Mohon tunggu sebentar.", 'error');
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
            triggerAlert('Print Gagal', error.message || 'Cek koneksi printer', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} className="items-center justify-center p-2 md:p-4 bg-black/60">
                    <View
                        style={{
                            width: isDesktop ? '90%' : isTablet ? '85%' : '100%',
                            maxHeight: '95%',
                            flexDirection: useTwoColumns ? 'row' : 'column'
                        }}
                        className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl relative"
                    >
                        {/* TOMBOL CLOSE */}
                        {useTwoColumns ? (
                            <TouchableOpacity onPress={onClose} className="absolute z-50 p-2 bg-white border rounded-full shadow-sm border-slate-100 top-4 right-4">
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        ) : (
                            <View className="flex-row items-center justify-between p-4 border-b border-slate-50">
                                <Text className="text-sm italic font-black uppercase text-slate-800">Pembayaran</Text>
                                <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                            </View>
                        )}

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                            <View className={`${useTwoColumns ? 'flex-row' : 'flex-col'} flex-1`}>

                                {/* KOLOM KIRI: RINCIAN, MEMBER & PROMO */}
                                <View className={`${useTwoColumns ? 'flex-[1.2] border-r border-slate-50' : 'w-full'} p-4 md:p-6 bg-slate-50/50`}>

                                    {/* RINCIAN PESANAN */}
                                    <View className="p-4 mb-4 bg-white border shadow-sm border-slate-100 rounded-2xl">
                                        <View className="flex-row items-center mb-3">
                                            <ShoppingBag size={14} color="#64748B" />
                                            <Text className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Item ({pos.cart.length})</Text>
                                        </View>
                                        <ScrollView className="max-h-32 md:max-h-48" nestedScrollEnabled>
                                            {pos.cart.map((item: any, idx: number) => (
                                                <View key={idx} className="flex-row items-start justify-between py-2 border-b border-slate-50 last:border-0">
                                                    <View className="flex-1 mr-2">
                                                        <Text className="text-[11px] font-bold text-slate-700" numberOfLines={1}>{item.quantity}x {item.name.split(' (')[0]}</Text>
                                                        {item.notes ? <Text className="text-[9px] text-amber-600 italic">"{item.notes}"</Text> : null}
                                                    </View>
                                                    <Text className="text-[11px] font-black text-slate-500">Rp {item.subtotal.toLocaleString()}</Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* MEMBER SECTION */}
                                    <View className="p-4 mb-4 bg-white border shadow-sm border-slate-100 rounded-2xl">
                                        {pos.selectedMember ? (
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center flex-1">
                                                    <View className="p-2 bg-indigo-50 rounded-xl"><User size={16} color="#4F46E5" /></View>
                                                    <View className="ml-3">
                                                        <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{pos.selectedMember.name}</Text>
                                                        <Text className="text-[10px] text-indigo-600 font-medium">{pos.selectedMember.points} pts</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity onPress={() => { pos.setSelectedMember(null); setPointsToUse(''); }} className="p-1"><X size={14} color="#F43F5E" /></TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center h-10 px-3 border bg-slate-50 rounded-xl border-slate-200">
                                                <Search size={14} color="#94A3B8" />
                                                <TextInput
                                                    placeholder="Cari Member..."
                                                    placeholderTextColor="#94A3B8"
                                                    className="flex-1 h-full py-0 ml-2 text-xs font-bold text-slate-700"
                                                    value={memberPhone}
                                                    onChangeText={setMemberPhone}
                                                    keyboardType="numeric"
                                                    style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
                                                />
                                                <TouchableOpacity onPress={handleVerifyMember} className="bg-indigo-600 p-1.5 rounded-lg">
                                                    {isVerifying ? <ActivityIndicator size="small" color="white" /> : <CheckCircle2 size={14} color="white" />}
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {pos.selectedMember && settings.isActive && pos.selectedMember.points > 0 && (
                                            <View className="flex-row items-center px-3 mt-3 border h-9 bg-amber-50 rounded-xl border-amber-100">
                                                <Star size={12} color="#D97706" />
                                                <TextInput placeholder="Tukarkan Poin..." className="flex-1 px-2 text-[11px] font-bold text-amber-700" value={pointsToUse} onChangeText={setPointsToUse} keyboardType="numeric" />
                                                <Text className="text-[10px] font-bold text-amber-600">pts</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* PROMO TRANSAKSI SECTION (TAMBAHAN BARU) */}
                                    <View className="p-4 mb-4 bg-white border shadow-sm border-slate-100 rounded-2xl">
                                        <View className="flex-row items-center mb-3">
                                            <Tag size={14} color="#64748B" />
                                            <Text className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Promo Transaksi</Text>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {promotions.map((promo: any) => {
                                                const isSelected = selectedPromo?.id === promo.id;
                                                const isMinPurchaseMet = total >= Number(promo.minPurchase || 0);

                                                return (
                                                    <TouchableOpacity
                                                        key={promo.id}
                                                        disabled={!isMinPurchaseMet}
                                                        onPress={() => setSelectedPromo(isSelected ? null : promo)}
                                                        className={`mr-2 px-4 py-2.5 rounded-xl border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-100'} ${!isMinPurchaseMet ? 'opacity-30' : 'opacity-100'}`}
                                                    >
                                                        <Text className={`text-[10px] font-black uppercase ${isSelected ? 'text-white' : 'text-slate-700'}`}>{promo.name}</Text>
                                                        <Text className={`text-[8px] font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {promo.discountPct ? `Disc ${promo.discountPct}%` : `Pot. Rp ${Number(promo.discountAmt).toLocaleString()}`}
                                                        </Text>
                                                        {!isMinPurchaseMet && <Text className="text-[7px] text-rose-500 font-bold mt-0.5">Min. Rp {Number(promo.minPurchase).toLocaleString()}</Text>}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            {promotions.length === 0 && (
                                                <Text className="text-[10px] italic text-slate-300 font-bold uppercase tracking-tighter">Tidak ada promo tersedia</Text>
                                            )}
                                        </ScrollView>
                                    </View>

                                    {/* METODE PEMBAYARAN */}
                                    <Text className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Pilih Metode</Text>
                                    <View className="flex-row flex-wrap justify-between">
                                        {['CASH', 'QRIS', 'CARD', 'TRANSFER', 'MARKETPLACE', 'MIDTRANS', 'COMPLIMENTARY'].map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => setPaymentMethod(m)}
                                                className={`w-[30%] p-2 mb-2 rounded-xl border-2 items-center justify-center ${paymentMethod === m ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-100'}`}
                                            >
                                                <Text className={`font-black text-[10px] uppercase ${paymentMethod === m ? 'text-white' : 'text-slate-500'}`}>
                                                    {m === "MIDTRANS" ? "QRIS (AUTO)" : m === 'COMPLIMENTARY' ? 'GRATIS' : m === 'QRIS' ? 'QRIS (EDC)' : m}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* KOLOM KANAN: INPUT CASH & SUMMARY */}
                                <View className={`${useTwoColumns ? 'flex-1' : 'w-full'} p-4 md:p-6 bg-white justify-between`}>
                                    <View>
                                        {paymentMethod === 'CASH' && (
                                            <View className="mb-4">
                                                <MyInput
                                                    label="Uang Diterima"
                                                    keyboardType="numeric"
                                                    value={cashReceived}
                                                    onChangeText={setCashReceived}
                                                />

                                                <View className="flex-row flex-wrap gap-1.5 mt-2">
                                                    {(() => {
                                                        const exactAmount = finalCalculations.grandTotal.toString();
                                                        const isExactActive = cashReceived === exactAmount;
                                                        return (
                                                            <TouchableOpacity
                                                                onPress={() => setCashReceived(exactAmount)}
                                                                className={`px-3 py-2 border rounded-lg ${isExactActive ? 'bg-emerald-600 border-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
                                                            >
                                                                <Text className={`text-[10px] font-black ${isExactActive ? 'text-white' : 'text-slate-500'}`}>UANG PAS</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })()}
                                                    {SHORTCUTS.map(amt => {
                                                        const isActive = cashReceived === amt.toString();
                                                        return (
                                                            <TouchableOpacity
                                                                key={amt}
                                                                onPress={() => setCashReceived(amt.toString())}
                                                                className={`px-3 py-2 border rounded-lg ${isActive ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
                                                            >
                                                                <Text className={`text-[10px] font-black ${isActive ? 'text-white' : 'text-slate-500'}`}>{amt / 1000}k</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}

                                        {/* SUMMARY BOX */}
                                        <View className="p-4 bg-slate-900 rounded-[24px] mt-4 shadow-xl">
                                            <View className="flex-row justify-between mb-2">
                                                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Subtotal</Text>
                                                <Text className="text-xs font-black text-slate-300">Rp {total.toLocaleString()}</Text>
                                            </View>

                                            {finalCalculations.totalDiscount > 0 && (
                                                <View className="flex-row justify-between mb-2">
                                                    <Text className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">Diskon/Poin</Text>
                                                    <Text className="text-xs font-black text-rose-500">- Rp {finalCalculations.totalDiscount.toLocaleString()}</Text>
                                                </View>
                                            )}

                                            <View className="flex-row justify-between pt-2 mt-2 border-t border-white/10">
                                                <Text className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Grand Total</Text>
                                                <Text className="text-xl italic font-black text-indigo-400">Rp {finalCalculations.grandTotal.toLocaleString()}</Text>
                                            </View>

                                            {paymentMethod === 'CASH' && (
                                                <View className="flex-row justify-between pt-2 mt-2 border-t border-white/5">
                                                    <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Kembalian</Text>
                                                    <Text className={`text-base font-black ${change < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                        Rp {Math.max(0, change).toLocaleString()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View className="mt-4">
                                        <TouchableOpacity disabled={isProcessing} onPress={handleFinish} className="flex-row items-center justify-center w-full py-5 bg-indigo-600 shadow-2xl shadow-indigo-300 rounded-[24px] active:scale-95">
                                            {isProcessing ? <ActivityIndicator color="white" /> : (
                                                <>
                                                    <Text className="mr-3 text-xs italic font-black tracking-wide text-white uppercase">Selesaikan</Text>
                                                    <CheckCircle2 size={20} color="white" strokeWidth={3} />
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {!pos.selectedMember && (
                                            <TextInput
                                                placeholder="Nama Pelanggan (Opsional)"
                                                placeholderTextColor="#94A3B8"
                                                className="mt-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                                value={manualCustomerName}
                                                onChangeText={setManualCustomerName}
                                            />
                                        )}
                                    </View>
                                </View>

                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL NOTIFIKASI */}
            <Modal visible={alertConfig.visible} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/50">
                    <View className="bg-white w-full max-w-[320px] rounded-[40px] p-8 items-center shadow-2xl">
                        <View className={`p-4 rounded-full mb-4 ${alertConfig.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            {alertConfig.type === 'success' ? <CheckCircle2 size={42} color="#10B981" /> : <AlertCircle size={42} color="#F43F5E" />}
                        </View>
                        <Text className="mb-2 text-xl font-black text-center uppercase text-slate-800">{alertConfig.title}</Text>
                        <Text className="mb-8 font-medium leading-5 text-center text-slate-500">{alertConfig.message}</Text>

                        {alertConfig.type === 'success' && savedOrderId && (
                            <TouchableOpacity onPress={handlePrint} className="flex-row items-center justify-center w-full py-4 mb-3 bg-indigo-600 shadow-lg rounded-3xl shadow-indigo-100">
                                {isPrinting ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Printer size={18} color="white" />
                                        <Text className="ml-2 text-xs font-black tracking-widest text-white uppercase">Cetak Struk</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={resetAll} className="items-center w-full py-4 bg-slate-100 rounded-3xl active:bg-slate-200">
                            <Text className="text-xs font-black tracking-widest uppercase text-slate-600">Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}