import React from 'react';
import { Grayscale } from 'react-native-color-matrix-image-filters';

export const GrayscaleWrapper = ({ children, active }: { children: any, active: boolean }) => {
    if (!active) return children;
    return <Grayscale>{children}</Grayscale>;
};