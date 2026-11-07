import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { foldTurkish } from '../lib/text';
import { colors, radius, spacing, type } from '../theme';
import { Txt, type IconName } from './ui';

export interface SelectOption {
  id: number;
  ad: string;
}

interface SelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SelectOption[];
  value: number | null;
  onChange: (id: number) => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}

// Aramalı açılır liste. 81 ilde kaydırarak aramak zor olduğu için liste, arama kutulu bir sayfada açılır.
// FlatList kullanılır: uzun listede satırlar yeniden kullanılır.
export function Select({
  label,
  placeholder,
  searchPlaceholder,
  options,
  value,
  onChange,
  icon,
  disabled,
  loading,
}: SelectProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.id === value) ?? null;
  const isOff = !!(disabled || loading);

  const filtered = useMemo(() => {
    const q = foldTurkish(query);
    return q ? options.filter((o) => foldTurkish(o.ad).includes(q)) : options;
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function pick(id: number) {
    onChange(id);
    close();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={isOff}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.ad ?? placeholder }}
        accessibilityState={{ disabled: isOff, expanded: open, busy: !!loading }}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed, isOff && styles.off]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.goldText} /> : null}
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.ad ?? placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.goldText} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.sheetHeader, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.md }]}>
            <Txt variant="title" style={styles.sheetTitle}>{label}</Txt>
            <Pressable
              onPress={close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('select.close')}
              style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
            >
              <Ionicons name="close" size={22} color={colors.onDark} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.muted}
              accessibilityLabel={searchPlaceholder}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('select.clear')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={20}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
            ListEmptyComponent={<Txt variant="subhead" style={styles.noMatch}>{t('select.noMatch')}</Txt>}
            renderItem={({ item }) => {
              const active = item.id === value;
              return (
                <Pressable
                  onPress={() => pick(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.rowPressed]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.ad}</Text>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={colors.goldText} /> : null}
                </Pressable>
              );
            }}
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.ms },
  label: { ...type.subhead, color: colors.text, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  triggerPressed: { borderColor: colors.gold, backgroundColor: colors.goldTint },
  off: { opacity: 0.5 },
  value: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.heading },
  placeholder: { color: colors.muted },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  sheetTitle: { color: colors.onDark, flex: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkRaised,
  },
  closePressed: { opacity: 0.7 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.heading, paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowActive: { backgroundColor: colors.goldTint },
  rowPressed: { backgroundColor: colors.goldTint },
  rowText: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.heading },
  rowTextActive: { fontWeight: '600' },
  noMatch: { textAlign: 'center', padding: spacing.lg },
});
