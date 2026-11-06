import * as i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import tr from './tr.json';
import en from './en.json';

export type Lang = 'tr' | 'en';
const LANG_KEY = 'lang';

i18next.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en } },
  lng: 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

// Kayıtlı dil tercihini yükler. Başarısız olursa Türkçe kalır.
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(LANG_KEY);
    if (saved === 'tr' || saved === 'en') await i18next.changeLanguage(saved);
  } catch {
    /* varsayılan dil */
  }
}

export async function setLanguage(lang: Lang): Promise<void> {
  await i18next.changeLanguage(lang);
  try {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {
    /* tercih kaydedilemedi; bu oturumda geçerli */
  }
}
