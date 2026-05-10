import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Platform } from 'react-native';
import { CheckCircle2, Clock, ChefHat, BellRing, User, Hash, AlertCircle, ShoppingBag, LayoutDashboard, MessageSquare, Tag } from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import { useKDSStore } from '../stores/kdsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingStore } from '../stores/settingStore';

export default function KDSScreen() {
    const { width, height } = useWindowDimensions();

    // Breakpoints cerdas untuk responsivitas (termasuk Split Screen Android)
    const isNarrow = width < 600; // Kondisi untuk HP portrait atau Split Screen sempit
    const isMedium = width >= 600 && width < 1024;
    const isWide = width >= 1024;

    const { settings, fetchSettings } = useSettingStore();
    const { queue, isLoading, fetchQueue, updateItemReady, updateStatus } = useKDSStore();
    const [branchId, setBranchId] = useState<string | null>(null);

    const init = useCallback(async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            const bId = parsed.branch?.id || parsed.branchId;
            setBranchId(bId);
            if (bId) fetchQueue(bId);
        }
    }, [fetchQueue]);

    useEffect(() => {
        fetchSettings();
        init();
        const timer = setInterval(() => {
            if (branchId) fetchQueue(branchId);
        }, 15000);
        return () => clearInterval(timer);
    }, [branchId, init, fetchSettings]);

    const handleItemToggle = async (itemId: string, currentVal: boolean) => {
        try {
            await updateItemReady(itemId, !currentVal);
            if (branchId) fetchQueue(branchId);
        } catch (e) {
            console.error(e);
        }
    };

    const handleProcessOrder = async (orderId: string, currentStatus: string, items: any[]) => {
        const allItemsReady = items.every(i => i.isReady);
        try {
            if (currentStatus === 'PENDING' || currentStatus === 'COOKING') {
                if (!allItemsReady) {
                    alert("⚠️ Semua item harus selesai dimasak sebelum Ready!");
                    return;
                }
                await updateStatus(orderId, 'READY');
            } else if (currentStatus === 'READY') {
                await updateStatus(orderId, 'COMPLETED');
            }
            if (branchId) fetchQueue(branchId);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                {/* --- HEADER COMPACT --- */}
                <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b md:px-6 border-slate-200">
                    <View className="flex-1">
                        <View className="flex-row items-center mb-0.5">
                            <ChefHat size={12} color={settings.themePrimaryColor} />
                            <Text className="font-black uppercase text-[8px] md:text-[9px] tracking-[1.5px] ml-2" style={{ color: settings.themeSecondaryColor }}>Kitchen Monitor</Text>
                        </View>
                        <Text className="text-lg font-black tracking-tighter uppercase text-slate-900">Monitoring Dapur</Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <View className="px-3 py-1.5 bg-slate-900 rounded-lg">
                            <Text className="text-white font-black text-[9px] uppercase tracking-widest">{queue.length} Pesanan</Text>
                        </View>
                        <TouchableOpacity onPress={init} className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: settings.themePrimaryColor }}>
                            <LayoutDashboard size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- CONTENT AREA --- */}
                {isLoading && queue.length === 0 ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator size="large" color={settings.themePrimaryColor} />
                        <Text className="mt-4 text-[9px] font-black tracking-[3px] uppercase text-slate-400">Menyiapkan Data...</Text>
                    </View>
                ) : queue.length === 0 ? (
                    <ScrollView
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={init} />}
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <View className="bg-white p-8 md:p-12 rounded-[30px] items-center border border-slate-100 shadow-xl mx-6 w-[85%] max-w-sm">
                            <View className="p-5 mb-4 rounded-full bg-emerald-50">
                                <ShoppingBag size={40} color="#10B981" />
                            </View>
                            <Text className="text-lg italic font-black text-center uppercase text-slate-800">Dapur Bersih!</Text>
                            <Text className="mt-1 text-[9px] font-bold text-center text-slate-400 uppercase tracking-[1px]">Tidak ada pesanan aktif</Text>
                        </View>
                    </ScrollView>
                ) : (
                    <ScrollView
                        // Horizontal hanya jika layar cukup lebar (bukan mode split sempit)
                        horizontal={!isNarrow}
                        showsHorizontalScrollIndicator={true}
                        className="flex-1"
                        contentContainerStyle={{
                            padding: 12,
                            gap: 12,
                            flexDirection: isNarrow ? 'column' : 'row',
                        }}
                    >
                        {queue.map((order: any, index: number) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                isFirst={index === 0}
                                onToggleItem={handleItemToggle}
                                onProcess={handleProcessOrder}
                                screenWidth={width}
                                isNarrow={isNarrow}
                                settings={settings}
                            />
                        ))}
                    </ScrollView>
                )}
            </View>
        </MainLayout>
    );
}

const OrderCard = ({ order, isFirst, onToggleItem, onProcess, screenWidth, isNarrow, settings }: any) => {
    const isReady = order.status === 'READY';
    const allChecked = order.items.every((i: any) => i.isReady);
    const timeInMinutes = Math.floor((new Date().getTime() - new Date(order.updatedAt).getTime()) / 60000);

    // Hitung lebar card agar fleksibel di Android Split Screen
    const cardWidth = isNarrow ? screenWidth - 24 : 320;

    return (
        <View
            style={{
                width: cardWidth,
                borderColor: isFirst ? settings.themePrimaryColor : '#F1F5F9',
                // Shadow hanya untuk mobile (Android/iOS)
                ...(isFirst && Platform.OS !== 'web' && { shadowColor: settings.themePrimaryColor, elevation: 5 }),
            }}
            className={`bg-white rounded-[24px] border-2 ${isFirst ? 'shadow-lg' : 'shadow-sm'} overflow-hidden`}
        >
            {/* Header Card Compact */}
            <View style={{ backgroundColor: isFirst ? settings.themePrimaryColor : settings.themeSecondaryColor }} className="p-4 flex-row justify-between items-center">
                <View className="flex-1">
                    <View className="flex-row items-center self-start px-2 py-0.5 mb-1 rounded bg-white/20">
                        <Hash size={9} color="white" />
                        <Text className="text-white font-black text-[8px] ml-1 uppercase">
                            {order.invoiceNumber.split('-').pop()}
                        </Text>
                    </View>
                    <Text className="text-base italic font-black tracking-tight text-white uppercase" numberOfLines={1}>
                        {order.customerName || 'WALK-IN GUEST'}
                    </Text>
                </View>
                <View className="items-center justify-center w-12 h-12 border bg-white/10 rounded-xl border-white/10">
                    <Clock size={12} color={timeInMinutes > 15 ? "#FCA5A5" : "white"} />
                    <Text className={`font-black mt-0.5 text-[10px] ${timeInMinutes > 15 ? 'text-red-300' : 'text-white'}`}>
                        {timeInMinutes}m
                    </Text>
                </View>
            </View>

            {/* Sub-Info */}
            <View className="flex-row items-center justify-between px-4 py-2 border-b bg-slate-50 border-slate-100">
                <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{order.orderType} • {order.paymentStatus}</Text>
                <Text className="text-[8px] font-black uppercase italic" style={{ color: settings.themePrimaryColor }}>{order.items.length} Items</Text>
            </View>

            {/* Notes Section - Compact */}
            {order.notes && (
                <View className="flex-row items-start p-2 mx-4 mt-3 border bg-amber-50 rounded-xl border-amber-100">
                    <MessageSquare size={10} color="#D97706" style={{ marginTop: 1 }} />
                    <Text className="text-[9px] font-bold text-amber-800 ml-2 italic flex-1" numberOfLines={2}>
                        "{order.notes}"
                    </Text>
                </View>
            )}

            {/* Checklist Items - Optimized for Vertical Space */}
            <ScrollView className="px-3 py-3 max-h-[300px]" showsVerticalScrollIndicator={false}>
                {order.items.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => onToggleItem(item.id, item.isReady)}
                        activeOpacity={0.6}
                        className={`flex-row items-center p-3 rounded-2xl mb-1.5 border ${item.isReady ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-50 shadow-sm'}`}
                    >
                        <View className={`w-6 h-6 rounded-lg border items-center justify-center ${item.isReady ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                            {item.isReady && <CheckCircle2 size={12} color="white" />}
                        </View>

                        <View className="flex-1 ml-3">
                            <Text className={`text-[11px] font-black uppercase italic ${item.isReady ? 'text-emerald-600/40 line-through' : 'text-slate-800'}`}>
                                {item.quantity}x {item.variant.product.name}
                            </Text>

                            {(item.variant && item.variant.name !== 'Default' || item.notes) && (
                                <View className="flex-row flex-wrap items-center mt-0.5 gap-2">
                                    {item.variant && item.variant.name !== 'Default' && (
                                        <Text className="text-[8px] font-black text-slate-400 uppercase">
                                            Mod: {item.variant.name}
                                        </Text>
                                    )}
                                    {item.notes && (
                                        <Text className="text-rose-500 text-[8px] font-black italic uppercase">
                                            Note: {item.notes}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Action Footer */}
            <View className="p-4 bg-white border-t border-slate-50">
                <TouchableOpacity
                    onPress={() => onProcess(order.id, order.status, order.items)}
                    disabled={!isReady && !allChecked}
                    className="w-full py-3.5 rounded-xl items-center flex-row justify-center shadow-md"
                    style={{
                        backgroundColor: isReady ? '#F59E0B' : allChecked ? settings.themePrimaryColor : '#F1F5F9',
                        opacity: (!isReady && !allChecked) ? 0.4 : 1
                    }}
                >
                    {isReady ? (
                        <>
                            <BellRing size={16} color="white" />
                            <Text className="ml-2 text-[10px] font-black tracking-widest text-white uppercase">Sajikan</Text>
                        </>
                    ) : (
                        <>
                            {allChecked ? <CheckCircle2 size={16} color="white" /> : <ChefHat size={16} color="#94A3B8" />}
                            <Text className={`ml-2 text-[10px] font-black tracking-widest uppercase ${allChecked ? 'text-white' : 'text-slate-400'}`}>
                                {allChecked ? 'Selesai Masak' : 'Proses...'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Progress Indicators */}
                <View className="flex-row justify-center gap-1 mt-3">
                    {order.items.map((it: any) => (
                        <View key={it.id} className={`h-1 flex-1 rounded-full ${it.isReady ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                    ))}
                </View>
            </View>
        </View>
    );
}