import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle, AlertCircle, X } from 'lucide-react-native';

interface ToastProps {
    visible: boolean;
    message: string;
    type: 'success' | 'error';
    onHide: () => void;
}

export const CustomToast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, friction: 5, useNativeDriver: true }),
            ]).start();

            // Auto hide
            const timer = setTimeout(() => {
                handleHide();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const handleHide = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -50, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY }] }}
            className="absolute top-12 left-4 right-4 z-50"
        >
            <View className={`flex-row items-center p-4 rounded-2xl shadow-lg ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {type === 'success' ? <CheckCircle color="white" size={24} /> : <AlertCircle color="white" size={24} />}
                <Text className="flex-1 text-white font-bold ml-3 text-sm">{message}</Text>
                <TouchableOpacity onPress={handleHide}>
                    <X color="white" size={20} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};