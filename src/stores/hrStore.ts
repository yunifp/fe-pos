import { create } from 'zustand';
import api from '../api/api';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HRState {
  shifts: any[];
  schedules: any[];
  isLoading: boolean;
  todayAttendance: any;
  attendanceHistory: any[];
  attendanceReport: {
    stats: { total: number; late: number; ontime: number };
    data: any[];
  } | null;
  branches: any[];
  userSchedules: any[];


  fetchBranches: () => Promise<void>;
  fetchShifts: (branchId?: string | null) => Promise<void>;
  createShift: (data: any) => Promise<void>;
  updateShift: (id: string, data: any) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;

  fetchSchedules: (date?: string, branchId?: string | null) => Promise<void>;
  fetchUserSchedules: (userId: string) => Promise<void>;
  assignManualSchedule: (data: any) => Promise<void>;
  updateSchedule: (id: string, data: any) => Promise<void>; // Tambahan
  deleteSchedule: (id: string) => Promise<void>; // Tambahan
  generateAutoSchedule: (data: any) => Promise<void>;

  fetchTodayAttendance: () => Promise<void>;
  performClockIn: (data: { latitude: number; longitude: number; notes?: string; photoUrl?: string }) => Promise<void>;
  performClockOut: (data: { latitude: number; longitude: number }) => Promise<void>;
  fetchAttendanceHistory: (startDate: string, endDate: string, userId?: string) => Promise<void>;
  fetchAttendanceReport: (startDate: string, endDate: string, branchId?: string) => Promise<void>;
  exportAttendance: (startDate: string, endDate: string, branchId?: string | null) => Promise<void>;
}

export const useHRStore = create<HRState>((set, get) => ({
  shifts: [],
  schedules: [],
  isLoading: false,
  todayAttendance: null,
  attendanceHistory: [],
  attendanceReport: null,
  branches: [],
  userSchedules: [],

  fetchShifts: async (branchId) => {
    set({ isLoading: true });
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const res = await api.get('/hr/shifts', { params });
      set({ shifts: res.data, isLoading: false });
    } catch (e) { set({ isLoading: false }); }
  },

  createShift: async (data) => {
    await api.post('/hr/shifts', data);
    get().fetchShifts(data.branchId);
  },

  updateShift: async (id, data) => {
    await api.put(`/hr/shifts/${id}`, data);
    get().fetchShifts();
  },

  deleteShift: async (id) => {
    await api.delete(`/hr/shifts/${id}`);
    get().fetchShifts();
  },

  fetchSchedules: async (date, branchId) => {
    set({ isLoading: true });
    try {
      const params: any = {};
      if (date) params.date = date;
      if (branchId) params.branchId = branchId;
      const res = await api.get('/hr/schedules', { params });
      set({ schedules: res.data, isLoading: false });
    } catch (e) { set({ isLoading: false }); }
  },

  fetchUserSchedules: async (userId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/hr/schedules/user/${userId}`);
      set({ userSchedules: res.data, isLoading: false });
    } catch (e) {
      set({ userSchedules: [], isLoading: false });
    }
  },

  assignManualSchedule: async (data) => {
    await api.post('/hr/schedules/manual', data);
    get().fetchSchedules(undefined, data.branchId);
  },

  updateSchedule: async (id, data) => {
    await api.put(`/hr/schedules/${id}`, data);
    get().fetchSchedules();
  },

  deleteSchedule: async (id) => {
    await api.delete(`/hr/schedules/${id}`);
    get().fetchSchedules();
  },

  generateAutoSchedule: async (data: any) => {
    set({ isLoading: true });
    try {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      await api.post('/hr/schedules/auto', payload);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // --- ATTENDANCE LOGIC (SYNCED WITH NEW SCHEMA) ---

  fetchTodayAttendance: async () => {
    set({ isLoading: true });
    try {
      // Menggunakan timestamp 't' untuk menghindari cache pada beberapa browser/platform
      const res = await api.get(`/hr/attendance/today?t=${Date.now()}`);
      // Backend mengembalikan { shift, attendance }
      set({ todayAttendance: res.data, isLoading: false });
    } catch (e) {
      set({ todayAttendance: null, isLoading: false });
    }
  },

  performClockIn: async (data: { latitude: number; longitude: number; notes?: string; photoUrl?: string }) => {
    set({ isLoading: true });
    try {
      // Selaraskan dengan body destructuring di backend:
      // const { date, shiftStart, shiftEnd, photoUrl, notes, latitude, longitude } = req.body;
      // Catatan: date, shiftStart, dan shiftEnd dihitung ulang oleh backend untuk keamanan, 
      // jadi kita cukup mengirim data dasar dari sensor/input.
      const response = await api.post('/hr/attendance/in', {
        latitude: parseFloat(data.latitude.toString()),
        longitude: parseFloat(data.longitude.toString()),
        notes: data.notes || "",
        photoUrl: data.photoUrl || "",
      });

      // Setelah berhasil, ambil data kehadiran terbaru untuk memperbarui UI tombol
      await get().fetchTodayAttendance();
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  performClockOut: async (data: { latitude: number; longitude: number }) => {
    set({ isLoading: true });
    try {
      await api.post('/hr/attendance/out', {
        latitude: parseFloat(data.latitude.toString()),
        longitude: parseFloat(data.longitude.toString()),
      });

      // Refresh data hari ini agar status berubah menjadi 'Selesai'
      await get().fetchTodayAttendance();
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchAttendanceHistory: async (startDate: string, endDate: string, userId?: string) => {
    set({ isLoading: true });
    try {
      const params: any = { startDate, endDate };
      if (userId) params.userId = userId;

      const res = await api.get('/hr/attendance/history', { params });
      // Data yang kembali sekarang menyertakan kolom shiftStart & shiftEnd dari tabel Attendance
      set({ attendanceHistory: res.data, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchAttendanceReport: async (startDate: string, endDate: string, branchId?: string) => {
    set({ isLoading: true });
    try {
      const params: any = { startDate, endDate };
      // Filter berdasarkan branchId jika Owner memilih cabang tertentu
      if (branchId && branchId !== 'all') params.branchId = branchId;

      const res = await api.get('/hr/attendance/report', { params });
      set({ attendanceReport: res.data, isLoading: false });
    } catch (e) {
      set({ attendanceReport: null, isLoading: false });
    }
  },

  fetchBranches: async () => {
    try {
      const res = await api.get('/branches');
      set({ branches: res.data });
    } catch (e) { console.error(e); }
  },

  exportAttendance: async (startDate, endDate, branchId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const baseURL = api.defaults.baseURL;
      let url = `${baseURL}/hr/attendance/export?startDate=${startDate}&endDate=${endDate}&token=${token}`;
      if (branchId && branchId !== 'all') url += `&branchId=${branchId}`;
      if (Platform.OS === 'web') window.location.href = url;
      else await Linking.openURL(url);
    } catch (error) { console.error(error); }
  },
}));