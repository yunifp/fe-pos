import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { MapPin } from 'lucide-react-native';
import SearchBar from './SearchBar';
import BranchSelector from './BranchSelector';

interface ScreenHeaderProps {
    title: string;
    subtitle: string;
    subtitleIcon?: React.ReactNode;
    
    // Search Props
    showSearch?: boolean;
    searchValue?: string;
    onSearchChange?: (text: string) => void;
    searchPlaceholder?: string;
    
    // Branch Props
    userRole: string;
    branches: any[];
    selectedBranchId: string | null;
    onBranchChange: (id: string) => void;
    userBranchName?: string;
}

export default function ScreenHeader({
    title,
    subtitle,
    subtitleIcon,
    showSearch = true,
    searchValue = '',
    onSearchChange,
    searchPlaceholder = "Cari...",
    userRole,
    branches,
    selectedBranchId,
    onBranchChange,
    userBranchName = 'Cabang Aktif'
}: ScreenHeaderProps) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;

    return (
        <View className="bg-white shadow-sm z-10 rounded-b-[30px] border-b border-slate-100">
            <View className="p-4 md:p-6">
                <View className={`${width >= 768 ? 'flex-row items-center justify-between' : 'flex-col'} gap-4`}>
                    
                    {/* --- BAGIAN KIRI: JUDUL & SUBTITLE --- */}
                    <View className="flex-row items-center">
                        <View className="w-1 h-8 mr-3 bg-indigo-600 rounded-full" />
                        <View>
                            <Text className="text-lg font-black tracking-tighter uppercase text-slate-900 leading-none">
                                {title}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                {subtitleIcon}
                                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    {subtitle}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* --- BAGIAN KANAN: SEARCH & SELECTOR --- */}
                    <View 
                        className={`flex-row items-center gap-2 ${width >= 1024 ? 'flex-1 justify-end' : 'w-full'}`} 
                        style={{ flexWrap: width < 600 ? 'wrap' : 'nowrap' }}
                    >
                        {/* SEARCH INPUT */}
                        {showSearch && onSearchChange && (
                            <SearchBar 
                                value={searchValue} 
                                onChangeText={onSearchChange} 
                                placeholder={searchPlaceholder} 
                            />
                        )}

                        {/* SELECTOR CABANG */}
                        <View 
                            className="flex-shrink-0" 
                            style={{ width: isDesktop ? 220 : isTablet ? 190 : 140, minWidth: 130 }}
                        >
                            {userRole === 'OWNER' ? (
                                <BranchSelector 
                                    branches={branches} 
                                    selectedId={selectedBranchId} 
                                    onSelect={onBranchChange} 
                                />
                            ) : (
                                <View className="flex-row items-center px-3 border bg-slate-50 rounded-xl border-slate-100 h-12">
                                    <MapPin size={16} color="#94A3B8" />
                                    <Text className="ml-2 text-[10px] font-bold tracking-widest uppercase text-slate-500" numberOfLines={1}>
                                        {userBranchName}
                                    </Text>
                                </View>
                            )}
                        </View>

                    </View>
                </View>
            </View>
        </View>
    );
}