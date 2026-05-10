import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList } from 'react-native';
import { X, Check } from 'lucide-react-native';

interface DropdownModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: { label: string, value: string | number }[];
    selectedValue: string | number;
    onSelect: (value: any) => void;
}

export default function DropdownModal({ visible, onClose, title, options, selectedValue, onSelect }: DropdownModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="items-center justify-center flex-1 bg-black/50">
                <View className="w-11/12 max-w-sm p-6 bg-white rounded-[32px]">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-base font-black text-slate-800 uppercase italic">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-1.5 bg-slate-50 rounded-full border border-slate-100">
                            <X size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <FlatList 
                        data={options} 
                        keyExtractor={(item, index) => index.toString()} 
                        style={{ maxHeight: 300 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const isSelected = selectedValue === item.value;
                            return (
                                <TouchableOpacity 
                                    onPress={() => onSelect(item.value)} 
                                    className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
                                >
                                    <Text className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                                        {item.label}
                                    </Text>
                                    {isSelected && <Check size={16} color="#4338ca" />}
                                </TouchableOpacity>
                            );
                        }} 
                    />
                </View>
            </View>
        </Modal>
    );
}