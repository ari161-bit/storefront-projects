import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api, { apiErrorMessage } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'lumera_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string, rememberMe: boolean) {
    try {
      const res = await api.post('/auth/login', { email, password, rememberMe });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'Could not log you in.'));
    }
  }

  async function signup(name: string, email: string, password: string, confirmPassword: string) {
    try {
      const res = await api.post('/auth/signup', { name, email, password, confirmPassword });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'Could not create your account.'));
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
