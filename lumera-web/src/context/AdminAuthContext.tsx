import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../api/client';

const adminApi = axios.create({ baseURL: '/api/admin', withCredentials: true });

interface AdminUser {
  username: string;
}

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await adminApi.get('/me');
      setAdmin(res.data);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(username: string, password: string) {
    try {
      const res = await adminApi.post('/login', { username, password });
      setAdmin({ username: res.data.username });
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'Could not log you in.'));
    }
  }

  async function logout() {
    try {
      await adminApi.post('/logout');
    } finally {
      setAdmin(null);
    }
  }

  return <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export default adminApi;
