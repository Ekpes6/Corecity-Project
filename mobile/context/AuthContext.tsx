// ─── CoreCity Mobile — Auth Context ──────────────────────────────────────────
// Mirrors the web's AuthContext.jsx logic.
// Key differences:
//   • SecureStore replaces localStorage
//   • router.replace('/login') replaces window.location.href
//   • Registers the 401 callback with the API service on mount
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  authAPI,
  TOKEN_KEY,
  USER_KEY,
  setUnauthorizedCallback,
} from '../services/api';
import type { User } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:            User | null;
  loading:         boolean;
  isAuthenticated: boolean;
  isBuyer:         boolean;
  isSeller:        boolean;
  isAgent:         boolean;
  isAdmin:         boolean;
  login:           (creds: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register:        (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; statusCode?: number }>;
  logout:          () => void;
  updateUser:      (updated: Partial<User>) => void;
  refreshUser:     () => Promise<void>;
}

interface RegisterPayload {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'AGENT';
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,         setUser]         = useState<User | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [roleVerified, setRoleVerified] = useState(false);
  const [hydrated,     setHydrated]     = useState(false);

  // ── Hydrate from SecureStore on first mount ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(USER_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        // Corrupt store — ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ── Register the global 401 callback with the API service ─────────────────
  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setRoleVerified(false);
    router.replace('/login');
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(handleUnauthorized);
  }, [handleUnauthorized]);

  // ── Server-side role refresh ───────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (!token) return;
    try {
      const { data } = await authAPI.getMe({ _suppressGlobalLogout: true });
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
      setUser(data);
      setRoleVerified(true);
    } catch {
      // Silently swallow — real auth failures caught by the API interceptor
    }
  }, []);

  // Verify role once per app session
  useEffect(() => {
    if (hydrated && user && !roleVerified) {
      refreshUser();
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(credentials);
      await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setRoleVerified(true);
      return { success: true, user: data.user };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg =
        status === 429 ? 'Too many attempts — wait a minute and try again' :
        status === 401 ? 'Invalid email or password' :
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Login failed';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register(payload);
      await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setRoleVerified(true);
      return { success: true };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg =
        status === 429 ? 'Too many attempts — wait a minute and try again' :
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Registration failed';
      return { success: false, error: msg, statusCode: status };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => null);
    setUser(null);
    setRoleVerified(false);
    router.replace('/login');
  }, []);

  // ── Update local user ─────────────────────────────────────────────────────
  const updateUser = async (updated: Partial<User>) => {
    const merged = { ...user, ...updated } as User;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged)).catch(() => null);
    setUser(merged);
  };

  // ── Derived role flags ────────────────────────────────────────────────────
  const isAuthenticated = !!user;
  const role    = user?.role?.toUpperCase() ?? '';
  const isAgent  = role === 'AGENT';
  const isSeller = role === 'SELLER' || isAgent;
  const isAdmin  = role === 'ADMIN';
  const isBuyer  = role === 'BUYER';

  if (!hydrated) return null; // Prevent flicker until SecureStore is read

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated,
      isBuyer, isSeller, isAgent, isAdmin,
      login, register, logout, updateUser, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
