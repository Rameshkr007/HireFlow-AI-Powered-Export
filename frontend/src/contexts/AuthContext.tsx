import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { User } from '../lib/types';
import { queryClient } from '../lib/queryClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, exporter_name?: string, company_name?: string) => Promise<void>;
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
        .catch((err) => {
          // ONLY clear token if the server explicitly returned 401 Unauthorized
          // Never log out the user on Render cold starts (502, 503, 504), network timeouts, or offline errors!
          if (err.response?.status === 401) {
            localStorage.removeItem('hireflow_token');
            setToken(null);
            setUser(null);
            queryClient.clear();
          }
        })
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
    queryClient.clear();
    const me = await api.get('/api/auth/me');
    setUser(me.data);
    await queryClient.invalidateQueries();
  };

  const register = async (email: string, password: string, exporter_name?: string, company_name?: string) => {
    await api.post('/api/auth/register', { email, password, exporter_name, company_name });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('hireflow_token');
    setToken(null);
    setUser(null);
    queryClient.clear();
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
