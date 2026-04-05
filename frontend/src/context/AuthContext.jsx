import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('hl_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login(credentials);
      localStorage.setItem('hl_token', data.accessToken);
      localStorage.setItem('hl_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Login failed' };
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
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hl_token');
    localStorage.removeItem('hl_user');
    setUser(null);
  }, []);

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('hl_user', JSON.stringify(merged));
    setUser(merged);
  };

  const isAuthenticated = !!user;
  const isAgent   = user?.role === 'AGENT';
  const isSeller  = user?.role === 'SELLER' || user?.role === 'AGENT';
  const isAdmin   = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAuthenticated, isAgent, isSeller, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
