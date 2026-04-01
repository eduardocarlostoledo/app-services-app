// ══════════════════════════════════════════════════════════════════════════════
// API SERVICE — React Native
// Axios con interceptors para JWT, refresh automático y manejo de errores
// ══════════════════════════════════════════════════════════════════════════════

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';
const API_URL  = `${BASE_URL}/api/v1`;

// ── Instancia axios ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Flag para evitar múltiples refresh simultáneos
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

// ── Request interceptor: adjuntar access token ────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: refresh automático al 401 ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        await AsyncStorage.setItem('@access_token',  data.accessToken);
        await AsyncStorage.setItem('@refresh_token', data.refreshToken);

        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Limpiar sesión y redirigir a login
        await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
        // El store de Redux debe manejar el logout
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
export const AuthAPI = {
  register:      (data)          => api.post('/auth/register', data),
  login:         (email, pass)   => api.post('/auth/login', { email, password: pass }),
  googleLogin:   (idToken, role) => api.post('/auth/google', { idToken, role }),
  logout:        ()              => api.post('/auth/logout'),
  forgotPassword:(email)         => api.post('/auth/forgot-password', { email }),
  verifyOtp:     (email, otp)    => api.post('/auth/verify-otp', { email, otp }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, new_password: newPassword }),
  getMe:         ()              => api.get('/auth/me'),
};

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════
export const ProviderAPI = {
  match: (lat, lng, category, radiusKm = 20) =>
    api.get('/providers/match', { params: { lat, lng, category, radius_km: radiusKm } }),
  getProfile:          (id)           => api.get(`/providers/${id}`),
  updateAvailability:  (isAvailable)  => api.patch('/providers/availability', { is_available: isAvailable }),
  updateLocation:      (lat, lng)     => api.patch('/providers/location', { lat, lng }),
  uploadDocument:      (formData)     => api.post('/providers/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateAvatar:        (formData)     => api.patch('/providers/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════════════════════════════
export const ServiceAPI = {
  request:    (data)                  => api.post('/services', data),
  getAll:     (params)                => api.get('/services/my', { params }),
  getById:    (id)                    => api.get(`/services/${id}`),
  accept:     (id, etaMinutes)        => api.patch(`/services/${id}/accept`, { eta_minutes: etaMinutes }),
  reject:     (id, reason)            => api.patch(`/services/${id}/reject`, { reason }),
  complete:   (id, formData)          => api.patch(`/services/${id}/complete`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  cancel:     (id, reason)            => api.patch(`/services/${id}/cancel`, { reason }),
  review:         (id, score, comment)    => api.post(`/services/${id}/review`, { score, comment }),
  chooseProvider: (id, providerId)       => api.post(`/services/${id}/choose/${providerId}`),
  updateAddress:  (id, data)             => api.put(`/services/${id}/address`, data),
};

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════
export const PaymentAPI = {
  createMPPreference: (serviceId)         => api.post('/payments/mercadopago/preference', { service_id: serviceId }),
  registerCash:       (serviceId)         => api.post('/payments/cash', { service_id: serviceId }),
  confirmCash:        (transactionId)     => api.patch(`/payments/cash/${transactionId}/confirm`),
  getHistory:         (params)            => api.get('/payments/history', { params }),
  getCreditPackages:  ()                  => api.get('/payments/credits/packages'),
  buyCredits:         (packageId)         => api.post('/payments/credits/checkout', { package_id: packageId }),
  getCreditsBalance:  ()                  => api.get('/payments/credits/balance'),
  release:            (id)                => api.put(`/payments/${id}/release`),
};

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES & NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════
export const CategoryAPI = {
  getAll: () => api.get('/categories'),
};

export const NotificationAPI = {
  getAll:   ()   => api.get('/notifications'),
  markRead:       (id) => api.patch(`/notifications/${id}/read`),
  getUnreadCount: ()   => api.get('/notifications/unread-count'),
};

export const UserAPI = {
  getProfile:    ()     => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  changeRole:    (role) => api.put('/users/role', { role }),
};

// ══════════════════════════════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════════════════════════════
export const ChatAPI = {
  getConversations: ()                    => api.get('/chat/conversations'),
  getMessages:      (serviceId, otherId)  => api.get(`/chat/${serviceId}/${otherId}`),
  sendMessage:      (serviceId, text)     => api.post('/chat/messages', { service_id: serviceId, text }),
};

// ══════════════════════════════════════════════════════════════════════════════
// DISPUTES
// ══════════════════════════════════════════════════════════════════════════════
export const DisputeAPI = {
  create:       (serviceId, reason)     => api.post('/disputes', { service_id: serviceId, reason }),
  getById:      (id)                    => api.get(`/disputes/${id}`),
  getByService: (serviceId)             => api.get(`/disputes/service/${serviceId}`),
  addMessage:   (id, text, photos)      => api.post(`/disputes/${id}/messages`, { text, photos }),
};

// Helper para manejo de errores de API en componentes
export const getApiError = (error) =>
  error?.response?.data?.message || error?.message || 'Error inesperado. Intentá de nuevo.';

export default api;
