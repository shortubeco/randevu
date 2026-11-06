import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppointmentStatus } from '../api/types';

export const colors = {
  primary: '#B5485D',
  primaryText: '#FFFFFF',
  bg: '#F7F5F6',
  card: '#FFFFFF',
  text: '#1F1A1C',
  muted: '#6B6266',
  border: '#E5DFE1',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
};

const STATUS_STYLE: Record<AppointmentStatus, { fg: string; bg: string }> = {
  BEKLIYOR: { fg: '#92400E', bg: '#FEF3C7' },
  ONAYLANDI: { fg: '#065F46', bg: '#D1FAE5' },
  IPTAL: { fg: '#991B1B', bg: '#FEE2E2' },
  TAMAMLANDI: { fg: '#1E40AF', bg: '#DBEAFE' },
  GELMEDI: { fg: '#374151', bg: '#E5E7EB' },
};

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation();
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const isOff = disabled || loading;
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerBg : colors.card;
  const fg = variant === 'primary' ? colors.primaryText : variant === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? colors.primary : bg },
        pressed && !isOff && { opacity: 0.8 },
        isOff && { opacity: 0.5 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 12,
  },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: 12, fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
