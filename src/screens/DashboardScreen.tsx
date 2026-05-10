import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { DollarSign, Store, Activity, TrendingUp, Package, CreditCard, User, Clock, Wallet, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDashboardStore } from '../stores/dashboardStore';
import { useSettingStore } from '../stores/settingStore';
import MainLayout from '../components/MainLayout';

// --- KOMPONEN STAT CARD LOKAL ---
const DashboardStatCard = ({ title, value, subtitle, icon, colors }: any) => {
    return (
        <View
            style={{
                backgroundColor: colors[0],
                minHeight: 110,
                shadowColor: colors[0],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4
            }}
            className="p-5 rounded-[28px] relative overflow-hidden w-full"
        >
            <View className="absolute -right-2 -top-2 opacity-10 rotate-12 scale-[2.5]">
                {icon}
            </View>

            <View className="z-10 justify-between flex-1">
                <View>
                    <Text className="text-[10px] font-black text-white/70 uppercase tracking-[1.5px] mb-1">
                        {title}
                    </Text>
                    <Text
                        className="text-xl font-black tracking-tighter text-white md:text-2xl"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {value}
                    </Text>
                </View>
                {subtitle && (
                    <Text className="text-[9px] font-bold text-white/60 uppercase italic mt-2">
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
};

export default function DashboardScreen() {
    const { width: screenWidth } = useWindowDimensions();
    const { data, isLoading, fetchDashboard } = useDashboardStore();
    const { settings, fetchSettings } = useSettingStore();
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        fetchSettings();
        fetchDashboard();
        AsyncStorage.getItem('user').then(u => u && setUserData(JSON.parse(u)));
    }, []);

    const onRefresh = React.useCallback(() => fetchDashboard(), []);
    const formatMoney = (val: number) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

    const isTablet = screenWidth >= 768;
    const isDesktop = screenWidth >= 1024;

    const sidebarWidth = isDesktop ? 280 : 0;
    const horizontalPadding = isDesktop ? 80 : 40;
    const availableWidth = screenWidth - sidebarWidth - horizontalPadding;
    const chartWidth = isTablet ? (availableWidth / 2) - 15 : availableWidth - 10;

    const chartConfig = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        color: (opacity = 1) => settings.themePrimaryColor || `rgba(79, 70, 229, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        decimalPlaces: 0,
        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        propsForBackgroundLines: { strokeDasharray: "", stroke: "#F1F5F9" },
        propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" }
    };

    const renderHourlyChart = () => (
        <View style={{ width: isTablet ? '49.5%' : '100%' }} className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-[32px]">
            <View className="flex-row items-center justify-between mb-4">
                <View>
                    <Text className="text-base font-black tracking-tight uppercase text-slate-800">Trafik Jam Sibuk</Text>
                    <Text className="text-[10px] font-bold text-slate-400">Analisa keramaian hari ini</Text>
                </View>
                <View className="p-2 rounded-xl bg-amber-50">
                    <Activity size={18} color="#F59E0B" />
                </View>
            </View>
            {data?.hourlyTraffic ? (
                <View style={{ marginLeft: -15 }}>
                    <BarChart
                        data={{
                            labels: ["09", "11", "13", "15", "17", "19", "21"],
                            datasets: [{ data: data.hourlyTraffic.filter((_, i) => i >= 9 && i <= 21).map(d => d > 0 ? d : 0) }]
                        }}
                        width={chartWidth}
                        height={200}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})` }}
                        fromZero
                        style={{ borderRadius: 16 }}
                    />
                </View>
            ) : <Text className="py-10 font-bold text-center text-slate-300">Data tidak tersedia</Text>}
        </View>
    );

    const renderPaymentChart = () => {
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];
        const validData = data?.paymentMethods?.filter(pm => pm.total > 0) || [];
        const pieData = validData.map((pm, index) => ({
            name: pm.name,
            population: pm.total,
            color: colors[index % colors.length],
            legendFontColor: "#64748B",
            legendFontSize: 11
        }));

        return (
            <View style={{ width: isTablet ? '49.5%' : '100%' }} className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-[32px]">
                <View className="flex-row items-center justify-between mb-4">
                    <View>
                        <Text className="text-base font-black tracking-tight uppercase text-slate-800">Metode Bayar</Text>
                        <Text className="text-[10px] font-bold text-slate-400">Proporsi pendapatan</Text>
                    </View>
                    <View className="p-2 rounded-xl bg-emerald-50">
                        <CreditCard size={18} color="#10B981" />
                    </View>
                </View>
                {pieData.length > 0 ? (
                    <View className="items-center">
                        <PieChart
                            data={pieData}
                            width={chartWidth}
                            height={180}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={isDesktop ? "20" : "10"}
                            center={[0, 0]}
                            hasLegend={false}
                        />
                        <View className="flex-row flex-wrap justify-center gap-3 mt-4">
                            {pieData.map((item, index) => (
                                <View key={index} className="flex-row items-center">
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 6 }} />
                                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{item.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : <View className="items-center justify-center h-40"><Text className="italic font-bold text-slate-300">Belum ada transaksi</Text></View>}
            </View>
        );
    };

    const renderOwnerView = () => (
        <>
            <View className="flex-row flex-wrap mb-4 -mx-2">
                <View style={{ width: isDesktop ? '33.33%' : isTablet ? '50%' : '100%' }} className="p-2">
                    <DashboardStatCard title="Total Omzet Hari Ini" value={formatMoney(data?.summary?.revenue || 0)} subtitle={`Laba: ${formatMoney(data?.summary?.profit || 0)}`} icon={<DollarSign color="white" />} colors={[settings.themePrimaryColor || '#4F46E5', '#312E81']} />
                </View>
                <View style={{ width: isDesktop ? '33.33%' : isTablet ? '50%' : '100%' }} className="p-2">
                    <DashboardStatCard title="Total Transaksi" value={data?.summary?.transactions?.toString() || "0"} subtitle={`Avg: ${formatMoney(data?.summary?.avgBasketSize || 0)}`} icon={<Package color="white" />} colors={['#F59E0B', '#B45309']} />
                </View>
                <View style={{ width: isDesktop ? '33.33%' : '100%' }} className="p-2">
                    <DashboardStatCard title="Total Cabang" value={data?.type === 'OWNER_VIEW' ? `${data?.summary?.totalBranches}` : "1"} subtitle={data?.type === 'OWNER_VIEW' ? "Outlet beroperasi" : "Single Outlet"} icon={<Store color="white" />} colors={['#10B981', '#065F46']} />
                </View>
            </View>

            <View className="flex-row flex-wrap justify-between mb-4">
                <View style={{ width: isTablet ? '49.5%' : '100%' }} className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-[32px]">
                    <View className="flex-row justify-between mb-4">
                        <View>
                            <Text className="text-base font-black tracking-tight uppercase text-slate-800">Tren Penjualan</Text>
                            <Text className="text-[10px] font-bold text-slate-400">7 Hari Terakhir</Text>
                        </View>
                        <View className="p-2 rounded-xl bg-indigo-50">
                            <TrendingUp size={18} color={settings.themePrimaryColor} />
                        </View>
                    </View>
                    {data?.chart && data.chart.length > 0 ? (
                        <View style={{ marginLeft: -15 }}>
                            <LineChart
                                data={{ labels: data.chart.map(c => c.date), datasets: [{ data: data.chart.map(c => c.amount) }] }}
                                width={chartWidth}
                                height={200}
                                yAxisLabel=""
                                chartConfig={chartConfig}
                                bezier
                                style={{ borderRadius: 16 }}
                            />
                        </View>
                    ) : <View className="items-center justify-center h-40"><Text className="font-bold text-slate-300">Belum ada history</Text></View>}
                </View>
                {renderPaymentChart()}
            </View>

            <View className="flex-row flex-wrap justify-between">
                <View style={{ width: isTablet ? '49.5%' : '100%' }} className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-[32px]">
                    <Text className="mb-4 text-base font-black tracking-tight uppercase text-slate-800">Produk Terlaris</Text>
                    {data?.topProducts && data.topProducts.length > 0 ? data.topProducts.map((p, i) => (
                        <View key={i} className="flex-row items-center justify-between py-3 border-b border-slate-50 last:border-0">
                            <View className="flex-row items-center flex-1 mr-4">
                                <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${i === 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                    <Text className={`text-[10px] font-black ${i === 0 ? 'text-amber-700' : 'text-slate-500'}`}>{i + 1}</Text>
                                </View>
                                <Text className="flex-1 text-xs font-bold text-slate-700" numberOfLines={1}>{p.name}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-xs font-black text-slate-900">{p.qty} pcs</Text>
                                <Text className="text-[9px] font-bold text-slate-400">{formatMoney(Number(p.sales))}</Text>
                            </View>
                        </View>
                    )) : <Text className="py-4 font-bold text-center text-slate-300">Belum ada data produk</Text>}
                </View>
                {renderHourlyChart()}
            </View>
        </>
    );

    const renderCashierView = () => (
        <>
            <View className="flex-row flex-wrap mb-4 -mx-2">
                {/* Kartu 1 */}
                <View style={{ width: isTablet ? '50%' : '100%' }} className="p-2">
                    <DashboardStatCard
                        title="Penjualan Hari Ini"
                        value={formatMoney(data?.myTotalSales || 0)}
                        subtitle={`${data?.transactionCount || 0} Transaksi`}
                        icon={<Wallet color="white" />}
                        colors={[settings.themePrimaryColor || '#4F46E5', '#4338ca']}
                    />
                </View>

                {/* Kartu 2 - PERBAIKAN: Hapus h-full agar tidak merusak scroll */}
                <View style={{ width: isTablet ? '50%' : '100%' }} className="p-2">
                    <View
                        style={{ minHeight: 110 }} // Samakan dengan minHeight StatCard
                        className="justify-center p-5 bg-white border border-gray-100 shadow-sm rounded-[28px]"
                    >
                        <View className="flex-row items-center mb-2">
                            <Clock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Aktif</Text>
                        </View>
                        <Text className="text-sm font-black text-slate-800" numberOfLines={1}>{data?.shiftName || '-'}</Text>
                        <Text className="mt-1 text-xs font-bold text-slate-400">{data?.shiftTime || 'Belum ada shift'}</Text>
                    </View>
                </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
                <View style={{ width: isTablet ? '49.5%' : '100%' }} className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-[32px]">
                    <Text className="mb-4 text-base font-black tracking-tight uppercase text-slate-800">Transaksi Terakhir</Text>
                    {data?.recentOrders && data.recentOrders.length > 0 ? data.recentOrders.map((ord, i) => (
                        <View key={i} className="flex-row items-center justify-between py-3 border-b border-slate-50 last:border-0">
                            <View className="flex-1 mr-4">
                                <Text className="text-xs font-black text-slate-700">{ord.invoiceNumber}</Text>
                                <Text className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    {new Date(ord.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • <Text className="text-indigo-500 uppercase">{ord.paymentMethod}</Text>
                                </Text>
                            </View>
                            <Text className="text-sm font-black text-indigo-600">{formatMoney(Number(ord.totalAmount))}</Text>
                        </View>
                    )) : <Text className="py-4 font-bold text-center text-slate-300">Belum ada transaksi</Text>}
                </View>
                {renderHourlyChart()}
            </View>
        </>
    );

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50/50">
                {/* Header Mobile Tetap di Atas */}
                <View className="z-10 flex-row items-center justify-between px-6 py-4 bg-white shadow-sm md:hidden">
                    <Text className="text-xl font-black tracking-tighter uppercase text-slate-900">Dashboard</Text>
                    <View className="items-center justify-center rounded-full w-9 h-9 bg-slate-900">
                        <Text className="text-xs font-black text-white">{userData?.name?.charAt(0)}</Text>
                    </View>
                </View>

                {/* --- CONTAINER SCROLL UTAMA --- */}
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        padding: isDesktop ? 40 : 20,
                        paddingBottom: 150, // Tambahkan padding bawah lebih besar agar tidak tertutup navbar
                        flexGrow: 1
                    }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[settings.themePrimaryColor]} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-row items-end justify-between mb-8">
                        <View>
                            <Text className="mb-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                {data?.type === 'CASHIER_VIEW' ? 'Panel Operasional Kasir' : 'Ringkasan Eksekutif Bisnis'}
                            </Text>
                            <Text className="text-3xl font-black tracking-tighter text-slate-900">
                                Hi, {userData?.name?.split(' ')[0]} 👋
                            </Text>
                        </View>
                        <View className="px-4 py-2 bg-white border shadow-sm border-slate-100 rounded-2xl">
                            <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>

                    {isLoading && !data ? (
                        <View className="items-center justify-center flex-1" style={{ minHeight: 400 }}>
                            <ActivityIndicator size="large" color={settings.themePrimaryColor || '#4F46E5'} />
                        </View>
                    ) : (
                        data?.type === 'OWNER_VIEW' ? renderOwnerView() : renderCashierView()
                    )}
                </ScrollView>
            </View>
        </MainLayout>
    );
}