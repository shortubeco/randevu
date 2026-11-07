import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { AppointmentStatus } from '../api/types';
import { colors, radius, shadows, spacing, statusColors, type } from '../theme';

export { colors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Txt({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: keyof typeof type }) {
  return <Text style={[type[variant], style]} {...rest} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation();
  const s = statusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.gold, pressed: colors.goldPressed, border: colors.gold, fg: colors.ink },
  secondary: { bg: 'transparent', pressed: colors.goldTint, border: colors.gold, fg: colors.goldText },
  danger: { bg: colors.dangerBg, pressed: colors.dangerPressed, border: colors.dangerBg, fg: colors.danger },
  ghost: { bg: 'transparent', pressed: colors.goldTint, border: 'transparent', fg: colors.goldText },
} as const;

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, disabled, loading, style }: ButtonProps) {
  const isOff = !!(disabled || loading);
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isOff, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        { backgroundColor: pressed && !isOff ? v.pressed : v.bg, borderColor: v.border },
        isOff && styles.off,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
          <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  icon?: IconName;
}

export function Field({ label, icon, style, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          accessibilityLabel={label}
          style={[styles.input, icon && styles.inputWithIcon, style]}
          {...rest}
        />
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={styles.fieldIcon} /> : null}
      </View>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Loading() {
  return (
    <Centered>
      <ActivityIndicator size="large" color={colors.goldText} />
    </Centered>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon: IconName;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.goldText} />
      </View>
      <Txt variant="headline" style={styles.center}>{title}</Txt>
      {text ? <Txt variant="subhead" style={styles.center}>{text}</Txt> : null}
      {children}
    </View>
  );
}

// Web'deki bölüm başlıklarının karşılığı: makas simgesi ve yoğun başlık.
export function SectionTitle({ title, style }: { title: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <Ionicons name="cut" size={16} color={colors.goldText} />
      <Txt variant="heading">{title}</Txt>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={styles.stars} accessible accessibilityLabel={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= full ? 'star' : 'star-outline'} size={size} color={n <= full ? colors.star : colors.border} />
      ))}
    </View>
  );
}

// Fotoğraf yoksa ad ve soyadın baş harfleri.
export function Avatar({
  ad,
  soyad,
  photoUrl,
  size = 56,
  onDark,
}: {
  ad: string;
  soyad: string;
  photoUrl?: string | null;
  size?: number;
  onDark?: boolean; // koyu zeminde görünsün diye altın daire
}) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={[styles.avatar, box]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.avatar, box, onDark && styles.avatarOnDark]}>
      <Text style={[type.heading, styles.avatarText, onDark && styles.avatarTextOnDark, { fontSize: size * 0.36, lineHeight: size * 0.44 }]}>
        {ad.charAt(0)}
        {soyad.charAt(0)}
      </Text>
    </View>
  );
}

// Fotoğraflı başlık: görselin üstünde koyu örtü, altın üst başlık ve beyaz başlık.
export function PhotoHeader({
  source,
  eyebrow,
  title,
  style,
  titleStyle,
}: {
  source: ImageSourcePropType;
  eyebrow: string;
  title: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.photo, style]}>
      <PhotoLayer source={source} />
      <View style={styles.photoBody}>
        <Txt variant="eyebrow" style={styles.onDarkEyebrow}>{eyebrow}</Txt>
        <Txt variant="title" style={[styles.onDarkTitle, titleStyle]}>{title}</Txt>
      </View>
    </View>
  );
}

// Üst öğeyi tamamen kaplayan fotoğraf ve koyu örtü. Üst öğede overflow: 'hidden' olmalı.
export function PhotoLayer({ source, strong }: { source: ImageSourcePropType; strong?: boolean }) {
  return (
    <>
      <Image source={source} style={styles.photoImage} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={[styles.photoOverlay, strong && styles.photoOverlayStrong]} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.md,
    marginBottom: spacing.ms,
    boxShadow: shadows.card,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.ml,
    paddingVertical: spacing.ms,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonSm: { minHeight: 40, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  buttonTextSm: { fontSize: 14, lineHeight: 20 },
  off: { opacity: 0.5 },
  field: { marginBottom: spacing.md },
  label: { ...type.subhead, color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 50,
    fontSize: 16,
    color: colors.heading,
  },
  inputWithIcon: { paddingRight: 44 },
  fieldIcon: { position: 'absolute', right: spacing.md, top: 16 },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.ms,
    marginBottom: spacing.ms,
  },
  errorText: { ...type.subhead, color: colors.danger, flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldTint,
    marginBottom: spacing.xs,
  },
  center: { textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.ms },
  stars: { flexDirection: 'row', gap: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  avatarOnDark: { backgroundColor: colors.gold },
  avatarText: { color: colors.gold },
  avatarTextOnDark: { color: colors.ink },
  photo: { overflow: 'hidden', backgroundColor: colors.ink },
  photoImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  photoOverlayStrong: { backgroundColor: colors.overlayStrong },
  // Alt boşluk fazla: başlığın altındaki kart bu alanın üzerine biner.
  photoBody: { flex: 1, justifyContent: 'flex-end', padding: spacing.ml, paddingBottom: spacing.xxl },
  onDarkEyebrow: { color: colors.gold },
  onDarkTitle: { color: colors.onDark, marginTop: spacing.xs },
});
