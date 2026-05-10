import React, { useState, memo } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';

interface InputFieldProps {
    label: string;
    value?: string;
    defaultValue?: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    keyboardType?: any;
    disabled?: boolean;
    isRequired?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const InputField = memo(({ 
    label, 
    value, 
    defaultValue,
    onChangeText, 
    placeholder, 
    icon, 
    keyboardType = 'default', 
    disabled = false, 
    isRequired = false, 
    autoCapitalize = 'words' 
}: InputFieldProps) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View className="mb-5">
            <View className="flex-row items-center mb-1.5 ml-1">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</Text>
                {isRequired && <Text className="ml-1 text-rose-500">*</Text>}
            </View>
            <View
                className={`flex-row items-center rounded-xl px-4 h-12 border transition-all ${disabled
                    ? 'bg-slate-100 border-slate-200'
                    : isFocused
                        ? 'bg-white border-indigo-500 shadow-sm shadow-indigo-100'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
            >
                {icon && (
                    <View className={`mr-3 ${disabled ? 'opacity-30' : (isFocused ? 'opacity-100' : 'opacity-50')}`}>
                        {icon}
                    </View>
                )}
                <TextInput
                    className={`flex-1 text-sm font-semibold py-0 ${disabled ? 'text-slate-400' : 'text-slate-800'}`}
                    value={value}
                    defaultValue={defaultValue}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={keyboardType}
                    editable={!disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disableFullscreenUI={true}
                    importantForAutofill="no"
                    autoComplete="off"
                    autoCapitalize={autoCapitalize}
                    style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : { textAlignVertical: 'center' }}
                />
            </View>
        </View>
    );
});

export default InputField;