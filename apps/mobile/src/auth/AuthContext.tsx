import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type RegisterInput } from '../api/endpoints';
import {
  ApiError,
  clearSession,
  getStoredRefreshToken,
  refreshAccess,
  saveSession,
  setOnUnauthorized,
} from '../api/client';
import type { User } from '../api/types';
import { registerPush, unregisterPush } from '../notifications/push';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  const signOutLocally = useCallback(() => {
    setUserState(null);
    setStatus('signedOut');
  }, []);

  // Uygulama açılışında kayıtlı refresh token ile oturumu geri yükle.
  useEffect(() => {
    setOnUnauthorized(signOutLocally);
    (async () => {
      try {
        const stored = await getStoredRefreshToken();
        if (!stored) return signOutLocally();
        const ok = await refreshAccess();
        if (!ok) return signOutLocally();
        const me = await authApi.me();
        if (me.role !== 'MUSTERI') return signOutLocally();
        setUserState(me);
        setStatus('signedIn');
        void registerPush();
      } catch {
        // Ağ hatası olabilir; token silinmez, kullanıcı giriş ekranına düşer.
        signOutLocally();
      }
    })();
    return () => setOnUnauthorized(null);
  }, [signOutLocally]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email.trim().toLowerCase(), password);
    // Mobil uygulama yalnızca müşteri hesaplarını kabul eder; işletme ve kuaför hesapları web panelini kullanır.
    if (res.user.role !== 'MUSTERI') throw new ApiError(403, 'customer-only');
    await saveSession(res.accessToken, res.refreshToken);
    setUserState(res.user);
    setStatus('signedIn');
    void registerPush();
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register({ ...input, email: input.email.trim().toLowerCase() });
    await saveSession(res.accessToken, res.refreshToken);
    setUserState(res.user);
    setStatus('signedIn');
    void registerPush();
  }, []);

  const logout = useCallback(async () => {
    // Cihaz kaydı, oturum kapanmadan önce silinmeli (istek yetkili).
    await unregisterPush();
    const rt = await getStoredRefreshToken();
    if (rt) await authApi.logout(rt).catch(() => undefined);
    await clearSession();
    signOutLocally();
  }, [signOutLocally]);

  const value = useMemo<AuthValue>(
    () => ({ status, user, login, register, logout, setUser: setUserState }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
