import React from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity, Platform } from 'react-native';

interface Props extends TextInputProps {
    label: string;
    icon?: React.ReactNode;
    isPassword?: boolean;
    primaryColor?: string;
    secondaryColor?: string;
}

const MyInput: React.FC<Props> = ({ label, icon, isPassword, primaryColor, ...props }) => {
    const [show, setShow] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    // Default warna jika primaryColor tidak tersedia
    const activeColor = primaryColor || '#4F46E5';

    return (
        <View className="w-full mb-6">
            {/* Label yang lebih bersih dengan spasi antar huruf */}
            <Text className="mb-2 text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                {label}
            </Text>

            <View
                style={{
                    borderColor: isFocused ? activeColor : '#E2E8F0', // Slate-200 saat tidak fokus
                    backgroundColor: isFocused ? '#FFFFFF' : '#F8FAFC', // Slate-50 saat tidak fokus
                    // Efek Elevasi halus saat fokus
                    elevation: isFocused ? 4 : 0,
                    shadowColor: activeColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isFocused ? 0.1 : 0,
                    shadowRadius: 8,
                }}
                className="flex-row items-center px-5 border rounded-[20px]"
            >
                {/* Render Ikon jika ada */}
                {icon && <View className="mr-3 opacity-60">{icon}</View>}

                <TextInput
                    // MENGHILANGKAN KOTAK HITAM (OUTLINE) DI WEB
                    className="flex-1 py-4 text-base outline-none text-slate-700"
                    style={{
                        ...Platform.select({
                            web: { outlineStyle: 'none' } as any
                        })
                    }}
                    secureTextEntry={isPassword && !show}
                    placeholderTextColor="#94A3B8"
                    selectionColor={activeColor}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    underlineColorAndroid="transparent"
                    {...props}
                />

                {/* Tombol Lihat/Sembunyikan Password */}
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShow(!show)}
                        activeOpacity={0.6}
                        className="p-2"
                    >
                        <Text
                            style={{ color: activeColor }}
                            className="text-[10px] font-black uppercase"
                        >
                            {show ? 'Sembunyikan' : 'Lihat'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default MyInput;