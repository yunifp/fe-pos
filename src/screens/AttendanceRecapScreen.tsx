import React, { useEffect, useState, createElement } from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import MainLayout from '../components/MainLayout';
import { useHRStore } from '../stores/hrStore';
import { Calendar, ArrowLeft, Download, Clock, History, User } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AttendanceRecapScreen({ navigation }: any) {
    const { attendanceHistory, fetchAttendanceHistory, isLoading } = useHRStore();
    const { width } = useWindowDimensions();

    // --- RESPONSIVE BREAKPOINTS ---
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [endDate, setEndDate] = useState(new Date());
    const [pickerMode, setPickerMode] = useState<'START' | 'END' | null>(null);

    useEffect(() => {
        fetchAttendanceHistory(startDate.toISOString(), endDate.toISOString());
    }, [startDate, endDate]);

    const DateButton = ({ label, date, mode }: { label: string, date: Date, mode: 'START' | 'END' }) => {
        const webId = `recap-date-${mode}`;
        return (
            <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-400 mb-1.5 ml-1 uppercase tracking-widest">{label}</Text>
                <View className="relative w-full h-11">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => Platform.OS === 'web' ? (document.getElementById(webId) as HTMLInputElement)?.showPicker() : setPickerMode(mode)}
                        className="flex-row items-center w-full h-full px-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                        <Calendar size={14} color="#6366F1" style={{ marginRight: 8 }} />
                        <Text className="text-xs font-bold text-slate-700">
                            {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </TouchableOpacity>
                    {Platform.OS === 'web' && createElement('input', {
                        id: webId, type: 'date', value: date.toISOString().split('T')[0],
                        onChange: (e: any) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) mode === 'START' ? setStartDate(d) : setEndDate(d);
                        },
                        style: { position: 'absolute', width: 0, height: 0, opacity: 0, zIndex: -1 }
                    })}
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const dateObj = new Date(item.clockIn);
        const inTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const outTime = item.clockOut ? new Date(item.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const isLate = item.status === 'LATE';

        return (
            <View style={{ width: `${100 / numColumns}%`, padding: 6 }}>
                <View className="p-3.5 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-1 mr-2">
                            <View className="flex-row items-center mb-0.5">
                                <User size={10} color="#94A3B8" />
                                <Text className="text-[13px] font-black text-slate-800 ml-1" numberOfLines={1}>
                                    {item.user?.fullName || 'User'}
                                </Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400">
                                {dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                        <View className={`px-2 py-1 rounded-lg ${isLate ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                            <Text className={`text-[8px] font-black ${isLate ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isLate ? 'TERLAMBAT' : 'HADIR'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row gap-2">
                        <View className="flex-row items-center flex-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                            <View>
                                <Text className="text-[7px] uppercase font-black text-slate-400">Masuk</Text>
                                <Text className="text-xs font-black text-slate-700">{inTime}</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center flex-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" />
                            <View>
                                <Text className="text-[7px] uppercase font-black text-slate-400">Pulang</Text>
                                <Text className="text-xs font-black text-slate-700">{outTime}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-white">
                {/* --- HEADER --- */}
                <View className="bg-white px-6 pt-4 pb-4 border-b border-slate-100">
                    <View className={`flex-row items-center justify-between ${isDesktop ? 'max-w-6xl mx-auto w-full' : ''}`}>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                className="p-2 mr-4 bg-slate-50 border border-slate-100 rounded-xl active:bg-slate-100"
                            >
                                <ArrowLeft size={18} color="#1E293B" />
                            </TouchableOpacity>
                            <View>
                                <Text className="text-lg font-black tracking-tighter text-slate-900">Rekap Presensi</Text>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">History Kehadiran</Text>
                            </View>
                        </View>

                        <TouchableOpacity className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 active:opacity-80">
                            <Download size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- CONTENT AREA --- */}
                <View className={`flex-1 ${isDesktop ? 'max-w-6xl mx-auto w-full' : ''}`}>

                    {/* --- FILTER SECTION --- */}
                    <View className="px-5 pt-5 pb-2">
                        <View className={`flex-row gap-3 p-4 bg-white border border-slate-100 shadow-sm rounded-3xl ${isTablet ? 'max-w-md self-start w-full' : ''}`}>
                            <DateButton label="Dari" date={startDate} mode="START" />
                            <DateButton label="Sampai" date={endDate} mode="END" />
                        </View>
                    </View>

                    {/* --- LIST AREA --- */}
                    <View className="flex-1 px-3">
                        {isLoading ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#6366F1" />
                                <Text className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Riwayat...</Text>
                            </View>
                        ) : (
                            <FlatList
                                key={numColumns} // Force re-render when column count changes
                                numColumns={numColumns}
                                data={attendanceHistory}
                                keyExtractor={item => item.id}
                                renderItem={renderItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
                                ListEmptyComponent={
                                    <View className="items-center justify-center mt-20 opacity-30">
                                        <History size={60} color="#94A3B8" strokeWidth={1} />
                                        <Text className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Data Tidak Ditemukan</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>

                {/* --- MOBILE PICKER --- */}
                {Platform.OS !== 'web' && pickerMode && (
                    <DateTimePicker
                        value={pickerMode === 'START' ? startDate : endDate}
                        mode="date"
                        display="default"
                        onChange={(e, date) => {
                            setPickerMode(null);
                            if (date) pickerMode === 'START' ? setStartDate(date) : setEndDate(date);
                        }}
                    />
                )}
            </View>
        </MainLayout>
    );
}