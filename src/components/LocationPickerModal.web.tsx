import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Check, MapPin, Navigation } from 'lucide-react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- CONFIG ICON LEAFLET ---
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (coords: { latitude: number; longitude: number }) => void;
    initialLocation?: { latitude: number; longitude: number };
}

// --- HELPER 1: PIN MERAH (BISA DIGESER) ---
function LocationMarker({ position, setPosition }: { position: any, setPosition: any }) {
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return position === null ? null : <Marker position={position} icon={icon} />;
}

// --- HELPER 2: PENGENDALI KAMERA PETA (INI YANG BIKIN GESER OTOMATIS) ---
// Komponen ini tidak merender apa-apa, cuma logic untuk menggeser peta
function RecenterAutomatically({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();

    useEffect(() => {
        if (lat !== 0 && lng !== 0) {
            // Animasi terbang ke lokasi baru
            map.flyTo([lat, lng], 16, {
                animate: true,
                duration: 1.5 // Durasi animasi detik
            });
        }
    }, [lat, lng]); // Jalankan setiap kali koordinat berubah

    return null;
}

export default function LocationPickerModal({ visible, onClose, onSelect, initialLocation }: Props) {
    // 1. Pin Merah (Data yang akan disimpan)
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(null);

    // 2. Titik Biru (GPS Asli)
    const [myLocation, setMyLocation] = useState<{ lat: number, lng: number } | null>(null);

    // 3. Kamera Peta (Fokus View Saat Ini) - INI KUNCINYA
    const [viewCoords, setViewCoords] = useState<{ lat: number, lng: number } | null>(null);

    const [isMapReady, setIsMapReady] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Default Jakarta
    const defaultCenter = { lat: -6.175392, lng: 106.827153 };

    useEffect(() => {
        if (visible) {
            setTimeout(() => setIsMapReady(true), 500);

            // Jika Edit Mode: Set Pin & Kamera ke lokasi lama
            if (initialLocation && initialLocation.latitude !== 0) {
                const coords = { lat: initialLocation.latitude, lng: initialLocation.longitude };
                setSelectedCoords(coords);
                setViewCoords(coords); // Peta langsung fokus ke sini
            }

            // Selalu cari GPS agar Titik Biru muncul & Peta geser (jika data baru)
            const shouldAutoCenter = (!initialLocation || initialLocation.latitude === 0);
            fetchCurrentLocation(shouldAutoCenter);

        } else {
            // Reset State saat modal tutup
            setIsMapReady(false);
            setSelectedCoords(null);
            setMyLocation(null);
            setViewCoords(null);
            setLoadingLocation(false);
        }
    }, [visible]);

    const fetchCurrentLocation = (autoCenter: boolean) => {
        setLoadingLocation(true);

        if (!("geolocation" in navigator)) {
            alert("Browser tidak mendukung Geolocation");
            setLoadingLocation(false);
            return;
        }

        const options = { enableHighAccuracy: true, maximumAge: 0 };

        const success = (pos: GeolocationPosition) => {
            const gpsCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };

            console.log("GPS Found:", gpsCoords);
            setMyLocation(gpsCoords); // Update Titik Biru

            if (autoCenter) {
                setSelectedCoords(gpsCoords); // Update Pin Merah
                setViewCoords(gpsCoords);     // GESER KAMERA KE SINI
            }
            setLoadingLocation(false);
        };

        const error = (err: GeolocationPositionError) => {
            console.warn("GPS Error High Accuracy:", err.message);
            // Fallback ke Low Accuracy
            if (options.enableHighAccuracy) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => success(pos), // Jika low accuracy berhasil
                    () => setLoadingLocation(false), // Jika gagal total
                    { enableHighAccuracy: false, maximumAge: 0 }
                );
            } else {
                setLoadingLocation(false);
            }
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
    };

    const handleConfirm = () => {
        if (selectedCoords) {
            onSelect({ latitude: selectedCoords.lat, longitude: selectedCoords.lng });
            onClose();
        }
    };

    // Tombol Pesawat: Paksa kamera & pin ke lokasi GPS
    const jumpToMyLocation = () => {
        if (myLocation) {
            setViewCoords({ ...myLocation }); // Trigger RecenterAutomatically
            setSelectedCoords({ ...myLocation }); // Pindahkan Pin Merah juga
        } else {
            fetchCurrentLocation(true);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'white' }}>

                {/* --- HEADER --- */}
                <View style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 1000, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                        <X size={20} color="#64748B" />
                    </TouchableOpacity>

                    <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, flexDirection: 'row', alignItems: 'center' }}>
                        {loadingLocation && <ActivityIndicator size="small" color="#4F46E5" style={{ marginRight: 8 }} />}
                        <Text style={{ fontWeight: 'bold', color: '#334155', fontSize: 12 }}>
                            {loadingLocation ? 'Mencari GPS...' : 'Klik peta untuk sesuaikan'}
                        </Text>
                    </View>
                </View>

                {/* --- TOMBOL NAVIGASI (RE-CENTER) --- */}
                <View style={{ position: 'absolute', top: 80, right: 20, zIndex: 1000 }}>
                    <TouchableOpacity
                        onPress={jumpToMyLocation}
                        style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, elevation: 5 }}
                    >
                        <Navigation size={20} color="#3B82F6" fill={myLocation ? "#3B82F6" : "none"} />
                    </TouchableOpacity>
                </View>

                {/* --- MAP VIEW --- */}
                {visible && isMapReady ? (
                    // @ts-ignore
                    <MapContainer
                        center={defaultCenter} // Center awal (dummy), nanti dihandle RecenterAutomatically
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* 1. Logic Geser Peta Otomatis */}
                        {viewCoords && <RecenterAutomatically lat={viewCoords.lat} lng={viewCoords.lng} />}

                        {/* 2. Titik Biru (Lokasi Asli) */}
                        {myLocation && (
                            <CircleMarker
                                center={myLocation}
                                radius={8}
                                pathOptions={{ color: 'white', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }}
                            >
                                <Popup>Lokasi Saya (GPS)</Popup>
                            </CircleMarker>
                        )}

                        {/* 3. Pin Merah (Lokasi Pilihan) */}
                        <LocationMarker position={selectedCoords} setPosition={setSelectedCoords} />

                    </MapContainer>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={{ marginTop: 10, color: '#94A3B8' }}>Menyiapkan Peta...</Text>
                    </View>
                )}

                {/* --- FOOTER --- */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 40, height: 40, backgroundColor: '#EEF2FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                            <MapPin size={20} color="#4F46E5" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' }}>Koordinat Terpilih</Text>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>
                                {selectedCoords
                                    ? `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`
                                    : '-'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={!selectedCoords}
                        style={{
                            height: 48,
                            borderRadius: 12,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: selectedCoords ? '#4F46E5' : '#E2E8F0',
                            cursor: selectedCoords ? 'pointer' : 'not-allowed'
                        } as any}
                    >
                        <Check size={18} color={selectedCoords ? 'white' : '#94A3B8'} style={{ marginRight: 8 }} />
                        <Text style={{ fontWeight: 'bold', color: selectedCoords ? 'white' : '#94A3B8' }}>
                            Gunakan Lokasi Ini
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* CSS Manual */}
                <style>
                    {`
                        .leaflet-container { height: 100%; width: 100%; z-index: 0; }
                        .leaflet-pane { z-index: 0 !important; }
                        .leaflet-control-container { z-index: 1 !important; }
                        .leaflet-top, .leaflet-bottom { z-index: 1 !important; }
                    `}
                </style>
            </View>
        </Modal>
    );
}