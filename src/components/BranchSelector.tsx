import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { ChevronDown, Search, Check, Store, X, LayoutGrid } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

interface Props {
    branches: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    showAllOption?: boolean; // Menambahkan opsi ini agar tidak error
}

export default function BranchSelector({ branches, selectedId, onSelect, showAllOption }: Props) {
    const { settings } = useSettingStore();
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    // Mencari nama cabang terpilih (termasuk kondisi 'all')
    const getSelectedName = () => {
        if (selectedId === 'all') return 'Semua Cabang';
        const branch = branches.find(b => b.id === selectedId);
        return branch ? branch.name : 'Pilih Cabang';
    };

    // Filter cabang + Menambahkan opsi "Semua Cabang" secara dinamis di list
    const filteredBranches = useMemo(() => {
        let list = [...branches];

        if (search) {
            list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
        }

        // Tambahkan "Semua Cabang" di posisi paling atas jika diizinkan
        if (showAllOption && !search) {
            return [{ id: 'all', name: 'Semua Cabang', isAll: true }, ...list];
        }

        return list;
    }, [branches, search, showAllOption]);

    const handleSelect = (id: string) => {
        onSelect(id);
        setVisible(false);
        setSearch(''); // Reset search saat tutup
    };

    return (
        <>
            {/* TRIGGER BUTTON (Tinggi disamakan h-12 dengan SearchBar) */}
            <TouchableOpacity
                onPress={() => setVisible(true)}
                className="flex-row items-center px-3 bg-white border shadow-sm rounded-xl border-slate-200 active:bg-slate-50 h-12"
            >
                <View className="p-1.5 rounded-lg bg-indigo-50">
                    <Store size={18} color={settings.themePrimaryColor || '#4F46E5'} />
                </View>
                <View className="flex-1 mx-2 justify-center">
                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Lokasi</Text>
                    <Text className="text-xs font-bold text-slate-700 leading-tight" numberOfLines={1}>
                        {getSelectedName()}
                    </Text>
                </View>
                <ChevronDown size={18} color="#64748B" />
            </TouchableOpacity>

            {/* MODAL SELECTION */}
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
                <View className="items-center justify-end flex-1 bg-black/60 md:justify-center">
                    <View className="bg-white w-full md:max-w-md rounded-t-[40px] md:rounded-[40px] overflow-hidden shadow-2xl">

                        {/* Modal Header */}
                        <View className="flex-row items-center justify-between p-6 bg-white border-b border-slate-50">
                            <View>
                                <Text className="text-xl font-black uppercase text-slate-900">Pilih Cabang</Text>
                                <Text className="text-xs text-slate-400">Filter data berdasarkan lokasi</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setVisible(false)}
                                className="p-2 rounded-full bg-slate-100"
                            >
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View className="px-6 py-4">
                            <View className="flex-row items-center h-12 px-4 border bg-slate-50 border-slate-100 rounded-2xl">
                                <Search size={18} color="#94A3B8" />
                                <TextInput
                                    className="flex-1 ml-3 font-bold outline-none text-slate-800"
                                    placeholder="Cari nama cabang..."
                                    placeholderTextColor="#94A3B8"
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                        </View>

                        {/* List Cabang */}
                        <View className="h-96">
                            <FlatList
                                data={filteredBranches}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                                renderItem={({ item }) => {
                                    const isSelected = item.id === selectedId;
                                    const isAll = item.id === 'all';

                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleSelect(item.id)}
                                            className={`flex-row items-center p-4 mb-3 rounded-2xl border ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-100'}`}
                                        >
                                            <View className={`w-12 h-12 rounded-xl justify-center items-center mr-4 ${isSelected ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                                                {isAll ? (
                                                    <LayoutGrid size={22} color={isSelected ? 'white' : '#64748B'} />
                                                ) : (
                                                    <Text className={`font-black text-lg ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`font-bold text-base ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{item.name}</Text>
                                                {!isAll && (
                                                    <Text className="text-xs text-slate-400" numberOfLines={1}>{item.address || 'Alamat tidak tersedia'}</Text>
                                                )}
                                            </View>
                                            {isSelected && <Check size={20} color={settings.themePrimaryColor || '#4F46E5'} />}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View className="items-center mt-20">
                                        <Text className="italic font-bold text-slate-400">Cabang tidak ditemukan</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}