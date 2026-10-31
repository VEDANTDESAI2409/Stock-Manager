import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('stock_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Check current auth status with backend
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('stock_manager_token');
      // Even without token in localStorage, test cookie authentication
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setAdmin(res.data.admin);
        localStorage.setItem('stock_manager_user', JSON.stringify(res.data.admin));
      } else {
        setAdmin(null);
        localStorage.removeItem('stock_manager_user');
        localStorage.removeItem('stock_manager_token');
      }
    } catch (err) {
      setAdmin(null);
      localStorage.removeItem('stock_manager_user');
      localStorage.removeItem('stock_manager_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { admin: userData, token } = res.data;
      setAdmin(userData);
      if (token) {
        localStorage.setItem('stock_manager_token', token);
      }
      localStorage.setItem('stock_manager_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      setAdmin(null);
      localStorage.removeItem('stock_manager_token');
      localStorage.removeItem('stock_manager_user');
    }
  };

  const updateProfile = async (profileData) => {
    const res = await api.put('/auth/profile', profileData);
    if (res.data?.success) {
      setAdmin(res.data.admin);
      localStorage.setItem('stock_manager_user', JSON.stringify(res.data.admin));
      return res.data;
    }
    throw new Error(res.data?.message || 'Failed to update profile');
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        loading,
        login,
        logout,
        updateProfile,
        changePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

