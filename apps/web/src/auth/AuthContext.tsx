import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearSession, getRefreshToken, refreshSession, setSession } from '../api/client';

export type Role = 'ADMIN' | 'KUAFOR' | 'MUSTERI';

export interface User {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yenilendiğinde kayıtlı refresh token ile oturumu geri yükle.
  useEffect(() => {
    (async () => {
      try {
        if (getRefreshToken() && (await refreshSession())) {
          setUser(await api<User>('/auth/me'));
        }
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setSession(data.accessToken, data.refreshToken);
    setUser(data.user);
  }

  function logout() {
    const rt = getRefreshToken();
    if (rt) {
      // Sunucu tarafını beklemeden yerel oturumu kapatır.
      api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }).catch(() => {});
    }
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
