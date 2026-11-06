// Sayfa geçişlerinde tek seferlik bilgi mesajı (ör. şifre değişti, tekrar giriş yapın).
const KEY = 'flash';

export function setFlash(message: string) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    /* yoksay */
  }
}

export function takeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
