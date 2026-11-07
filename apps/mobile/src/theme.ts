import type { TextStyle } from 'react-native';
import type { AppointmentStatus } from './api/types';

// Görsel değerlerin tek kaynağı. Renkler web panelindeki temayla aynıdır (apps/web/src/index.css).
// Altın zemin üzerinde yazı her zaman koyu olur; açık zeminde altın yazı için goldText kullanılır.
export const colors = {
  gold: '#F2C05D',
  goldPressed: '#E6B04A',
  goldText: '#8A5F0F',
  goldTint: '#FBF3E0',
  ink: '#15152E',
  inkDeep: '#0B0B1A',
  inkRaised: '#22223F',
  bg: '#F7F5F0',
  card: '#FFFFFF',
  text: '#414148',
  heading: '#15152E',
  muted: '#6B6B76',
  border: '#E7E2D8',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255, 255, 255, 0.72)',
  overlay: 'rgba(0, 0, 23, 0.62)',
  overlayStrong: 'rgba(0, 0, 23, 0.74)',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  dangerPressed: '#F9D9D5',
  star: '#D99A1E',
  success: '#17754A',
};

export const statusColors: Record<AppointmentStatus, { fg: string; bg: string }> = {
  BEKLIYOR: { fg: '#7A5200', bg: '#FCEFC7' },
  ONAYLANDI: { fg: colors.gold, bg: colors.ink },
  IPTAL: { fg: '#991B1B', bg: '#FEE2E2' },
  TAMAMLANDI: { fg: '#17754A', bg: '#DCF3E6' },
  GELMEDI: { fg: '#4B4B55', bg: '#E9E7E2' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  ms: 12,
  md: 16,
  ml: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const shadows = {
  card: '0 1px 3px rgba(0, 0, 23, 0.08)',
  raised: '0 8px 24px rgba(0, 0, 23, 0.16)',
} as const;

// useFonts anahtarıyla aynı olmalı. Statik font dosyasında ağırlık fontWeight ile verilmez.
export const fonts = {
  heading: 'RobotoCondensed-Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 39, color: colors.heading },
  title: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 31, color: colors.heading },
  heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 25, color: colors.heading },
  eyebrow: { fontFamily: fonts.heading, fontSize: 15, lineHeight: 20, letterSpacing: 0.6, color: colors.goldText },
  headline: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.heading },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  subhead: { fontSize: 14, lineHeight: 20, color: colors.muted },
  caption: { fontSize: 12, lineHeight: 16, color: colors.muted },
} as const satisfies Record<string, TextStyle>;
