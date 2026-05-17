import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// 1. Penyesuaian URL & Host Emulator Android
// Emulator Android menggunakan 10.0.2.2 untuk mengakses localhost di komputer Anda.
// Pastikan menyertakan prefix /v1 sesuai dengan pendaftaran rute di backend.
const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:3000/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
    "x-tenant-slug": "kopi-papua",
  },
  timeout: 15000,
});

// --- LOGIKA REFRESH TOKEN ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor: Request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor: Response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url.includes("/auth/login")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          const refreshToken = await AsyncStorage.getItem("refreshToken");
          const res = await axios.post(`${BASE_URL}/auth/refresh-token`, {
            refresh_token: refreshToken,
          });

          if (res.status === 200 || res.status === 201) {
            const { token, newRefreshToken } = res.data;
            await AsyncStorage.setItem("token", token);
            if (newRefreshToken) {
              await AsyncStorage.setItem("refreshToken", newRefreshToken);
            }

            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            processQueue(null, token);

            resolve(api(originalRequest));
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
          console.log("Session totally expired. Redirecting to login...");
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(error);
  },
);

export default api;
