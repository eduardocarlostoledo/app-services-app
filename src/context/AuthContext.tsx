import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { connectSocket, disconnectSocket } from '../../socket.service';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';
const API_URL = `${BASE_URL}/api/v1`;

interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  rating?: number;
  total_services?: number;
  is_available?: boolean;
  verification_status?: string;
  notification_preferences?: {
    offers: boolean;
    service_updates: boolean;
    payments: boolean;
    promotions: boolean;
  } | null;
  payment_setup?: {
    cvu_loaded: boolean;
    cvu?: string | null;
    mp_connected: boolean;
    mp_user_id?: string | null;
    can_receive_mp: boolean;
  } | null;
  Provider?: {
    rating: number;
    total_services: number;
    is_available: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  smsLogin: (phone: string) => Promise<void>;
  smsVerify: (phone: string, code: string) => Promise<{ user: User }>;
  googleLogin: (idToken: string) => Promise<{ user: User }>;
  emailLogin: (email: string, password: string) => Promise<{ user: User }>;
  register: (data: { email: string; password: string; first_name: string; last_name: string; role?: string }) => Promise<{ user: User }>;
  forgotPassword: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  setRole: (role: string) => Promise<User>;
  updateUser: (data: Partial<User> & Record<string, any>) => Promise<User>;
  refreshUser: () => Promise<User>;
  logout: () => void;
  api: <T = any>(endpoint: string, options?: { method?: string; data?: any; params?: any; headers?: any }) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => { tokenRef.current = token; }, [token]);

  // Connect/disconnect Socket.io when auth state changes
  useEffect(() => {
    if (token && user?.role) {
      connectSocket(token, user.role, () => {}, () => {});
    } else {
      disconnectSocket();
    }
    return () => { disconnectSocket(); };
  }, [token, user?.role]);

  // Load stored tokens on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedRefresh, storedUser] = await Promise.all([
          AsyncStorage.getItem('@access_token'),
          AsyncStorage.getItem('@refresh_token'),
          AsyncStorage.getItem('@user'),
        ]);
        if (storedToken && storedUser) {
          tokenRef.current = storedToken;
          refreshTokenRef.current = storedRefresh;
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.log('Error loading auth state:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // API helper
  const api = useCallback(async <T = any>(
    endpoint: string,
    options: { method?: string; data?: any; params?: any; headers?: any } = {}
  ): Promise<T> => {
    const { method = 'GET', data, params, headers } = options;
    const currentToken = tokenRef.current;

    try {
      const response = await axios({
        url: `${API_URL}${endpoint}`,
        method,
        data,
        params,
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...headers,
        },
        timeout: 15000,
      });
      return response.data;
    } catch (error: any) {
      // Try refresh on 401
      if (error.response?.status === 401 && refreshTokenRef.current) {
        try {
          const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: refreshTokenRef.current,
          });
          const { accessToken, refreshToken: newRefresh } = refreshRes.data;
          tokenRef.current = accessToken;
          refreshTokenRef.current = newRefresh;
          setToken(accessToken);
          await AsyncStorage.setItem('@access_token', accessToken);
          await AsyncStorage.setItem('@refresh_token', newRefresh);

          // Retry original request
          const retryRes = await axios({
            url: `${API_URL}${endpoint}`,
            method,
            data,
            params,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              ...headers,
            },
            timeout: 15000,
          });
          return retryRes.data;
        } catch {
          // Refresh failed, force logout
          tokenRef.current = null;
          refreshTokenRef.current = null;
          setToken(null);
          setUser(null);
          await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
        }
      }
      const msg = error.response?.data?.message || error.response?.data?.detail || error.message || 'Error de conexion';
      throw new Error(msg);
    }
  }, []);

  const saveAuth = async (accessToken: string, refreshToken: string, userData: User) => {
    tokenRef.current = accessToken;
    refreshTokenRef.current = refreshToken;
    setToken(accessToken);
    setUser(userData);
    await AsyncStorage.setItem('@access_token', accessToken);
    await AsyncStorage.setItem('@refresh_token', refreshToken);
    await AsyncStorage.setItem('@user', JSON.stringify(userData));
  };

  // SMS Login - send code
  const smsLogin = useCallback(async (phone: string) => {
    await api('/auth/sms/login', { method: 'POST', data: { phone } });
  }, [api]);

  // SMS Verify - get tokens
  const smsVerify = useCallback(async (phone: string, code: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/sms/verify', {
      method: 'POST',
      data: { phone, otp: code },
    });
    await saveAuth(res.accessToken, res.refreshToken, res.user);
    return { user: res.user };
  }, [api]);

  // Google login
  const googleLogin = useCallback(async (idToken: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/google', {
      method: 'POST',
      data: { idToken },
    });
    await saveAuth(res.accessToken, res.refreshToken, res.user);
    return { user: res.user };
  }, [api]);

  // Email login
  const emailLogin = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      data: { email, password },
    });
    await saveAuth(res.accessToken, res.refreshToken, res.user);
    return { user: res.user };
  }, [api]);

  // Register
  const register = useCallback(async (data: { email: string; password: string; first_name: string; last_name: string; role?: string }) => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      data,
    });
    await saveAuth(res.accessToken, res.refreshToken, res.user);
    return { user: res.user };
  }, [api]);

  // Forgot password (sends OTP via nodemailer)
  const forgotPassword = useCallback(async (email: string) => {
    await api('/auth/forgot-password', { method: 'POST', data: { email } });
  }, [api]);

  // Verify OTP
  const verifyOtp = useCallback(async (email: string, otp: string) => {
    await api('/auth/verify-otp', { method: 'POST', data: { email, otp } });
  }, [api]);

  // Reset password
  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    await api('/auth/reset-password', { method: 'POST', data: { email, otp, new_password: newPassword } });
  }, [api]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<User> => {
    const res = await api<{ user: User }>('/auth/me');
    const freshUser = res.user || res as any;
    setUser(freshUser);
    await AsyncStorage.setItem('@user', JSON.stringify(freshUser));
    return freshUser;
  }, [api]);

  // Set role
  const setRole = useCallback(async (role: string): Promise<User> => {
    await api('/users/role', { method: 'PUT', data: { role } });
    const freshUser = await refreshUser();
    return freshUser;
  }, [api, refreshUser]);

  // Update profile
  const updateUser = useCallback(async (data: Partial<User> & Record<string, any>): Promise<User> => {
    const res = await api<User>('/users/profile', { method: 'PATCH', data });
    const updated = res;
    setUser(updated);
    await AsyncStorage.setItem('@user', JSON.stringify(updated));
    return updated;
  }, [api]);

  // Logout
  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    disconnectSocket();
    tokenRef.current = null;
    refreshTokenRef.current = null;
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
  }, [api]);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      smsLogin, smsVerify, googleLogin, emailLogin, register,
      forgotPassword, verifyOtp, resetPassword,
      setRole, updateUser, refreshUser, logout, api,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
