import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

// Access token yalnızca bellekte tutulur. Refresh token cihazın güvenli deposunda.
const RT_KEY = 'refreshToken';

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function saveSession(access: string, refresh: string) {
  accessToken = access;
  await SecureStore.setItemAsync(RT_KEY, refresh);
}

export async function clearSession() {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(RT_KEY);
  } catch {
    /* yoksay */
  }
}

export function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(RT_KEY);
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (Array.isArray(body.message)) message = body.message.join('\n');
    else if (typeof body.message === 'string') message = body.message;
  } catch {
    /* gövde JSON değilse varsayılan mesaj */
  }
  return new ApiError(res.status, message);
}

// Refresh token ile yeni oturum alır. Eşzamanlı çağrılar tek bir yenileme isteğini paylaşır.
// Refresh token her yenilemede döner; eski token iptal edilir.
export function refreshAccess(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = await getStoredRefreshToken();
      if (!rt) return false;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        await clearSession();
        return false;
      }
      const data = await res.json();
      await saveSession(data.accessToken, data.refreshToken);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // varsayılan true
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const send = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();

  if (res.status === 401 && auth) {
    const renewed = await refreshAccess();
    if (!renewed) {
      onUnauthorized?.();
      throw await parseError(res);
    }
    res = await send();
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
