import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Linking, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    LayoutDashboard, ShoppingCart, Package, Users, Settings,
    LogOut, ChevronLeft, ChevronRight, Store, X,
    Tag, Clock, ClipboardList, BarChart3,
    Printer, HistoryIcon, LoaderCircleIcon, Download, QrCode, UserCircle
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingStore } from '../stores/settingStore';
import api from '../api/api';

interface Props {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    userRole?: string;
    isMobile?: boolean;
    closeMobileMenu?: () => void;
}

const Sidebar: React.FC<Props> = ({ isCollapsed, toggleCollapse, userRole, isMobile, closeMobileMenu }) => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { settings } = useSettingStore();
    const [branchName, setBranchName] = useState<string>('');

    const [isDownloading, setIsDownloading] = useState(false);
    const [hasNewUpdate, setHasNewUpdate] = useState(false);

    // --- REFS PERBAIKAN ---
    const scrollRef = useRef<ScrollView>(null);
    const itemPositions = useRef<{ [key: string]: number }>({});
    const groupOffsets = useRef<{ [key: number]: number }>({}); // Mencatat posisi tiap grup

    const primaryColor = settings.themePrimaryColor || '#1e293b';
    const secondaryColor = settings.themeSecondaryColor || '#6366f1';

    // --- FUNGSI SCROLL (DENGAN PENANGANAN TIMING) ---
    const executeScroll = () => {
        const activeRoute = route.name;
        const yPos = itemPositions.current[activeRoute];

        if (yPos !== undefined && scrollRef.current) {
            scrollRef.current.scrollTo({
                y: yPos - 80, // Offset agar tidak terlalu mepet ke atas
                animated: true,
            });
        }
    };

    useEffect(() => {
        // Coba scroll segera setelah rute berubah
        const timer = setTimeout(executeScroll, 300);
        return () => clearTimeout(timer);
    }, [route.name]);

    useEffect(() => {
        const checkForNewUpdate = async () => {
            try {
                const response = await api.get('/download/latest-apk');
                if (response.data.success && response.data.createdAt) {
                    const latestUpdateServer = response.data.createdAt;

                    // Ambil info kapan terakhir kali user melakukan update dari memori HP
                    const lastSeenUpdate = await AsyncStorage.getItem('LAST_SEEN_UPDATE_TIME');

                    // Jika timestamp dari server TIDAK SAMA dengan yang terakhir dilihat/download
                    // Berarti benar-benar ada file baru
                    if (latestUpdateServer !== lastSeenUpdate) {
                        setHasNewUpdate(true);
                    } else {
                        setHasNewUpdate(false);
                    }
                }
            } catch (e) {
                console.log("Silent error checking update badge");
            }
        };
        checkForNewUpdate();
    }, []);

    useEffect(() => {
        const getBranchData = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    if (parsed.branch?.name) setBranchName(parsed.branch.name);
                }
            } catch (e) { }
        };
        getBranchData();
    }, []);

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch (e) { navigation.navigate('Login'); }
    };

    const handleDownloadAPK = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const response = await api.get('/download/latest-apk');
            if (response.data.success && response.data.url) {

                // 1. Simpan timestamp file ini ke AsyncStorage sebagai versi "terakhir didownload"
                await AsyncStorage.setItem('LAST_SEEN_UPDATE_TIME', response.data.createdAt);

                // 2. Matikan badge update
                setHasNewUpdate(false);

                await Linking.openURL(response.data.url);
            } else {
                Alert.alert("Gagal", "Link download tidak ditemukan.");
            }
        } catch (error) {
            Alert.alert("Error", "Gagal menghubungi server.");
        } finally { setIsDownloading(false); }
    };

    const menuGroups = useMemo(() => [
        {
            title: 'OVERVIEW',
            items: [{ name: 'Dashboard', icon: LayoutDashboard, route: 'Dashboard', roles: ['CASHIER', 'KITCHEN', 'WAITER', 'OWNER', 'MANAGER'] }]
        },
        {
            title: 'KATALOG & PENJUALAN',
            items: [
                { name: 'POS', icon: ShoppingCart, route: 'POS', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
                { name: 'Riwayat Pesanan', icon: HistoryIcon, route: 'OrderHistory', roles: ['CASHIER', 'KITCHEN', 'WAITER', 'OWNER', 'MANAGER'] },
                { name: 'Antrian & Order', icon: LoaderCircleIcon, route: 'KDS', roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'] },
            ]
        },
        {
            title: 'CRM & Keuangan',
            items: [
                { name: 'Produk', icon: Package, route: 'Products', roles: ['OWNER', 'MANAGER'] },
                { name: 'Kategori', icon: Tag, route: 'Categories', roles: ['OWNER', 'MANAGER'] },
                { name: 'Stok Produk', icon: ClipboardList, route: 'Inventory', roles: ['OWNER', 'MANAGER'] },
                { name: 'Promo & Diskon', icon: ShoppingCart, route: 'Promotions', roles: ['OWNER', 'MANAGER'] },
                { name: 'Member', icon: Users, route: 'Members', roles: ['CASHIER', 'OWNER', 'MANAGER'] },
                { name: 'Arus Kas', icon: BarChart3, route: 'CashFlow', roles: ['OWNER', 'MANAGER'] },
                { name: 'Kelola Belanja', icon: ClipboardList, route: 'Expenses', roles: ['OWNER', 'MANAGER'] },
            ]
        },
        {
            title: 'OPERASIONAL',
            items: [
                { name: 'Kelola Cabang', icon: Store, route: 'Branches', roles: ['OWNER'] },
                { name: 'QR Meja', icon: QrCode, route: 'QrGenerator', roles: ['OWNER', 'MANAGER'] },
                { name: 'Karyawan', icon: Users, route: 'Employees', roles: ['OWNER', 'MANAGER'] },
                { name: 'Shift', icon: ClipboardList, route: 'ShiftManagement', roles: ['OWNER', 'MANAGER'] },
                { name: 'Absensi & Jadwal', icon: Clock, route: 'Attendance', roles: ['CASHIER', 'KITCHEN', 'WAITER', 'OWNER', 'MANAGER'] },
            ]
        },
        {
            title: 'LAPORAN',
            items: [
                { name: 'Lap. Absensi', icon: BarChart3, route: 'AttendanceReport', roles: ['OWNER', 'MANAGER'] },
                { name: 'Lap. Penjualan', icon: BarChart3, route: 'SalesReport', roles: ['OWNER', 'MANAGER'] },
                { name: 'Lap. Keuangan', icon: BarChart3, route: 'FinancialReport', roles: ['OWNER', 'MANAGER'] },
            ]
        },
        {
            title: 'SISTEM',
            items: [
                { name: 'Pengaturan', icon: Settings, route: 'Settings', roles: ['OWNER', 'MANAGER'] },
                { name: 'Printer & Struk', icon: Printer, route: 'ReceiptSetting', roles: ['OWNER', 'MANAGER'] },
            ]
        }
    ], []);

    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => !userRole || item.roles.includes(userRole))
    })).filter(group => group.items.length > 0);

    const widthStyle = isMobile ? '100%' : (isCollapsed ? 80 : 280);

    return (
        <View className="flex-col h-full border-r border-slate-800" style={{ width: widthStyle, backgroundColor: primaryColor }}>
            {/* --- HEADER --- */}
            <View className="flex-row items-center justify-between h-[70px] px-4 border-b border-slate-800 bg-slate-900">
                <View className="flex-row items-center flex-1 overflow-hidden">
                    <View className="items-center justify-center border rounded-lg w-9 h-9 bg-slate-800 border-slate-700">
                        {settings.logoUrl ? <Image source={{ uri: settings.logoUrl }} className="rounded-full w-7 h-7" resizeMode="contain" /> : <Store color={secondaryColor} size={18} />}
                    </View>
                    {(!isCollapsed || isMobile) && (
                        <View className="justify-center flex-1 ml-3">
                            <Text className="text-sm font-bold text-white" numberOfLines={1}>{settings.storeName || 'EPS POS'}</Text>
                            <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{userRole || 'User'}</Text>
                        </View>
                    )}
                </View>
                {isMobile && closeMobileMenu && (
                    <TouchableOpacity onPress={closeMobileMenu} className="p-2 ml-2 rounded-full bg-slate-800">
                        <X color="white" size={18} />
                    </TouchableOpacity>
                )}
            </View>

            {/* --- SCROLLABLE MENU --- */}
            <ScrollView
                ref={scrollRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 16, paddingBottom: 20 }}
            >
                {filteredGroups.map((group, groupIndex) => (
                    <View
                        key={groupIndex}
                        className="mb-5"
                        // MENCATAT POSISI GRUP
                        onLayout={(e) => groupOffsets.current[groupIndex] = e.nativeEvent.layout.y}
                    >
                        {(!isCollapsed || isMobile) && (
                            <Text className="px-5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {group.title}
                            </Text>
                        )}
                        {isCollapsed && !isMobile && groupIndex > 0 && <View className="h-[1px] bg-slate-800 mx-4 mb-3" />}

                        {group.items.map((item, itemIndex) => {
                            const isActive = route.name === item.route;
                            return (
                                <TouchableOpacity
                                    key={itemIndex}
                                    // PERBAIKAN: Hitung posisi relatif item + posisi grup
                                    onLayout={(e) => {
                                        const itemY = e.nativeEvent.layout.y;
                                        const groupY = groupOffsets.current[groupIndex] || 0;
                                        itemPositions.current[item.route] = itemY + groupY;
                                    }}
                                    onPress={() => {
                                        navigation.navigate(item.route);
                                        if (isMobile && closeMobileMenu) closeMobileMenu();
                                    }}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center py-3 mx-2 mb-1 rounded-lg ${isActive ? 'bg-slate-800' : ''}`}
                                >
                                    {isActive && <View className="absolute left-0 w-[3px] rounded-r-full top-2 bottom-2" style={{ backgroundColor: secondaryColor }} />}
                                    <View className={`items-center justify-center w-10 ${(!isCollapsed || isMobile) ? '' : 'mx-auto'}`}>
                                        <item.icon size={isCollapsed && !isMobile ? 22 : 18} color={isActive ? secondaryColor : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} style={{ opacity: isActive ? 1 : 0.8 }} />
                                    </View>
                                    {(!isCollapsed || isMobile) && <Text className={`flex-1 ml-1 text-xs ${isActive ? 'text-white font-bold' : 'text-slate-400 font-medium'}`}>{item.name}</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}

                <View className="px-2 mt-2 mb-4">
                    <TouchableOpacity onPress={handleDownloadAPK} className={`flex-row items-center rounded-lg border border-emerald-900/50 bg-emerald-900/20 relative ${isCollapsed && !isMobile ? 'justify-center p-2' : 'px-3 py-3'}`}>
                        {hasNewUpdate && <View className="absolute -top-2 -right-1 bg-rose-500 px-1.5 py-0.5 rounded-md shadow-sm border border-rose-600" style={{ zIndex: 10 }}><Text className="text-[8px] font-black text-white uppercase tracking-tighter">Update!</Text></View>}
                        <Download size={18} color="#10B981" />
                        {(!isCollapsed || isMobile) && (
                            <View className="flex-row items-center flex-1 ml-3">
                                <Text className="text-xs font-bold text-emerald-500">Update APK</Text>
                                {hasNewUpdate && <View className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-2 animate-pulse" />}
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* --- FOOTER --- */}
            <View className="px-3 py-3 border-t border-slate-800 bg-slate-900">
                {!isMobile && (
                    <TouchableOpacity onPress={toggleCollapse} className="items-center justify-center w-full py-2 mb-2 border rounded-lg bg-slate-800 border-slate-700">
                        {isCollapsed ? <ChevronRight color="#94A3B8" size={16} /> : <View className="flex-row items-center"><ChevronLeft color="#94A3B8" size={14} /><Text className="ml-2 text-[10px] font-bold uppercase text-slate-400">Hide Menu</Text></View>}
                    </TouchableOpacity>
                )}
                <View className="mb-2">
                    <TouchableOpacity onPress={() => { navigation.navigate('Profile'); if (isMobile && closeMobileMenu) closeMobileMenu(); }} className={`flex-row items-center rounded-lg border border-slate-800 hover:bg-slate-800 ${isCollapsed && !isMobile ? 'justify-center p-2' : 'px-3 py-2.5'}`}>
                        <UserCircle size={18} color="#CBD5E1" />
                        {(!isCollapsed || isMobile) && <Text className="ml-3 text-xs font-bold text-slate-300">Profil</Text>}
                    </TouchableOpacity>
                </View>
                <View>
                    <TouchableOpacity onPress={handleLogout} className={`flex-row items-center rounded-lg border border-transparent hover:bg-red-900/20 ${isCollapsed && !isMobile ? 'justify-center p-2' : 'px-3 py-2.5'}`}>
                        <LogOut size={18} color="#EF4444" />
                        {(!isCollapsed || isMobile) && <Text className="ml-3 text-xs font-bold text-red-500">Sign Out</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default Sidebar;