import React from 'react';
import { View } from 'react-native';

export const GrayscaleWrapper = ({ children, active }: { children: any, active: boolean }) => {
    return (
        <View style={active ? { filter: 'grayscale(100%)' } as any : {}}>
            {children}
        </View>
    );
};