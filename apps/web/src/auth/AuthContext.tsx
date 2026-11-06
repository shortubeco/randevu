import { useEffect, type ReactNode } from 'react';
import { ApiError, setPasswordChangeHandler, setSessionExpiredHandler } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  endSession,
  login as loginThunk,
  logout as logoutThunk,
  passwordChangeNeeded,
  refreshUser as refreshUserThunk,
  restoreSession,
  type User,
} from '../store/authSlice';

// Oturum durumu Redux'ta (authSlice). Bu bileşen yalnızca açılışta oturumu geri yükler
// ve API istemcisinin oturum olayları (süre dolumu, geçici şifre) Redux'a iletilir.
export type { Role, User } from '../store/authSlice';

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      dispatch(endSession());
    });
    setPasswordChangeHandler(() => {
      dispatch(passwordChangeNeeded());
    });
    // Sayfa yenilenince (store boşken) refresh token ile oturumu sunucudan geri yükle.
    dispatch(restoreSession());
    return () => {
      setSessionExpiredHandler(null);
      setPasswordChangeHandler(null);
    };
  }, [dispatch]);

  return <>{children}</>;
}

interface AuthApi {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  endSession: () => void;
}

// Sayfalar bu kancayı kullanır; durum Redux'tan okunur.
export function useAuth(): AuthApi {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);

  return {
    user,
    loading,
    login: async (email, password) => {
      const result = await dispatch(loginThunk({ email, password }));
      if (loginThunk.rejected.match(result)) {
        const p = result.payload;
        throw new ApiError(p?.status ?? 0, p?.message ?? 'Bir hata oluştu', p?.code);
      }
    },
    logout: () => {
      dispatch(logoutThunk());
    },
    refreshUser: async () => {
      await dispatch(refreshUserThunk()).unwrap();
    },
    endSession: () => {
      dispatch(endSession());
    },
  };
}
