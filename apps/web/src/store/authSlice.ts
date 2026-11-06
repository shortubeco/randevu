import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  api,
  ApiError,
  clearSession,
  getRefreshToken,
  isPasswordChangeRequired,
  refreshSession,
  setSession,
} from '../api/client';
import { apiSlice } from './apiSlice';

// Veritabanındaki rollerle aynı. Müşteri (MUSTERI) bu panele girmez.
export type Role = 'PLATFORM_ADMIN' | 'ISLETME_SAHIBI' | 'KUAFOR' | 'MUSTERI';

export interface User {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  role: Role;
  // true ise kullanıcı şifresini değiştirmeden panelin diğer sayfalarına giremez (kuaför ilk girişi).
  sifreDegismeli: boolean;
}

type Me = Omit<User, 'sifreDegismeli'>;

interface AuthState {
  user: User | null;
  // Sayfa açılışında oturum geri yüklenirken true.
  loading: boolean;
}

const initialState: AuthState = { user: null, loading: true };

// Sayfa yenilenince (store sıfırlanınca) refresh token ile oturumu geri yükler.
export const restoreSession = createAsyncThunk<User | null>('auth/restore', async () => {
  try {
    if (!getRefreshToken()) return null;
    if (!(await refreshSession())) return null;
    const me = await api<Me>('/auth/me');
    return { ...me, sifreDegismeli: isPasswordChangeRequired() };
  } catch {
    // Ağ hatası: refresh token silinmez; sunucu reddederse refreshSession zaten temizler.
    return null;
  }
});

// Oturumu yerelde sonlandırır ve önbelleği temizler (sunucuya istek yok).
export const endSession = createAsyncThunk<void>('auth/endSession', async (_, { dispatch }) => {
  clearSession();
  dispatch(apiSlice.util.resetApiState());
});

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: { status: number; code?: string; message: string } }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const data = await api<{ accessToken: string; refreshToken: string; sifreDegismeli: boolean; user: Me }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      if (data.user.role === 'MUSTERI') {
        // Müşteri hesabı mobil uygulamada kullanılır; bu panelde oturum açılmaz.
        return rejectWithValue({ status: 403, code: 'MUSTERI_PANEL', message: 'customer account' });
      }
      // Önceki kullanıcının önbelleği bu oturuma taşınmasın.
      dispatch(apiSlice.util.resetApiState());
      setSession(data.accessToken, data.refreshToken);
      return { ...data.user, sifreDegismeli: data.sifreDegismeli };
    } catch (e) {
      if (e instanceof ApiError) return rejectWithValue({ status: e.status, code: e.code, message: e.message });
      return rejectWithValue({ status: 0, message: 'Bir hata oluştu' });
    }
  },
);

// Çıkış: sunucudaki oturum kapatılır (beklenmez), yerel oturum ve tüm önbellek temizlenir.
export const logout = createAsyncThunk<void>('auth/logout', async (_, { dispatch }) => {
  const rt = getRefreshToken();
  if (rt) {
    api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }).catch(() => {});
  }
  clearSession();
  dispatch(apiSlice.util.resetApiState());
});

// Kullanıcı bilgisini sunucudan yeniden okur (profil güncellemesinden sonra).
export const refreshUser = createAsyncThunk<User, void>('auth/refreshUser', async (_, { getState }) => {
  const me = await api<Me>('/auth/me');
  const prev = (getState() as { auth: AuthState }).auth.user;
  return { ...me, sifreDegismeli: prev?.sifreDegismeli ?? false };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Geçici şifre bayrağı sunucudan geldiğinde (SIFRE_DEGISMELI).
    passwordChangeNeeded(state) {
      if (state.user) state.user.sifreDegismeli = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(endSession.fulfilled, (state) => {
        state.user = null;
      })
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.loading = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { passwordChangeNeeded } = authSlice.actions;
export default authSlice.reducer;
