import "./global.css"; // Style NativeWind
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductListScreen from "./src/screens/ProductListScreen";
import CategoryListScreen from "./src/screens/CategoryListScreen";
import BranchListScreen from "./src/screens/BranchListScreen";
import UserListScreen from "./src/screens/UserListScreen";
import PromotionListScreen from "./src/screens/PromotionListScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ShiftManagementScreen from "./src/screens/ShiftManagementScreen";
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceRecapScreen from './src/screens/AttendanceRecapScreen';
import AttendanceReportScreen from "./src/screens/AttendanceReportScreen";
import MemberScreen from "./src/screens/MemberManagementScreen";
import CashFlowScreen from "./src/screens/CashFlowScreen";
import POSScreen from "./src/screens/POSScreen";
import SalesReportScreen from "./src/screens/SalesReportScreen";
import ExpenseScreen from "./src/screens/ExpenseScreen";
import FinancialReportScreen from "./src/screens/FinancialReportScreen";
import ReceiptSettingScreen from "./src/screens/ReceiptSettingScreen";
import OrderHistoryScreen from "./src/screens/OrderHistoryScreen";
import KDSScreen from "./src/screens/KDSScreen";
import QrGeneratorScreen from "./src/screens/QrGeneratorScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import DigitalReceiptScreen from "./src/screens/DigitalReceiptScreen";

// --- IMPORT UNTUK LOCK SCREEN ---
import { LockProvider, useLock } from './src/context/LockContext';
import LockScreen from './src/screens/LockScreen';

// 1. IMPORT STORE SETTING
import { useSettingStore } from './src/stores/settingStore';
import api from './src/api/api';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Products: undefined;
  Categories: undefined;
  Branches: undefined;
  Employees: undefined;
  Promotions: undefined;
  Settings: undefined;
  ShiftManagement: undefined;
  Attendance: undefined;
  AttendanceRecap: undefined;
  AttendanceReport: undefined;
  Members: undefined;
  CashFlow: undefined;
  POS: undefined;
  SalesReport: undefined;
  Expenses: undefined;
  FinancialReport: undefined;
  ReceiptSetting: undefined;
  OrderHistory: undefined;
  KDS: undefined;
  QrGenerator: undefined;
  Inventory: undefined;
  Profile: undefined;
  DigitalReceipt: { invoiceNumber: string } | undefined;
};

const linking = {
  prefixes: [
    'http://localhost:19006',
    'http://localhost:8081',
    'exp://',
    'https://eps.andisurandi.online',
    'eps-pos-app://'
  ],
  config: {
    screens: {
      Login: 'login',
      Dashboard: 'dashboard',
      Products: 'products',
      Categories: 'categories',
      Branches: 'branches',
      Employees: 'employees',
      Promotions: 'promotions',
      Settings: 'settings',
      ShiftManagement: 'shifts',
      Attendance: 'attendance',
      AttendanceRecap: 'attendance-recap',
      AttendanceReport: 'report-attendance',
      Members: 'members',
      CashFlow: 'cash-flow',
      POS: 'pos',
      SalesReport: 'report-sales',
      Expenses: 'expenses',
      FinancialReport: 'report-financial',
      ReceiptSetting: 'receipt-settings',
      OrderHistory: 'orders',
      KDS: 'kds',
      QrGenerator: 'qr-generator',
      Inventory: 'inventory',
      Profile: 'profile',
      DigitalReceipt: 'receipt/:invoiceNumber',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const LockOverlay = () => {
  const { isLocked } = useLock();
  return isLocked ? <LockScreen /> : null;
};

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const fetchSettings = useSettingStore((state) => state.fetchSettings);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Ambil Token & Refresh Token
        const token = await AsyncStorage.getItem('token');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const userStr = await AsyncStorage.getItem('user');

        // 2. Set Header API jika token ada (untuk request awal)
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        // 3. LOAD SETTINGS (Logo, warna, dll)
        await fetchSettings();

        // 4. LOGIKA AUTO-LOGIN KE LOCKSCREEN
        // Jika ada refreshToken dan data User, arahkan ke Dashboard.
        // Dashboard akan otomatis ditutupi LockScreen oleh LockOverlay.
        if (refreshToken && userStr) {
          setInitialRoute('Dashboard');
        } else {
          setInitialRoute('Login');
        }

      } catch (e) {
        console.error("Init Error:", e);
        setInitialRoute('Login');
      }
    };

    initApp();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <LockProvider>
        <NavigationContainer linking={linking}>

          {/* LockOverlay akan merender LockScreen (Modal) jika isLocked = true */}
          <LockOverlay />

          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Products" component={ProductListScreen} />
            <Stack.Screen name="Categories" component={CategoryListScreen} />
            <Stack.Screen name="Branches" component={BranchListScreen} />
            <Stack.Screen name="Employees" component={UserListScreen} />
            <Stack.Screen name="Promotions" component={PromotionListScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ShiftManagement" component={ShiftManagementScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="AttendanceRecap" component={AttendanceRecapScreen} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
            <Stack.Screen name="Members" component={MemberScreen} />
            <Stack.Screen name="CashFlow" component={CashFlowScreen} />
            <Stack.Screen name="POS" component={POSScreen} />
            <Stack.Screen name="SalesReport" component={SalesReportScreen} />
            <Stack.Screen name="Expenses" component={ExpenseScreen} />
            <Stack.Screen name="FinancialReport" component={FinancialReportScreen} />
            <Stack.Screen name="ReceiptSetting" component={ReceiptSettingScreen} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
            <Stack.Screen name="KDS" component={KDSScreen} />
            <Stack.Screen name="QrGenerator" component={QrGeneratorScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="DigitalReceipt" component={DigitalReceiptScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </LockProvider>
    </SafeAreaProvider>
  );
}