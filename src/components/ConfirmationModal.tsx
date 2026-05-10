import React from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

interface Props {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean; // Warna merah untuk aksi berbahaya (Delete)
}

export default function ConfirmationModal({
    visible, title, message, onConfirm, onCancel,
    confirmText = "Ya, Lanjutkan", cancelText = "Batal", isDanger = false
}: Props) {

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="flex-1 bg-black/60 justify-center items-center p-6">
                <View className="bg-white w-full max-w-xs rounded-[30px] p-6 items-center shadow-2xl">

                    {/* Icon Warning */}
                    <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDanger ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <AlertTriangle size={32} color={isDanger ? '#EF4444' : '#3B82F6'} />
                    </View>

                    {/* Content */}
                    <Text className="text-lg font-extrabold text-slate-800 text-center mb-2">{title}</Text>
                    <Text className="text-sm text-slate-500 text-center leading-5 mb-8">{message}</Text>

                    {/* Buttons */}
                    <View className="flex-row gap-3 w-full">
                        <TouchableOpacity
                            onPress={onCancel}
                            className="flex-1 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 items-center"
                        >
                            <Text className="font-bold text-slate-600">{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            className={`flex-1 py-3.5 rounded-2xl items-center shadow-lg ${isDanger ? 'bg-red-500 shadow-red-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}
                        >
                            <Text className="font-bold text-white">{confirmText}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}