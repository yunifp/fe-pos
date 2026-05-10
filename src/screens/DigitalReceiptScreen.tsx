import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { CheckCircle, Share2, Download, X, Copy, Store, AlertCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import api from '../api/api';
import { useLock } from '../context/LockContext';

export default function DigitalReceiptScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { width } = useWindowDimensions();

    // 2. AMBIL FUNGSI CONTROL LOCK
    const { setLockEnabled } = useLock();

    const { invoiceNumber } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Disable lock saat masuk screen ini
        setLockEnabled(false);

        // Enable lock kembali saat keluar dari screen ini (Unmount)
        return () => {
            setLockEnabled(true);
        };
    }, []);

    useEffect(() => {
        const fetchTransactionDetail = async () => {
            if (!invoiceNumber) {
                setError("ID Transaksi tidak ditemukan.");
                setLoading(false);
                return;
            }

            try {
                // Endpoint disesuaikan dengan request Anda
                const res = await api.get(`/orders-history/${invoiceNumber}`);
                setData(res.data);
            } catch (err: any) {
                console.error("Gagal load struk:", err);
                setError(err.response?.data?.message || "Gagal memuat data transaksi.");
            } finally {
                setLoading(false);
            }
        };

        fetchTransactionDetail();
    }, [invoiceNumber]);

    const handleShare = async () => {
        if (!data) return;
        try {
            await Share.share({
                message: `Struk Digital ${data.merchant}\nTotal: ${formatCurrency(data.totalAmount)}\nLink: https://eps.andisurandi.online/receipt/${data.invoiceNumber}`,
            });
        } catch (error) {
            Alert.alert("Error", "Gagal membagikan struk");
        }
    };

    // --- HELPER: Format Rupiah Aman (String/Number) ---
    const formatCurrency = (value: any) => {
        if (!value) return 'Rp 0';
        // Konversi ke Float dulu karena API mengembalikan String ("5000")
        const num = parseFloat(value);
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    const DashedLine = () => (
        <View className="flex-row overflow-hidden my-4 h-[1px]">
            {Array.from({ length: 40 }).map((_, i) => (
                <View key={i} className="w-1 h-1 mr-1 rounded-full bg-slate-300" />
            ))}
        </View>
    );

    // --- RENDER: LOADING ---
    if (loading) {
        return (
            <View className="items-center justify-center flex-1 bg-indigo-600">
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 font-bold text-white">Memuat Struk...</Text>
            </View>
        );
    }

    // --- RENDER: ERROR ---
    if (error || !data) {
        return (
            <View className="flex-1 px-6 pt-20 bg-indigo-600">
                <View className="items-center p-8 bg-white shadow-xl rounded-3xl">
                    <View className="items-center justify-center w-16 h-16 mb-4 bg-red-100 rounded-full">
                        <AlertCircle size={32} color="#EF4444" />
                    </View>
                    <Text className="mb-2 text-xl font-bold text-center text-slate-800">Struk Tidak Ditemukan</Text>
                    <Text className="mb-6 text-center text-slate-500">{error || "Data transaksi mungkin sudah dihapus atau link kadaluarsa."}</Text>
                </View>
            </View>
        );
    }

    // --- RENDER: SUCCESS ---
    return (
        <View className="flex-1 bg-indigo-600">
            <StatusBar style="light" />

            {/* HEADER */}
            <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
                <Text className="text-lg font-bold text-white">Struk Transaksi</Text>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-2"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-6 overflow-hidden bg-white shadow-xl rounded-3xl">

                    {/* 1. STATUS HEADER */}
                    <View className="items-center py-8 border-b bg-slate-50 border-slate-100">
                        <View className="mb-4">
                            <View className="items-center justify-center w-16 h-16 bg-green-100 border-4 border-white rounded-full shadow-sm">
                                <CheckCircle size={32} color="#16A34A" fill="#DCFCE7" />
                            </View>
                        </View>
                        <Text className="mb-1 text-2xl font-black text-slate-800">Transaksi Berhasil</Text>
                        <Text className="text-sm font-medium text-slate-400">
                            {data.createdAt ? new Date(data.createdAt).toLocaleString('id-ID') : '-'}
                        </Text>
                    </View>

                    {/* 2. TOTAL AMOUNT (FIXED KEY: totalAmount) */}
                    <View className="items-center py-6">
                        <Text className="mb-1 text-sm font-bold tracking-widest uppercase text-slate-400">Total Pembayaran</Text>
                        <Text className="text-4xl font-black text-indigo-600">
                            {formatCurrency(data.totalAmount)}
                        </Text>
                    </View>

                    {/* Separator */}
                    <View className="relative h-6 overflow-hidden bg-white">
                        <View className="absolute top-0 w-6 h-6 bg-indigo-600 rounded-full -left-3" />
                        <View className="absolute top-[11px] left-4 right-4 h-[1px] border-t border-dashed border-slate-300" />
                        <View className="absolute top-0 w-6 h-6 bg-indigo-600 rounded-full -right-3" />
                    </View>

                    {/* 3. DETAIL */}
                    <View className="px-6 pb-8">

                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <View className="items-center justify-center w-10 h-10 mr-3 bg-indigo-50 rounded-xl">
                                    <Store size={20} color="#4F46E5" />
                                </View>
                                <View>
                                    <Text className="text-base font-bold text-slate-800">{data.merchant || "EPS POS"}</Text>
                                    <Text className="text-xs text-slate-400">{data.branch?.name || 'Pusat'}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="space-y-3">
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-slate-400">ID Transaksi</Text>
                                <View className="flex-row items-center">
                                    <Text className="mr-2 text-sm font-bold text-slate-800">{data.invoiceNumber}</Text>
                                    <Copy size={12} color="#94A3B8" />
                                </View>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-slate-400">Metode Bayar</Text>
                                <Text className="text-sm font-bold uppercase text-slate-800">{data.paymentMethod}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-slate-400">Kasir</Text>
                                <Text className="text-sm font-bold text-slate-800">{data.cashierName || data.cashier?.fullName || '-'}</Text>
                            </View>
                            {/* Menampilkan Nama Customer jika ada */}
                            {data.customerName && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-slate-400">Pelanggan</Text>
                                    <Text className="text-sm font-bold text-slate-800">{data.customerName}</Text>
                                </View>
                            )}
                        </View>

                        <DashedLine />

                        {/* 4. ITEMS */}
                        <View className="mb-4">
                            <Text className="mb-3 text-xs font-bold tracking-widest uppercase text-slate-400">Rincian Pesanan</Text>
                            {data.items?.map((item: any, index: number) => (
                                <View key={index} className="flex-row items-start justify-between mb-2">
                                    <View className="flex-1 pr-4">
                                        <Text className="text-sm font-semibold text-slate-700">{item.productName}</Text>
                                        <Text className="text-xs text-slate-400">
                                            {item.variantName && item.variantName !== 'Regular' ? `(${item.variantName}) ` : ''}
                                            {item.quantity} x {formatCurrency(item.price)}
                                        </Text>
                                    </View>
                                    <Text className="text-sm font-bold text-slate-800">{formatCurrency(item.totalPrice)}</Text>
                                </View>
                            ))}
                        </View>

                        <DashedLine />

                        {/* 5. SUMMARY (Fixed Math Logic) */}
                        <View className="space-y-2">
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-slate-500">Subtotal</Text>
                                <Text className="text-sm font-bold text-slate-700">{formatCurrency(data.subtotal)}</Text>
                            </View>

                            {parseFloat(data.tax) > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-slate-500">Pajak</Text>
                                    <Text className="text-sm font-bold text-slate-700">{formatCurrency(data.tax)}</Text>
                                </View>
                            )}

                            {parseFloat(data.serviceCharge) > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-slate-500">Service Charge</Text>
                                    <Text className="text-sm font-bold text-slate-700">{formatCurrency(data.serviceCharge)}</Text>
                                </View>
                            )}

                            {parseFloat(data.discount) > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-green-600">Diskon</Text>
                                    <Text className="text-sm font-bold text-green-600">- {formatCurrency(data.discount)}</Text>
                                </View>
                            )}

                            <View className="flex-row justify-between pt-2 mt-2 border-t border-slate-100">
                                <Text className="text-lg font-bold text-slate-800">Total</Text>
                                <Text className="text-lg font-black text-indigo-600">{formatCurrency(data.totalAmount)}</Text>
                            </View>
                        </View>

                    </View>

                    <View className="items-center py-3 bg-slate-50">
                        <Text className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Powered by {data.appName}</Text>
                    </View>
                </View>

                {/* ACTION BUTTONS */}
                <View className="flex-row justify-center mb-8 space-x-4">
                    <TouchableOpacity
                        onPress={handleShare}
                        className="flex-row items-center justify-center flex-1 py-4 bg-white shadow-lg rounded-xl active:bg-slate-50"
                    >
                        <Share2 size={20} color="#4F46E5" />
                        <Text className="ml-2 font-bold text-indigo-600">Bagikan</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}