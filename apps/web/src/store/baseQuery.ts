import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { api, ApiError } from '../api/client';

export interface RequestArgs {
  url: string;
  method?: string;
  body?: unknown;
}

export interface RequestError {
  status: number;
  message: string;
  code?: string;
}

// RTK Query'nin taban sorgusu: mevcut API istemcisini (token yenileme dahil) kullanır.
// Hatalar, bileşenlerin okuyabileceği { status, message, code } biçiminde döner.
export const baseQuery: BaseQueryFn<RequestArgs, unknown, RequestError> = async (args) => {
  try {
    const data = await api<unknown>(args.url, {
      method: args.method ?? 'GET',
      body: args.body !== undefined ? JSON.stringify(args.body) : undefined,
    });
    return { data };
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: { status: e.status, message: e.message, code: e.code } };
    }
    return { error: { status: 0, message: 'Bir hata oluştu' } };
  }
};

// Yakalanan hatadan kullanıcıya gösterilecek metni çıkarır.
export function errorText(e: unknown, fallback: string): string {
  const msg = (e as { message?: unknown } | null)?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}
