import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';

interface FloatingActionButtonProps {
    onPress: () => void;
    color: string;
}

export default function FloatingActionButton({ onPress, color }: FloatingActionButtonProps) {
    return (
        <TouchableOpacity 
            onPress={onPress} 
            className="absolute items-center justify-center shadow-lg bottom-6 right-6 w-14 h-14 rounded-2xl active:scale-95 z-50" 
            style={{ backgroundColor: color }}
        >
            <Plus color="white" size={28} strokeWidth={3} />
        </TouchableOpacity>
    );
}