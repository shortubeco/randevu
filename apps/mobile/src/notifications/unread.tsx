import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

interface UnreadValue {
  unread: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const UnreadContext = createContext<UnreadValue>({
  unread: 0,
  refresh: async () => undefined,
  markAllRead: async () => undefined,
});

// Açık uygulamada periyodik kontrol. Push gelmese bile sayı sunucudan güncellenir.
const POLL_MS = 60 * 1000;

// Okunmamış bildirim sayısını tutar: sekme rozeti için. Yalnızca oturum açıkken çalışır.
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [count, setCount] = useState(0);
  const signedIn = status === 'signedIn';

  const refresh = useCallback(async () => {
    try {
      const r = await notificationsApi.unreadCount();
      setCount(r.adet);
    } catch {
      /* ağ hatası: mevcut sayı korunur */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setCount(0);
    } catch {
      /* yoksay; bir sonraki kontrolde tekrar denenir */
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    // İlk kontrol hemen (zamanlayıcı üzerinden); effect gövdesinde doğrudan state güncellenmez.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void refresh();
    });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      appSub.remove();
      receivedSub.remove();
    };
  }, [signedIn, refresh]);

  const value = useMemo<UnreadValue>(
    () => ({ unread: signedIn ? count : 0, refresh, markAllRead }),
    [signedIn, count, refresh, markAllRead],
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadValue {
  return useContext(UnreadContext);
}
