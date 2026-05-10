import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Check, MapPin } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (coords: { latitude: number; longitude: number }) => void;
    initialLocation?: { latitude: number; longitude: number };
}

export default function LocationPickerModal({ visible, onClose, onSelect, initialLocation }: Props) {
    const [selectedCoords, setSelectedCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const defaultLat = initialLocation?.latitude && initialLocation.latitude !== 0 ? initialLocation.latitude : -6.1751;
    const defaultLng = initialLocation?.longitude && initialLocation.longitude !== 0 ? initialLocation.longitude : 106.8650;

    // HTML & JS untuk Leaflet
    const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([${defaultLat}, ${defaultLng}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var marker = L.marker([${defaultLat}, ${defaultLng}], {draggable: true}).addTo(map);

            // Fungsi kirim data ke React Native
            function sendData(lat, lng) {
                window.ReactNativeWebView.postMessage(JSON.stringify({latitude: lat, longitude: lng}));
            }

            // Saat peta di klik
            map.on('click', function(e) {
                var lat = e.latlng.lat;
                var lng = e.latlng.lng;
                marker.setLatLng([lat, lng]);
                sendData(lat, lng);
            });

            // Saat marker di geser
            marker.on('dragend', function(e) {
                var lat = marker.getLatLng().lat;
                var lng = marker.getLatLng().lng;
                sendData(lat, lng);
            });

            // Kirim lokasi awal
            sendData(${defaultLat}, ${defaultLng});
        </script>
    </body>
    </html>
    `;

    const handleMessage = (event: any) => {
        try {
            const coords = JSON.parse(event.nativeEvent.data);
            setSelectedCoords(coords);
        } catch (e) {}
    };

    const handleConfirm = () => {
        if (selectedCoords) {
            onSelect(selectedCoords);
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-white">
                
                {/* Header */}
                <View className="absolute z-10 flex-row items-center justify-between top-12 left-4 right-4">
                    <TouchableOpacity onPress={onClose} className="items-center justify-center w-10 h-10 bg-white rounded-full shadow-md">
                        <X size={20} color="#64748B" />
                    </TouchableOpacity>
                    <View className="px-4 py-2 bg-white rounded-full shadow-md">
                        <Text className="text-[10px] font-black text-slate-700 uppercase">Ketuk peta untuk pilih lokasi</Text>
                    </View>
                </View>

                {/* Map Area */}
                <View className="flex-1">
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: mapHtml }}
                        onMessage={handleMessage}
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => setLoading(false)}
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                    {loading && (
                        <View className="absolute inset-0 items-center justify-center bg-white/50">
                            <ActivityIndicator size="large" color="#4F46E5" />
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View className="p-6 bg-white rounded-t-[30px] shadow-2xl">
                    <View className="flex-row items-center mb-4">
                        <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-indigo-50">
                            <MapPin size={20} color="#4F46E5" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi Terpilih</Text>
                            <Text className="text-sm font-bold text-slate-800">
                                {selectedCoords ? `${selectedCoords.latitude.toFixed(6)}, ${selectedCoords.longitude.toFixed(6)}` : 'Memuat koordinat...'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        onPress={handleConfirm}
                        disabled={!selectedCoords}
                        className={`h-14 rounded-2xl flex-row items-center justify-center ${selectedCoords ? 'bg-indigo-600' : 'bg-slate-100'}`}
                    >
                        <Check size={20} color={selectedCoords ? "white" : "#CBD5E1"} style={{marginRight:8}} />
                        <Text className={`font-black uppercase tracking-widest ${selectedCoords ? 'text-white' : 'text-slate-400'}`}>
                            Gunakan Lokasi Ini
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </Modal>
    );
}