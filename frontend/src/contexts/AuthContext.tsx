import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hireflow_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('hireflow_token'); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { access_token } = res.data;
    localStorage.setItem('hireflow_token', access_token);
    setToken(access_token);
    const me = await api.get('/api/auth/me');
    setUser(me.data);
  };

  const register = async (email: string, password: string) => {
    await api.post('/api/auth/register', { email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('hireflow_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
