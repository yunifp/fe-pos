import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface Props {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    type?: 'primary' | 'outline';
}

const MyButton: React.FC<Props> = ({ title, onPress, isLoading, type = 'primary' }) => {
    const baseStyle = "h-12 rounded-xl flex-row justify-center items-center shadow-sm";
    const bgStyle = type === 'primary' ? "bg-primary" : "bg-transparent border border-primary";
    const textStyle = type === 'primary' ? "text-white font-bold text-lg" : "text-primary font-bold text-lg";

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isLoading}
            className={`${baseStyle} ${bgStyle} ${isLoading ? 'opacity-70' : ''}`}
        >
            {isLoading ? (
                <ActivityIndicator color={type === 'primary' ? "#FFF" : "#4F46E5"} />
            ) : (
                <Text className={textStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export default MyButton;