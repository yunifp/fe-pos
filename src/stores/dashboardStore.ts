import { create } from 'zustand';
import api from '../api/api';

// --- DEFINISI TIPE DATA ---

export interface BranchPerformance {
  id: string;
  name: string;
  revenue: number;
  txCount: number;
}

export interface ChartData {
  date: string;
  amount: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  sales: number;
}

export interface PaymentMethodStat {
    name: string;
    count: number;
    total: number;
}

export interface DashboardSummary {
  revenue: number;
  profit?: number;        // NEW: Laba Kotor
  growth?: string;        // NEW: Persentase naik/turun
  transactions?: number;
  avgBasketSize?: number;
  
  // Khusus Owner
  totalBranches?: number;
  activeBranches?: number;
}

export interface CashierRecentOrder {
    invoiceNumber: string;
    totalAmount: number;
    createdAt: string;
    paymentMethod: string;
}

export interface DashboardData {
  type: 'OWNER_VIEW' | 'CASHIER_VIEW';

  // Shared Data
  hourlyTraffic?: number[];

  // Owner & Manager Data
  summary?: DashboardSummary;
  branchPerformance?: BranchPerformance[];
  chart?: ChartData[];
  topProducts?: TopProduct[];
  paymentMethods?: PaymentMethodStat[]; // NEW

  // Cashier Data
  shiftName?: string;
  shiftTime?: string;
  myTotalSales?: number;
  transactionCount?: number;
  targetProgress?: number; // NEW: Persentase target
  recentOrders?: CashierRecentOrder[]; // NEW
}

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/dashboard/stats'); // Pastikan route sesuai
      set({ data: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Fetch dashboard failed:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Gagal memuat data dashboard' 
      });
    }
  },
}));