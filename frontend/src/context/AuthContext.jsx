import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';

const parseToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined') return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return {
      id: decoded.id,
      role: decoded.role || 'student',
      username: decoded.username || 'Guest',
      email: decoded.email || '',
      profile: decoded.profile || null,
      createdAt: decoded.createdAt || null,
      instituteId: decoded.instituteId || null,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => parseToken());

  const clearAnnouncementPopupSession = useCallback(() => {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('admin-announcement-popup:')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const refreshUser = useCallback(() => {
    setUser(parseToken());
  }, []);

  const login = useCallback((token) => {
    clearAnnouncementPopupSession();
    localStorage.setItem(TOKEN_KEY, token);
    refreshUser();
  }, [clearAnnouncementPopupSession, refreshUser]);

  const logout = useCallback(() => {
    clearAnnouncementPopupSession();
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = '/login';
  }, [clearAnnouncementPopupSession]);

  const isAuthenticated = user !== null;

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === TOKEN_KEY) refreshUser();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};