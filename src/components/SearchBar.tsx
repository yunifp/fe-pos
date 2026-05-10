import React from 'react';
import { View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = "Cari..." }: SearchBarProps) {
    return (
        <View className="flex-1 min-w-[150px] flex-row items-center px-4 bg-slate-50 border border-slate-200 h-12 rounded-xl shadow-inner">
            <Search size={16} color="#94A3B8" />
            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                className="flex-1 py-0 ml-2 text-xs font-semibold text-slate-700"
                value={value}
                onChangeText={onChangeText}
                style={Platform.OS === 'web' ? { outlineWidth: 0 } as any : { textAlignVertical: 'center' }}
            />
            {value !== '' && (
                <TouchableOpacity onPress={() => onChangeText('')}>
                    <X size={14} color="#CBD5E1" />
                </TouchableOpacity>
            )}
        </View>
    );
}