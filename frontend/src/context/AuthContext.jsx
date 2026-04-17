// Replace: frontend/src/context/AuthContext.jsx
//
// The problem: isAdmin / isSeller / isAgent were derived purely from the
// localStorage user object. If someone edits localStorage in DevTools they
// could set role = "ADMIN" and see admin UI elements — but backend checks
// would reject their actual API calls anyway.
//
// The fix: keep localStorage for UI state (fast, no flicker), but add a
// `refreshUser()` function that re-fetches /users/me from the server and
// re-hydrates the user object. Call it on app load and after any sensitive
// operation. This ensures the role in state always reflects what the server
// actually says.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hl_user')); } catch { return null; }
  });
  const [loading, setLoading]       = useState(false);
  // Tracks whether we have done a server-side role verification this session
  const [roleVerified, setRoleVerified] = useState(false);

  // ─── Server-side role refresh ──────────────────────────────────────────
  // Fetches /users/me and overwrites localStorage + state with the server's
  // authoritative user object. Call this:
  //   • on initial app load (see useEffect below)
  //   • after login / register (already done — server just issued the token)
  //   • before rendering any admin-only page or performing admin actions
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('hl_token');
    if (!token) return;
    try {
      const { data } = await authAPI.getMe();
      localStorage.setItem('hl_user', JSON.stringify(data));
      setUser(data);
      setRoleVerified(true);
    } catch {
      // Token is invalid or expired — clear the session
      localStorage.removeItem('hl_token');
      localStorage.removeItem('hl_user');
      setUser(null);
      setRoleVerified(false);
    }
  }, []);

  // Verify role with the server once on every page load / tab refresh.
  // This ensures an expired or revoked token is caught immediately, and
  // that the role in state is always what the backend says.
  useEffect(() => {
    if (user && !roleVerified) {
      refreshUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth actions ──────────────────────────────────────────────────────
  const login = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(credentials);
      localStorage.setItem('hl_token', data.accessToken);
      localStorage.setItem('hl_user', JSON.stringify(data.user));
      setUser(data.user);
      setRoleVerified(true); // server just told us the role via the login response
      return { success: true, user: data.user };
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 429 ? 'Too many login attempts — wait a minute and try again'
                : status === 401 ? 'Invalid email or password'
                : err.response?.data?.message || 'Login failed';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register(payload);
      localStorage.setItem('hl_token', data.accessToken);
      localStorage.setItem('hl_user', JSON.stringify(data.user));
      setUser(data.user);
      setRoleVerified(true);
      return { success: true };
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 429 ? 'Too many attempts — wait a minute and try again'
                : err.response?.data?.message || 'Registration failed';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hl_token');
    localStorage.removeItem('hl_user');
    setUser(null);
    setRoleVerified(false);
  }, []);

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('hl_user', JSON.stringify(merged));
    setUser(merged);
  };

  // ─── Derived role flags ────────────────────────────────────────────────
  // These are derived from state — which on every fresh page load is
  // re-verified against the server via the useEffect above.
  const isAuthenticated = !!user;
  const role      = user?.role?.toUpperCase();
  const isAgent   = role === 'AGENT';
  const isSeller  = role === 'SELLER' || role === 'AGENT';
  const isAdmin   = role === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user, loading, roleVerified,
      login, register, logout, updateUser, refreshUser,
      isAuthenticated, isAgent, isSeller, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
