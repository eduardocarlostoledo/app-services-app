// ══════════════════════════════════════════════════════════════════════════════
// STORE GLOBAL — Zustand
// Slices: auth · services · notifications · socket
// ══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI, ServiceAPI, ProviderAPI, getApiError } from '../services/api.service';
import SocketService from '../services/socket.service';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH STORE
// ══════════════════════════════════════════════════════════════════════════════
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      profile:      null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      // ── Login ──────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await AuthAPI.login(email, password);
          await AsyncStorage.setItem('@access_token',  data.accessToken);
          await AsyncStorage.setItem('@refresh_token', data.refreshToken);

          set({
            user:         data.user,
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken,
            isLoading:    false,
          });

          // Conectar socket
          SocketService.connectSocket(data.accessToken, data.user.role);
          return { ok: true };
        } catch (error) {
          const message = getApiError(error);
          set({ isLoading: false, error: message });
          return { ok: false, message };
        }
      },

      // ── Google Login ───────────────────────────────────────────────────────
      googleLogin: async (idToken, role) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await AuthAPI.googleLogin(idToken, role);
          await AsyncStorage.setItem('@access_token',  data.accessToken);
          await AsyncStorage.setItem('@refresh_token', data.refreshToken);
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
          SocketService.connectSocket(data.accessToken, data.user.role);
          return { ok: true };
        } catch (error) {
          set({ isLoading: false, error: getApiError(error) });
          return { ok: false, message: getApiError(error) };
        }
      },

      // ── Logout ─────────────────────────────────────────────────────────────
      logout: async () => {
        try { await AuthAPI.logout(); } catch (_) {}
        SocketService.disconnectSocket();
        await AsyncStorage.multiRemove(['@access_token', '@refresh_token']);
        set({ user: null, profile: null, accessToken: null, refreshToken: null });
      },

      // ── Cargar perfil ──────────────────────────────────────────────────────
      loadProfile: async () => {
        try {
          const { data } = await AuthAPI.getMe();
          set({ user: data.user, profile: data.profile });
        } catch (_) {}
      },

      setProfile: (profile) => set({ profile }),
      clearError: () => set({ error: null }),
    }),
    {
      name:    'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user, profile: state.profile,
        accessToken: state.accessToken, refreshToken: state.refreshToken,
      }),
    }
  )
);

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES STORE
// ══════════════════════════════════════════════════════════════════════════════
export const useServiceStore = create((set, get) => ({
  activeService:    null,   // Servicio activo actual
  myServices:       [],
  availableProviders: [],
  isLoadingProviders: false,
  isLoadingServices:  false,
  providerLocation:   null, // Última ubicación recibida del operario
  error:              null,

  // ── Match de operarios disponibles ────────────────────────────────────────
  matchProviders: async (lat, lng, categorySlug, radiusKm) => {
    set({ isLoadingProviders: true, error: null, availableProviders: [] });
    try {
      const { data } = await ProviderAPI.match(lat, lng, categorySlug, radiusKm);
      set({ availableProviders: data.providers || [], isLoadingProviders: false });
      return data;
    } catch (error) {
      set({ isLoadingProviders: false, error: getApiError(error) });
      return { providers: [] };
    }
  },

  // ── Solicitar servicio ────────────────────────────────────────────────────
  requestService: async (serviceData) => {
    try {
      const { data } = await ServiceAPI.request(serviceData);
      // Iniciar tracking del nuevo servicio por socket
      SocketService.trackService(data.service_id);
      set({ activeService: { id: data.service_id, status: 'pending', ...serviceData } });
      return { ok: true, serviceId: data.service_id };
    } catch (error) {
      return { ok: false, message: getApiError(error) };
    }
  },

  // ── Cargar mis servicios ──────────────────────────────────────────────────
  loadMyServices: async (params) => {
    set({ isLoadingServices: true });
    try {
      const { data } = await ServiceAPI.getAll(params);
      set({ myServices: data.services || [], isLoadingServices: false });
    } catch (_) {
      set({ isLoadingServices: false });
    }
  },

  // ── Cargar servicio activo ────────────────────────────────────────────────
  loadActiveService: async (serviceId) => {
    try {
      const { data } = await ServiceAPI.getById(serviceId);
      set({ activeService: data.service });
      SocketService.trackService(serviceId);
    } catch (_) {}
  },

  // ── Actualización de estado via Socket ───────────────────────────────────
  updateServiceStatus: (serviceId, status, extra = {}) => {
    set((state) => ({
      activeService: state.activeService?.id === serviceId
        ? { ...state.activeService, status, ...extra }
        : state.activeService,
      myServices: state.myServices.map((s) =>
        s.id === serviceId ? { ...s, status, ...extra } : s
      ),
    }));
  },

  // ── Actualización de ubicación del operario ───────────────────────────────
  updateProviderLocation: (locationData) => {
    set({ providerLocation: locationData });
  },

  setActiveService:  (service) => set({ activeService: service }),
  clearActiveService:()        => {
    if (get().activeService?.id) {
      SocketService.untrackService(get().activeService.id);
    }
    set({ activeService: null, providerLocation: null });
  },
  clearError: () => set({ error: null }),
}));

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS STORE
// ══════════════════════════════════════════════════════════════════════════════
export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount:   0,

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications].slice(0, 50),
    unreadCount:   state.unreadCount + 1,
  })),

  markRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read_at: new Date().toISOString() } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read_at: new Date().toISOString() })),
    unreadCount: 0,
  })),

  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
  }),
}));
