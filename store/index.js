import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI, ServiceAPI, NotificationAPI, UserAPI, CategoryAPI } from '../api.service';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH STORE
// ═══════════════════════════════════════════════════════════════════════════════
export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,

  // Initialize from AsyncStorage
  init: async () => {
    try {
      const [token, refresh, userStr] = await Promise.all([
        AsyncStorage.getItem('@access_token'),
        AsyncStorage.getItem('@refresh_token'),
        AsyncStorage.getItem('@user'),
      ]);
      if (token && userStr) {
        set({ accessToken: token, refreshToken: refresh, user: JSON.parse(userStr), loading: false });
      } else {
        set({ loading: false });
      }
    } catch (e) {
      set({ loading: false });
    }
  },

  setAuth: async (accessToken, refreshToken, user) => {
    await AsyncStorage.setItem('@access_token', accessToken);
    await AsyncStorage.setItem('@refresh_token', refreshToken);
    await AsyncStorage.setItem('@user', JSON.stringify(user));
    set({ accessToken, refreshToken, user, loading: false });
  },

  updateUser: (userData) => {
    const current = get().user;
    const updated = { ...current, ...userData };
    AsyncStorage.setItem('@user', JSON.stringify(updated));
    set({ user: updated });
  },

  loadProfile: async () => {
    try {
      const { data } = await AuthAPI.getMe();
      if (data.user) {
        const user = data.user;
        await AsyncStorage.setItem('@user', JSON.stringify(user));
        set({ user });
      }
    } catch (e) {
      console.log('Error loading profile:', e.message);
    }
  },

  logout: async () => {
    try { await AuthAPI.logout(); } catch (_) {}
    await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE STORE
// ═══════════════════════════════════════════════════════════════════════════════
export const useServiceStore = create((set) => ({
  myServices: [],
  feed: [],
  loading: false,

  loadMyServices: async (params) => {
    set({ loading: true });
    try {
      const { data } = await ServiceAPI.getAll(params);
      set({ myServices: data.services || [], loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  loadFeed: async (lat, lng, category) => {
    set({ loading: true });
    try {
      const { data } = await ServiceAPI.getAll({ status: 'pending' });
      set({ feed: data.services || [], loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION STORE
// ═══════════════════════════════════════════════════════════════════════════════
export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      const { data } = await NotificationAPI.getAll();
      set({ notifications: data.notifications || [] });
    } catch (e) {}
  },

  loadUnreadCount: async () => {
    try {
      const { data } = await NotificationAPI.getUnreadCount();
      set({ unreadCount: data.count || 0 });
    } catch (e) {}
  },

  markRead: async (id) => {
    try {
      await NotificationAPI.markRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (e) {}
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY STORE
// ═══════════════════════════════════════════════════════════════════════════════
export const useCategoryStore = create((set) => ({
  categories: [],
  loadCategories: async () => {
    try {
      const { data } = await CategoryAPI.getAll();
      set({ categories: data.categories || [] });
    } catch (e) {}
  },
}));
