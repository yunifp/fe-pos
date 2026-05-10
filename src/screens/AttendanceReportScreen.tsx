import React, { useEffect, useState, useMemo, createElement } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FileText, Download, TrendingUp, AlertCircle, CheckCircle2, Calendar as CalendarIcon, ArrowRight, Filter } from 'lucide-react-native';

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import AttendanceLogCard from '../components/AttendanceLogCard';
import { useHRStore } from '../stores/hrStore';

// Komponen StatCard Lokal
const StatCard = ({ title, value, icon: Icon, color, bgColor }: any) => (
    <View className="flex-1 min-w-[100px] p-4 rounded-[24px] bg-white border border-slate-100 shadow-sm m-1.5">
        <View className={`w-10 h-10 ${bgColor} rounded-xl items-center justify-center mb-3`}>
            <Icon size={20} color={color} />
        </View>
        <Text className="text-[9px] font-black tracking-widest uppercase text-slate-400">{title}</Text>
        <Text className="mt-0.5 text-2xl font-black text-slate-900">{value}</Text>
    </View>
);

export default function AttendanceReportScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    const { attendanceReport, fetchAttendanceReport, isLoading, branches, fetchBranches, exportAttendance } = useHRStore();

    const [user, setUser] = useState<any>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState(''); // State Pencarian Nama Staff

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [activeRange, setActiveRange] = useState<number | 'custom' | 'today'>(7);
    const [showPicker, setShowPicker] = useState<'START' | 'END' | null>(null);

    useEffect(() => {
        const init = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setSelectedBranchId(parsed.branch.id);
                if (parsed.role === 'OWNER') await fetchBranches();

                const start = new Date();
                start.setDate(start.getDate() - 7);
                setStartDate(start);

                fetchAttendanceReport(start.toISOString(), new Date().toISOString(), parsed.branch.id);
            }
        };
        init();
    }, []);

    const handleBranchChange = (branchId: string) => {
        setSelectedBranchId(branchId);
        fetchAttendanceReport(startDate.toISOString(), endDate.toISOString(), branchId);
    };

    const applyShortcut = (mode: number | 'today') => {
        const end = new Date();
        const start = new Date();

        if (mode === 'today') {
            start.setHours(0, 0, 0, 0);
            setActiveRange('today');
        } else if (mode === 0) {
            start.setDate(1);
            setActiveRange(0);
        } else {
            start.setDate(end.getDate() - mode);
            setActiveRange(mode);
        }

        setStartDate(start);
        setEndDate(end);

        if (selectedBranchId) fetchAttendanceReport(start.toISOString(), end.toISOString(), selectedBranchId);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentType = showPicker;
        setShowPicker(null);

        if (selectedDate) {
            let newStart = startDate;
            let newEnd = endDate;

            if (currentType === 'START') {
                setStartDate(selectedDate);
                newStart = selectedDate;
            } else {
                setEndDate(selectedDate);
                newEnd = selectedDate;
            }

            setActiveRange('custom');
            if (selectedBranchId) fetchAttendanceReport(newStart.toISOString(), newEnd.toISOString(), selectedBranchId);
        }
    };

    // Logika Pencarian Nama Staff
    const filteredLogs = useMemo(() => {
        if (!attendanceReport?.data) return [];
        if (!searchQuery) return attendanceReport.data;
        return attendanceReport.data.filter((item: any) =>
            item.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [attendanceReport, searchQuery]);

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                {/* --- MENGGUNAKAN SCREEN HEADER (Re-usable) --- */}
                <ScreenHeader 
                    title="Laporan Presensi"
                    subtitle="Monitoring staff real-time"
                    subtitleIcon={<FileText size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari nama staff..."
                    userRole={user?.role}
                    branches={branches || []}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                <ScrollView className="flex-1" contentContainerStyle={{ padding: isDesktop ? 24 : 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* STATS SECTION */}
                    <View className="flex-row flex-wrap mb-6 -mx-1.5">
                        <StatCard title="Total Hadir" value={attendanceReport?.stats?.total || 0} icon={TrendingUp} color="#4F46E5" bgColor="bg-indigo-50" />
                        <StatCard title="Tepat Waktu" value={attendanceReport?.stats?.ontime || 0} icon={CheckCircle2} color="#10B981" bgColor="bg-emerald-50" />
                        <StatCard title="Terlambat" value={attendanceReport?.stats?.late || 0} icon={AlertCircle} color="#F43F5E" bgColor="bg-rose-50" />
                    </View>

                    {/* FILTER CARD */}
                    <View className="mb-6 bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        {/* Header Filter dengan Tombol Export */}
                        <View className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-50 bg-slate-50/50 flex-row justify-between items-center">
                            <View className="flex-row items-center">
                                <View className="p-2 bg-white rounded-lg border border-slate-100">
                                    <Filter size={14} color="#64748B" />
                                </View>
                                <Text className="ml-3 text-xs font-black text-slate-700 uppercase tracking-widest">Filter Data</Text>
                            </View>
                            
                            <TouchableOpacity
                                onPress={() => exportAttendance(startDate.toISOString(), endDate.toISOString(), selectedBranchId)}
                                className="bg-emerald-600 rounded-xl h-10 px-4 flex-row items-center justify-center shadow-md shadow-emerald-100 active:scale-95"
                            >
                                <Download size={14} color="white" />
                                <Text className="ml-2 text-[10px] font-black text-white uppercase tracking-widest">Export</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Content Filter */}
                        <View className="px-4 py-4 md:px-6 md:py-5 gap-4">
                            {/* Shortcuts */}
                            <View className="flex-row flex-wrap gap-2">
                                {[{ label: 'Hari Ini', val: 'today' }, { label: '7 Hari', val: 7 }, { label: '30 Hari', val: 30 }, { label: 'Bulan Ini', val: 0 }].map((item: any) => (
                                    <TouchableOpacity
                                        key={item.val} onPress={() => applyShortcut(item.val)} activeOpacity={0.7}
                                        className={`px-3 py-2 rounded-full border ${activeRange === item.val ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <Text className={`text-[10px] font-black uppercase tracking-tighter ${activeRange === item.val ? 'text-white' : 'text-slate-500'}`}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Date Range */}
                            <View className={`${isDesktop ? 'flex-row items-end' : 'flex-col'} gap-3`}>
                                <View className={isDesktop ? 'flex-1' : 'w-full'}>
                                    <Text className="text-[9px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">Dari</Text>
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: startDate.toISOString().split('T')[0],
                                            onChange: (e: any) => {
                                                const d = new Date(e.target.value); setStartDate(d); setActiveRange('custom');
                                                if (selectedBranchId) fetchAttendanceReport(d.toISOString(), endDate.toISOString(), selectedBranchId);
                                            },
                                            style: { width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker('START')} className="flex-row items-center h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 active:bg-slate-100">
                                            <CalendarIcon size={14} color="#6366f1" />
                                            <Text className="ml-2 text-[11px] font-bold text-slate-700 flex-1">{startDate.toLocaleDateString('id-ID')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isDesktop && <View className="pt-2 pb-3"><ArrowRight size={14} color="#cbd5e1" /></View>}

                                <View className={isDesktop ? 'flex-1' : 'w-full'}>
                                    <Text className="text-[9px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">Sampai</Text>
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: endDate.toISOString().split('T')[0],
                                            onChange: (e: any) => {
                                                const d = new Date(e.target.value); setEndDate(d); setActiveRange('custom');
                                                if (selectedBranchId) fetchAttendanceReport(startDate.toISOString(), d.toISOString(), selectedBranchId);
                                            },
                                            style: { width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker('END')} className="flex-row items-center h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 active:bg-slate-100">
                                            <CalendarIcon size={14} color="#6366f1" />
                                            <Text className="ml-2 text-[11px] font-bold text-slate-700 flex-1">{endDate.toLocaleDateString('id-ID')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* LOG TABLE */}
                    <View className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                        <View className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex-row items-center justify-between">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kehadiran</Text>
                            <View className="bg-indigo-600 px-2.5 py-1 rounded-full">
                                <Text className="text-[9px] font-bold text-white uppercase">{filteredLogs.length || 0} Data</Text>
                            </View>
                        </View>

                        {isLoading ? (
                            <View className="py-20"><ActivityIndicator size="large" color="#6366f1" /></View>
                        ) : (
                            <View className="p-2">
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((item: any, index: number) => (
                                        <AttendanceLogCard 
                                            key={item.id} 
                                            item={item} 
                                            isLast={index === filteredLogs.length - 1} 
                                        />
                                    ))
                                ) : (
                                    <EmptyState 
                                        icon={<FileText size={50} color="#CBD5E1" />} 
                                        message={searchQuery ? "Staff tidak ditemukan" : "Data Kosong"} 
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Native Picker (Mobile Only) */}
            {Platform.OS !== 'web' && showPicker && (
                <DateTimePicker
                    value={showPicker === 'START' ? startDate : endDate}
                    mode="date" display="default" onChange={onDateChange}
                />
            )}
        </MainLayout>
    );
}