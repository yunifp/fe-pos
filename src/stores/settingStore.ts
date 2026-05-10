import { create } from 'zustand';
import api from '../api/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface Lengkap
interface AppSettings {
  id?: number;
  appName: string;
  tagline: string | null;
  storeName: string;
  logoUrl: string | null;
  loginBgUrl: string | null;

  // Tema
  themePrimaryColor: string;
  themeSecondaryColor: string;
  themeBackgroundColor: string;

  // Keuangan
  currencySymbol: string;
  taxRate: string | number;
  serviceChargeRate: string | number;

  // Kontak & Footer
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;

  // Loyalty Points
  pointsPerAmount: number;
  pointsEarned: number;
  pointValue: number;
  minOrderToEarn: number;
  maxRedeemPercent: number;
  isActive: boolean;

  isLoaded: boolean;
}

interface SettingState {
  settings: AppSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: any) => Promise<void>;
}

export const useSettingStore = create<SettingState>((set) => ({
  isLoading: false,

  settings: {
    appName: '', // Ubah dari 'Loading...' menjadi string kosong agar Sidebar bisa melakukan fallback
    tagline: '',
    storeName: '',
    logoUrl: null,
    loginBgUrl: null,
    themePrimaryColor: '#0F172A',
    themeSecondaryColor: '#4F46E5',
    themeBackgroundColor: '#F3F4F6',
    currencySymbol: 'Rp',
    taxRate: 0,
    serviceChargeRate: 0,
    address: '',
    phone: '',
    email: '',
    website: '',

    pointsPerAmount: 10000,
    pointsEarned: 1,
    pointValue: 1,
    minOrderToEarn: 0,
    maxRedeemPercent: 30,
    isActive: true,
    isLoaded: false,
  },

  fetchSettings: async () => {
    try {
      const response = await api.get('/settings');
      set((state) => ({
        settings: {
          ...state.settings,
          ...response.data,
          isLoaded: true
        }
      }));
    } catch (error) {
      console.error('Failed to fetch settings', error);
      set((state) => ({ settings: { ...state.settings, isLoaded: true } }));
    }
  },

  updateSettings: async (data) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();

      // 1. Append Data Text
      formData.append('appName', data.appName);
      formData.append('storeName', data.storeName);
      formData.append('tagline', data.tagline || '');
      formData.append('themePrimaryColor', data.themePrimaryColor || '#4F46E5');
      formData.append('themeSecondaryColor', data.themeSecondaryColor || '#F59E0B');
      formData.append('taxRate', data.taxRate?.toString() || '0');
      formData.append('serviceChargeRate', data.serviceChargeRate?.toString() || '0');
      formData.append('address', data.address || '');
      formData.append('phone', data.phone || '');
      formData.append('email', data.email || '');
      formData.append('website', data.website || '');
      formData.append('pointsPerAmount', data.pointsPerAmount || 0);
      formData.append('pointsEarned', data.pointsEarned || 0);
      formData.append('pointValue', data.pointValue || 0);
      formData.append('minOrderToEarn', data.minOrderToEarn || 0);
      formData.append('maxRedeemPercent', data.maxRedeemPercent || 0);
      formData.append('isActive', data.isActive || false);


      // 2. Append Images (Logic Hybrid: Web & Mobile)

      // --- HELPER UNTUK APPEND GAMBAR ---
      const appendImage = async (field: string, uri: string) => {
        if (!uri || uri.startsWith('http')) return;

        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append(field, blob, 'upload.jpg');
        } else {
          // PERBAIKAN: Pastikan URI diawali file:// untuk Android agar dibaca sebagai file lokal
          const cleanUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');

          const filename = uri.split('/').pop() || 'upload.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          formData.append(field, {
            uri: cleanUri,
            name: filename,
            type: type,
          } as any);
        }
      };

      // Proses Logo
      if (data.logoUrl) await appendImage('logoUrl', data.logoUrl);

      // Proses Background
      if (data.loginBgUrl) await appendImage('loginBgUrl', data.loginBgUrl);

      // 3. Kirim Request
      const res = await api.put('/settings', formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      // 4. Update State
      set((state) => ({
        isLoading: false,
        settings: {
          ...state.settings,
          ...res.data.settings,
          isLoaded: true
        }
      }));

    } catch (error) {
      console.error("Gagal update settings:", error);
      set({ isLoading: false });
      throw error;
    }
  }
}));