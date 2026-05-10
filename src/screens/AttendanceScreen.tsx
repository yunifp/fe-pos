import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, Alert, ActivityIndicator,
    Platform, ScrollView, useWindowDimensions, FlatList
} from 'react-native';
import MainLayout from '../components/MainLayout';
import { useHRStore } from '../stores/hrStore';
import {
    Camera, LogOut, CheckCircle, Lock, AlertTriangle,
    RefreshCw, Clock, MapPin, Calendar, List
} from 'lucide-react-native';
import { CustomToast } from '../components/CustomToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../api/api';
import { useIsFocused } from '@react-navigation/native';

// Pure function for distance calculation
const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
    const la1 = Number(lat1);
    const lo1 = Number(lon1);
    const la2 = Number(lat2);
    const lo2 = Number(lon2);
    if (!la1 || !lo1 || !la2 || !lo2) return 999999;
    const R = 6371e3;
    const φ1 = la1 * Math.PI / 180;
    const φ2 = la2 * Math.PI / 180;
    const Δφ = (la2 - la1) * Math.PI / 180;
    const Δλ = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

declare global {
    var cleanupAttendanceGPS: (() => void) | undefined;
}

export default function AttendanceScreen({ navigation }: any) {
    const isFocused = useIsFocused();
    const { width, height } = useWindowDimensions();

    // BREAKPOINTS
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;
    const isLandscape = width > height;

    const {
        todayAttendance, fetchTodayAttendance, performClockIn,
        performClockOut, isLoading, fetchUserSchedules, userSchedules
    } = useHRStore();

    const [activeTab, setActiveTab] = useState<'ABSENSI' | 'JADWAL'>('ABSENSI');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [user, setUser] = useState<any>(null);
    const [branchConfig, setBranchConfig] = useState<{ lat: number, long: number, radius: number } | null>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [locationStatus, setLocationStatus] = useState<'IDLE' | 'LOADING' | 'OK' | 'OUT_OF_RANGE' | 'FAKE_GPS' | 'PERMISSION_DENIED' | 'GPS_OFF' | 'CONFIG_ERROR'>('IDLE');
    const [distance, setDistance] = useState<number>(0);

    const [clockStatus, setClockStatus] = useState({ canClockIn: false, message: 'Memuat...', isEarly: false, isNoShift: false });
    const isMounted = useRef(true);

    const getOneShotLocation = async (configOverride?: any) => {
        if (!isMounted.current) return;
        const activeConfig = configOverride || branchConfig;

        if (!activeConfig) {
            Alert.alert("Konfigurasi Error", "Data cabang belum tersedia. Mencoba memuat ulang...");
            syncData();
            return;
        }

        setLocationStatus('LOADING');

        try {
            // 1. Cek Izin
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationStatus('PERMISSION_DENIED');
                return;
            }

            // 2. Cek Layanan GPS
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                setLocationStatus('GPS_OFF');
                if (Platform.OS !== 'web') {
                    Alert.alert("GPS Mati", "Harap aktifkan GPS pada pengaturan HP Anda.");
                }
                return;
            }

            // 3. Ambil Lokasi dengan opsi Akurasi yang diperketat
            // Menggunakan timeout agar aplikasi tidak stuck jika satelit tidak ditemukan
            const locationPromise = Location.getCurrentPositionAsync({
                // Untuk Android, Balanced seringkali lebih stabil daripada High di dalam gedung
                accuracy: Platform.OS === 'android' ? Location.Accuracy.Balanced : Location.Accuracy.High,
            });
            
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject({ code: 'E_LOCATION_TIMEOUT' }), 15000)
            );
            
            const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;

            if (isMounted.current) {
                // Validasi tambahan: Jika akurasi lokasi sangat buruk (misal > 100 meter)
                // Anda bisa memberi peringatan kepada user
                if (location.coords.accuracy && location.coords.accuracy > 100) {
                    console.log("Akurasi rendah detected:", location.coords.accuracy);
                }

                handleNewLocation(location, activeConfig);
            }
        } catch (error: any) {
            if (isMounted.current) {
                // Tangani error timeout spesifik
                if (error.code === 'E_LOCATION_TIMEOUT') {
                    Alert.alert("Waktu Habis", "Sinyal GPS lemah. Pastikan Anda berada di area terbuka.");
                } else {
                    setLocationStatus('GPS_OFF');
                    Alert.alert("Gagal Sinkron", "Tidak dapat mengambil lokasi. Pastikan GPS aktif.");
                }
            }
        }
    };

    const cleanupGPS = () => { setLocationStatus('IDLE'); };

    useEffect(() => {
        isMounted.current = true;
        global.cleanupAttendanceGPS = () => cleanupGPS();
        if (isFocused) { syncData(); } else { cleanupGPS(); }
        return () => {
            isMounted.current = false;
            cleanupGPS();
            global.cleanupAttendanceGPS = undefined;
        };
    }, [isFocused]);

    const syncData = async () => {
        try {
            if (!isMounted.current) return;
            await fetchTodayAttendance();
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser && isMounted.current) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Ambil Jadwal User
                fetchUserSchedules(parsedUser.id);

                const targetBranchId = parsedUser.branchId || parsedUser.branch?.id;
                if (!targetBranchId) throw new Error("No Branch ID");
                const res = await api.get(`/branches/${targetBranchId}?nocache=${Date.now()}`);
                if (isMounted.current) {
                    const config = {
                        lat: parseFloat(String(res.data.latitude).trim()),
                        long: parseFloat(String(res.data.longitude).trim()),
                        radius: parseInt(res.data.radius) || 100
                    };
                    setBranchConfig(config);
                    getOneShotLocation(config);
                }
            }
        } catch (error) {
            if (isMounted.current) setLocationStatus('CONFIG_ERROR');
        }
    };

    const handleNewLocation = (newLocation: Location.LocationObject, config: { lat: number, long: number, radius: number }) => {
        if (!isMounted.current || !newLocation || !config) return;
        if (!newLocation.coords.latitude || !newLocation.coords.longitude) {
            setLocationStatus('GPS_OFF');
            return;
        }
        if (newLocation.mocked) {
            setLocationStatus('FAKE_GPS');
            return;
        }
        setUserLocation(newLocation);
        const dist = calculateDistance(
            newLocation.coords.latitude,
            newLocation.coords.longitude,
            config.lat,
            config.long
        );
        if (isMounted.current) {
            setDistance(dist);
            setLocationStatus(dist <= config.radius ? 'OK' : 'OUT_OF_RANGE');
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            if (isMounted.current) setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isMounted.current) validateShiftTime(currentTime);
    }, [currentTime, todayAttendance]);

    const validateShiftTime = (now: Date) => {
        const shift = todayAttendance?.shift;
        const attendance = todayAttendance?.attendance;
        if (attendance?.clockIn) { setClockStatus({ canClockIn: false, message: 'Sudah Masuk', isEarly: false, isNoShift: false }); return; }
        if (!shift) { setClockStatus({ canClockIn: false, message: 'Tidak ada jadwal', isEarly: false, isNoShift: true }); return; }
        const [h, m] = shift.startTime.split(':');
        const shiftStart = new Date();
        shiftStart.setHours(parseInt(h), parseInt(m), 0, 0);
        const BUFFER_MINUTES = 60;
        const allowedStart = new Date(shiftStart.getTime() - BUFFER_MINUTES * 60000);
        if (now < allowedStart) {
            const diffMins = Math.ceil((allowedStart.getTime() - now.getTime()) / 60000);
            setClockStatus({ canClockIn: false, message: `Buka dlm ${diffMins} mnt`, isEarly: true, isNoShift: false });
        } else {
            setClockStatus({ canClockIn: true, message: now > shiftStart ? 'Terlambat' : 'Hadir', isEarly: false, isNoShift: false });
        }
    };

    const handleClockIn = async () => {
        if (!clockStatus.canClockIn) { Alert.alert("Jadwal Belum Dibuka", clockStatus.message); return; }
        if (locationStatus !== 'OK' || !userLocation) {
            Alert.alert("Lokasi Belum Sesuai", `Harap sinkronkan lokasi kembali di dalam area cabang.`);
            return;
        }
        try {
            await performClockIn({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                notes: "Presensi Mobile",
                photoUrl: ""
            });
            setToast({ visible: true, message: "Absen Masuk Berhasil!", type: 'success' });
            await fetchTodayAttendance();
        } catch (e: any) {
            Alert.alert("Gagal", e.response?.data?.message || "Terjadi kesalahan.");
        }
    };

    const handleClockOut = async () => {
        if (!userLocation) {
            Alert.alert("Lokasi Diperlukan", "Harap sinkronkan lokasi sebelum absen pulang.");
            return;
        }
        try {
            await performClockOut({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
            });
            setToast({ visible: true, message: "Absen Pulang Berhasil!", type: 'success' });
            await fetchTodayAttendance();
        } catch (e: any) {
            Alert.alert("Gagal", e.response?.data?.message || "Terjadi kesalahan.");
        }
    };

    const isClockedIn = !!todayAttendance?.attendance?.clockIn;
    const isClockedOut = !!todayAttendance?.attendance?.clockOut;
    const shiftData = todayAttendance?.shift;

    const locUI = {
        IDLE: { color: 'bg-slate-50 border-slate-100', text: 'text-slate-600', icon: MapPin, label: 'Siap Sinkronisasi' },
        LOADING: { color: 'bg-blue-50 border-blue-100', text: 'text-blue-600', icon: RefreshCw, label: 'Mencari Lokasi...' },
        FAKE_GPS: { color: 'bg-red-50 border-red-100', text: 'text-red-600', icon: AlertTriangle, label: 'Fake GPS!' },
        CONFIG_ERROR: { color: 'bg-orange-50 border-orange-100', text: 'text-orange-600', icon: MapPin, label: 'Config Error' },
        OUT_OF_RANGE: { color: 'bg-rose-50 border-rose-100', text: 'text-rose-600', icon: AlertTriangle, label: `Luar Area (${distance}m)` },
        PERMISSION_DENIED: { color: 'bg-slate-50 border-slate-100', text: 'text-slate-600', icon: Lock, label: 'Izin Ditolak' },
        GPS_OFF: { color: 'bg-slate-50 border-slate-100', text: 'text-slate-600', icon: RefreshCw, label: 'GPS Mati' },
        OK: { color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600', icon: CheckCircle, label: `Lokasi OK (${distance}m)` },
    }[locationStatus] || { color: 'bg-gray-50', text: 'text-gray-500', icon: MapPin, label: 'Mencari...' };

    const mainButtonSize = isDesktop ? 300 : isTablet ? 260 : 210;

    return (
        <MainLayout>
            <View className="flex-1 bg-white">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                <View className="flex-1">
                    <View className={`p-5 md:px-10 pt-6 ${isDesktop ? 'max-w-6xl mx-auto w-full' : ''}`}>

                        {/* --- HEADER --- */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-1">
                                <Text className="text-3xl font-black tracking-tighter text-slate-900">Attendance</Text>
                                <View className="flex-row items-center mt-0.5">
                                    <View className="w-1.5 h-1.5 mr-2 rounded-full bg-emerald-500" />
                                    <Text className="text-[10px] font-black tracking-widest uppercase text-slate-400" numberOfLines={1}>
                                        {user?.branch?.name || 'Cabang...'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AttendanceRecap')}
                                className="px-4 py-2 border border-slate-100 bg-slate-50 rounded-xl active:bg-slate-100"
                            >
                                <Text className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Riwayat</Text>
                            </TouchableOpacity>
                        </View>

                        {/* --- TAB SELECTOR --- */}
                        <View className="flex-row p-1.5 bg-slate-100 rounded-2xl mb-8">
                            <TouchableOpacity
                                onPress={() => setActiveTab('ABSENSI')}
                                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${activeTab === 'ABSENSI' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Camera size={14} color={activeTab === 'ABSENSI' ? '#4F46E5' : '#94A3B8'} />
                                <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${activeTab === 'ABSENSI' ? 'text-slate-900' : 'text-slate-400'}`}>Presensi</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('JADWAL')}
                                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${activeTab === 'JADWAL' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Calendar size={14} color={activeTab === 'JADWAL' ? '#4F46E5' : '#94A3B8'} />
                                <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${activeTab === 'JADWAL' ? 'text-slate-900' : 'text-slate-400'}`}>Jadwal Saya</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {activeTab === 'ABSENSI' ? (
                        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                            <View className={`flex-1 p-5 md:p-10 pt-0 ${isDesktop ? 'max-w-6xl mx-auto w-full' : ''}`}>

                                {/* --- TOP ACTION BAR --- */}
                                <TouchableOpacity
                                    onPress={() => getOneShotLocation()}
                                    disabled={locationStatus === 'LOADING'}
                                    className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center mb-10 border ${locationStatus === 'LOADING' ? 'bg-slate-50 border-slate-100' : 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-200'}`}
                                >
                                    {locationStatus === 'LOADING' ? (
                                        <ActivityIndicator size="small" color="#4F46E5" />
                                    ) : (
                                        <>
                                            <RefreshCw size={16} color="white" />
                                            <Text className="ml-2.5 text-xs font-black tracking-widest text-white uppercase">Sinkron Lokasi</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View className={`${isTablet || (isLandscape && !isDesktop) ? 'flex-row items-center justify-between' : 'flex-col'}`}>
                                    <View className={`${isTablet || (isLandscape && !isDesktop) ? 'flex-1 items-start' : 'items-center mb-12'}`}>
                                        <Text className="font-black tracking-tighter text-7xl md:text-8xl text-slate-800" style={{ fontVariant: ['tabular-nums'] }}>
                                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text className="text-sm font-bold tracking-[4px] uppercase text-slate-400 mb-8">
                                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </Text>

                                        <View className={`py-3 px-5 rounded-2xl border flex-row items-center mb-4 ${locUI.color}`}>
                                            {locationStatus === 'LOADING' ? <ActivityIndicator size="small" color="#2563EB" /> : <locUI.icon size={16} color={locationStatus === 'OK' ? '#059669' : '#e11d48'} />}
                                            <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${locUI.text}`}>{locUI.label}</Text>
                                        </View>

                                        <View className="flex-row items-center px-4 py-2 border bg-slate-50 border-slate-100 rounded-xl">
                                            <Clock size={14} color="#6366f1" />
                                            <Text className="ml-2 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                                {shiftData ? `${shiftData.name} (${shiftData.startTime} - ${shiftData.endTime})` : 'Jadwal: Libur'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className={`${isTablet || (isLandscape && !isDesktop) ? 'flex-1 items-end' : 'items-center'}`}>
                                        {isLoading ? (
                                            <View style={{ width: mainButtonSize, height: mainButtonSize }} className="items-center justify-center">
                                                <ActivityIndicator size="large" color="#4338ca" />
                                            </View>
                                        ) : (
                                            <>
                                                {!isClockedIn ? (
                                                    <TouchableOpacity
                                                        onPress={handleClockIn}
                                                        activeOpacity={0.8}
                                                        style={{ width: mainButtonSize, height: mainButtonSize }}
                                                        disabled={locationStatus !== 'OK' || !clockStatus.canClockIn}
                                                        className={`rounded-full border-[10px] items-center justify-center shadow-2xl transition-all ${locationStatus === 'OK' && clockStatus.canClockIn
                                                            ? 'bg-indigo-600 border-indigo-100 shadow-indigo-400'
                                                            : 'bg-slate-100 border-slate-50 shadow-none opacity-60'}`}
                                                    >
                                                        <Camera size={mainButtonSize * 0.22} color="white" />
                                                        <Text className="mt-2 text-3xl font-black text-white">TAP IN</Text>
                                                        <View className="px-3 py-1 mt-2 border rounded-full bg-white/20 border-white/30">
                                                            <Text className="text-white text-[8px] font-black uppercase tracking-widest">{clockStatus.message}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ) : !isClockedOut ? (
                                                    <TouchableOpacity
                                                        onPress={handleClockOut}
                                                        activeOpacity={0.8}
                                                        style={{ width: mainButtonSize, height: mainButtonSize }}
                                                        className="rounded-full border-[10px] bg-rose-500 border-rose-100 items-center justify-center shadow-2xl shadow-rose-300 active:scale-95"
                                                    >
                                                        <LogOut size={mainButtonSize * 0.22} color="white" />
                                                        <Text className="mt-2 text-3xl font-black tracking-tighter text-white">TAP OUT</Text>
                                                        <Text className="text-rose-100 text-[9px] font-black uppercase tracking-widest mt-1">Selesai Kerja</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={{ width: mainButtonSize, height: mainButtonSize }} className="items-center justify-center border-[2px] border-dashed rounded-full bg-emerald-50 border-emerald-200">
                                                        <CheckCircle size={mainButtonSize * 0.35} color="#10b981" />
                                                        <Text className="mt-3 text-2xl font-black tracking-tighter uppercase text-emerald-700">Selesai!</Text>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                </View>

                                <View className="items-center pt-10 mt-auto">
                                    <View className="flex-row items-center px-5 py-2.5 border bg-slate-50 rounded-2xl border-slate-100">
                                        <MapPin size={12} color="#94a3b8" />
                                        <Text className="ml-2 text-[10px] font-bold text-slate-500 tabular-nums">
                                            {userLocation ? `${userLocation.coords.latitude.toFixed(6)}, ${userLocation.coords.longitude.toFixed(6)}` : 'Belum Sinkron'}
                                        </Text>
                                        {userLocation?.coords.accuracy && (
                                            <Text className="ml-2 pl-2 border-l border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                                                Acc: ±{userLocation.coords.accuracy.toFixed(0)}m
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    ) : (
                        /* --- JADWAL SAYA TAB --- */
                        <FlatList
                            data={userSchedules}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                            ListEmptyComponent={
                                <View className="items-center justify-center py-20 opacity-20">
                                    <List size={64} color="#94A3B8" />
                                    <Text className="mt-4 font-black tracking-widest uppercase text-slate-500">Belum ada jadwal</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View className="mb-4 bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="px-3 py-1 rounded-lg bg-indigo-50">
                                            <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long' })}
                                            </Text>
                                        </View>
                                        <Text className="text-[10px] font-bold text-slate-400">
                                            {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center justify-between">
                                        <View>
                                            <Text className="text-lg italic font-black uppercase text-slate-800">{item.shift.name}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <Clock size={12} color="#6366F1" />
                                                <Text className="ml-1.5 text-xs font-bold text-slate-500">
                                                    {item.shift.startTime} - {item.shift.endTime}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-center justify-center w-10 h-10 border rounded-full bg-slate-50 border-slate-100">
                                            <Calendar size={18} color="#CBD5E1" />
                                        </View>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </MainLayout>
    );
}