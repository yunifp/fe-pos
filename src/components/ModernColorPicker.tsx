import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, View, Text, TouchableOpacity, TextInput, StyleSheet,
    PanResponder, Platform, ScrollView, Dimensions
} from 'react-native';
import { X, Check, Hash, Droplet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    visible: boolean;
    initialColor: string;
    onClose: () => void;
    onSelect: (color: string) => void;
}

// --- HELPER FUNCTIONS ---

const hexToHsv = (hex: string) => {
    let r = 0, g = 0, b = 0;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
};

const hsvToHex = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#1E293B', '#64748B', '#000000'
];

export default function ModernColorPicker({ visible, initialColor, onClose, onSelect }: Props) {
    const [hue, setHue] = useState(0);
    const [sat, setSat] = useState(1);
    const [val, setVal] = useState(1);
    const [hexDisplay, setHexDisplay] = useState(initialColor);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const PANEL_SIZE = 280;

    // Ref untuk menyimpan nilai awal saat gesture dimulai (agar dragging lebih mulus)
    const gestureStartValues = useRef({ hue: 0, sat: 0, val: 0 });

    useEffect(() => {
        if (visible) {
            const { h, s, v } = hexToHsv(initialColor);
            setHue(h);
            setSat(s);
            setVal(v);
            setHexDisplay(initialColor);
        }
    }, [visible, initialColor]);

    useEffect(() => {
        const newHex = hsvToHex(hue, sat, val);
        setHexDisplay(newHex);
    }, [hue, sat, val]);

    // --- PAN RESPONDER UNTUK BOX 2D (SAT/VAL) ---
    const svPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                setScrollEnabled(false);
                // Hitung posisi awal berdasarkan tap location
                const x = Math.max(0, Math.min(evt.nativeEvent.locationX, PANEL_SIZE));
                const y = Math.max(0, Math.min(evt.nativeEvent.locationY, PANEL_SIZE));

                const newSat = x / PANEL_SIZE;
                const newVal = 1 - (y / PANEL_SIZE);

                setSat(newSat);
                setVal(newVal);

                // Simpan nilai awal untuk perhitungan delta (geser)
                gestureStartValues.current = { hue, sat: newSat, val: newVal };
            },
            onPanResponderMove: (evt, gestureState) => {
                // Gunakan delta (dx, dy) agar bisa geser sampai mentok (overshoot)
                const diffX = gestureState.dx / PANEL_SIZE;
                const diffY = gestureState.dy / PANEL_SIZE;

                let newSat = gestureStartValues.current.sat + diffX;
                let newVal = gestureStartValues.current.val - diffY; // Y terbalik

                // Clamp agar tidak lewat dari 0-1
                newSat = Math.max(0, Math.min(1, newSat));
                newVal = Math.max(0, Math.min(1, newVal));

                setSat(newSat);
                setVal(newVal);
            },
            onPanResponderRelease: () => setScrollEnabled(true),
            onPanResponderTerminate: () => setScrollEnabled(true),
        })
    ).current;

    // --- PAN RESPONDER UNTUK HUE SLIDER ---
    const huePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                setScrollEnabled(false);
                const x = Math.max(0, Math.min(evt.nativeEvent.locationX, PANEL_SIZE));
                const newHue = (x / PANEL_SIZE) * 360;
                setHue(newHue);
                gestureStartValues.current = { ...gestureStartValues.current, hue: newHue };
            },
            onPanResponderMove: (evt, gestureState) => {
                const diffX = gestureState.dx / PANEL_SIZE;
                let newHue = gestureStartValues.current.hue + (diffX * 360);

                // Clamp Hue (0-360)
                newHue = Math.max(0, Math.min(360, newHue));
                setHue(newHue);
            },
            onPanResponderRelease: () => setScrollEnabled(true),
            onPanResponderTerminate: () => setScrollEnabled(true),
        })
    ).current;

    const handleConfirm = () => {
        onSelect(hexDisplay);
        onClose();
    };

    const handleHexInput = (text: string) => {
        const cleanText = text.replace('#', '').toUpperCase();
        if (/^[0-9A-F]{0,6}$/.test(cleanText)) {
            if (cleanText.length === 6) {
                const { h, s, v } = hexToHsv('#' + cleanText);
                setHue(h);
                setSat(s);
                setVal(v);
            }
        }
    };

    const currentColorHueOnly = hsvToHex(hue, 1, 1);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <ScrollView
                        scrollEnabled={scrollEnabled}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 24 }}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Custom Color</Text>
                                <Text style={styles.subtitle}>Sesuaikan warna dan kecerahan</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* --- SATURATION & VALUE BOX (2D) --- */}
                        <View
                            style={[styles.svBox, { backgroundColor: currentColorHueOnly }]}
                            {...svPanResponder.panHandlers}
                        >
                            {/* Gradient Putih (Horizontal) */}
                            <LinearGradient
                                colors={['#FFF', 'rgba(255,255,255,0)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            {/* Gradient Hitam (Vertical) */}
                            <LinearGradient
                                colors={['rgba(0,0,0,0)', '#000']}
                                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />

                            {/* Thumb Circle (PointerEvents None agar tidak mengganggu touch) */}
                            <View
                                pointerEvents="none"
                                style={[
                                    styles.thumb,
                                    {
                                        left: sat * PANEL_SIZE - 10, // -10 = setengah ukuran thumb
                                        top: (1 - val) * PANEL_SIZE - 10,
                                        backgroundColor: hexDisplay
                                    }
                                ]}
                            />
                        </View>

                        {/* --- HUE SLIDER --- */}
                        <View style={styles.sliderContainer}>
                            <Text style={styles.label}>Hue (Warna Dasar)</Text>
                            <View
                                style={styles.hueTrack}
                                {...huePanResponder.panHandlers}
                            >
                                <LinearGradient
                                    colors={['#F00', '#FF0', '#0F0', '#0FF', '#00F', '#F0F', '#F00']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                    pointerEvents="none"
                                />
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.sliderThumb,
                                        { left: (hue / 360) * PANEL_SIZE - 10 }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* --- PREVIEW & HEX INPUT --- */}
                        <View style={styles.inputRow}>
                            <View style={[styles.previewCircle, { backgroundColor: hexDisplay }]} />
                            <View style={styles.inputWrapper}>
                                <Hash size={16} color="#94A3B8" />
                                <TextInput
                                    value={hexDisplay.replace('#', '')}
                                    onChangeText={handleHexInput}
                                    style={styles.input}
                                    maxLength={6}
                                    autoCapitalize="characters"
                                    placeholder="FFFFFF"
                                />
                            </View>
                        </View>

                        {/* --- PRESETS --- */}
                        <Text style={styles.sectionLabel}>Preset Cepat</Text>
                        <View style={styles.presetGrid}>
                            {PRESET_COLORS.map((c, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.presetItem, { backgroundColor: c }]}
                                    onPress={() => {
                                        const { h, s, v } = hexToHsv(c);
                                        setHue(h);
                                        setSat(s);
                                        setVal(v);
                                    }}
                                >
                                    {hexDisplay.toUpperCase() === c && <Check size={14} color="#FFF" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* --- ACTIONS --- */}
                        <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
                            <Text style={styles.confirmText}>Gunakan Warna Ini</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 360,
        maxHeight: '90%', // Pastikan tidak melebihi layar agar bisa scroll
        backgroundColor: '#FFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 50,
    },

    // Saturation Box
    svBox: {
        width: 280, // Fixed width agar kalkulasi touch akurat
        height: 200,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignSelf: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFF',
        position: 'absolute',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 5,
    },

    // Slider
    sliderContainer: {
        marginBottom: 24,
        alignSelf: 'center',
        width: 280,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    hueTrack: {
        height: 20,
        borderRadius: 10,
        position: 'relative',
        justifyContent: 'center',
        overflow: 'hidden' // Agar gradient rounded
    },
    gradient: {
        width: '100%',
        height: '100%',
    },
    sliderThumb: {
        width: 20,
        height: 20,
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        position: 'absolute',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },

    // Inputs
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        width: 280,
        alignSelf: 'center',
    },
    previewCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        letterSpacing: 1,
    },

    // Presets
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 10,
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
        justifyContent: 'center',
    },
    presetItem: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },

    // Button
    confirmBtn: {
        backgroundColor: '#1E293B',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        width: 280,
        alignSelf: 'center',
        marginBottom: 10
    },
    confirmText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});