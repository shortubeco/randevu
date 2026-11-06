// Geliştirmede Vite proxy'si /api'yi yönlendirir. Üretimde VITE_API_URL tam adres olmalı.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
const RT_KEY = 'rt';

// Access token yalnızca bellekte tutulur; refresh token tarayıcıda saklanır.
let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(RT_KEY);
  } catch {
    return null;
  }
}

export function setSession(access: string, refresh: string) {
  accessToken = access;
  try {
    localStorage.setItem(RT_KEY, refresh);
  } catch {
    /* gizli modda saklama başarısız olabilir; oturum bellekte kalır */
  }
}

export function clearSession() {
  accessToken = null;
  try {
    localStorage.removeItem(RT_KEY);
  } catch {
    /* yoksay */
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (Array.isArray(body.message)) message = body.message.join(', ');
    else if (typeof body.message === 'string') message = body.message;
  } catch {
    /* gövde JSON değilse varsayılan mesaj */
  }
  return new ApiError(res.status, message);
}

// Yenileme isteği devam ederken gelen çağrılar aynı isteği paylaşır. Refresh token her
// yenilemede döndüğü için aynı token'ın iki kez gönderilmesi sunucuda oturumların iptaline yol açar.
let refreshing: Promise<boolean> | null = null;

// Refresh token ile yeni oturum alır. Başarısızsa oturumu temizler.
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) {
    clearSession();
    sessionExpiredHandler?.();
    return false;
  }
  const data = await res.json();
  setSession(data.accessToken, data.refreshToken);
  return true;
}

// Oturum sunucu tarafında geçersiz kılındığında (yenileme reddedildi) çağrılır; AuthContext kullanıcıyı çıkarır.
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = () =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });

  let res = await send();
  if (res.status === 401 && (await refreshSession())) {
    res = await send();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
