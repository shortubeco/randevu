import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { appointmentsApi, stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Slot } from '../api/types';
import { Button, EmptyState, ErrorText, SectionTitle, Txt } from '../components/ui';
import { formatPrice } from '../lib/format';
import { addDays, istanbulDateKey, weekdayOf } from '../lib/time';
import { colors, radius, spacing, type } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const DAYS_AHEAD = 14;
const SLOT_COLUMNS = 4;

interface SlotResult {
  key: string;
  slots: Slot[];
  error: string | null;
}

export function BookingScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = route.params;
  const reschedule = params.appointmentId !== undefined;

  const today = istanbulDateKey();
  const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Yükleme durumu istek anahtarından türetilir; effect içinde setState çağrılmaz.
  const requestKey = `${selectedDate}|${reloadKey}`;
  const current = result && result.key === requestKey ? result : null;
  const slotsLoading = current === null;
  const slots = current?.slots ?? [];
  const slotsError = current?.error ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: reschedule ? t('booking.titleReschedule') : t('booking.title') });
  }, [navigation, reschedule, t]);

  // Seçilen güne göre boş saatleri yükle. Eski istekler sonucu yazmasın diye iptal kontrolü var.
  useEffect(() => {
    let active = true;
    stylistsApi
      .availability(params.stylistId, selectedDate, params.serviceId)
      .then((list) => {
        if (active) setResult({ key: requestKey, slots: list, error: null });
      })
      .catch((e) => {
        if (active) {
          setResult({
            key: requestKey,
            slots: [],
            error: e instanceof ApiError ? e.message : t('booking.loadError'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [requestKey, selectedDate, params.stylistId, params.serviceId, t]);

  function pickDate(d: string) {
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  async function confirm() {
    if (!selectedSlot) return setFormError(t('booking.pickSlot'));
    setFormError(null);
    setBusy(true);
    try {
      if (params.appointmentId !== undefined) {
        await appointmentsApi.reschedule(params.appointmentId, selectedSlot.startsAt);
        Alert.alert(t('booking.rescheduledTitle'), t('booking.rescheduledMessage'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        await appointmentsApi.create(params.stylistId, params.serviceId, selectedSlot.startsAt);
        Alert.alert(t('booking.createdTitle'), t('booking.createdMessage'), [
          { text: t('common.ok'), onPress: () => navigation.navigate('Tabs', { screen: 'Appointments' }) },
        ]);
      }
    } catch (e) {
      // Slot bu arada dolmuş olabilir: hata göster ve boş saatleri yeniden çek.
      setFormError(e instanceof ApiError ? e.message : t('common.genericError'));
      setSelectedSlot(null);
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  const slotWidth = (width - spacing.md * 2 - spacing.sm * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Txt variant="eyebrow" style={styles.summaryEyebrow}>{t('booking.summary')}</Txt>
          <Txt variant="heading" style={styles.summaryTitle}>{params.serviceName}</Txt>
          <SummaryRow label={t('booking.stylist')} value={params.stylistName} />
          {params.sureDk !== undefined ? (
            <SummaryRow label={t('booking.duration')} value={t('stylists.minutes', { count: params.sureDk })} />
          ) : null}
          {params.fiyat !== undefined ? <SummaryRow label={t('booking.price')} value={formatPrice(params.fiyat)} /> : null}
        </View>

        <SectionTitle title={t('booking.date')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dates}
          contentContainerStyle={styles.datesContent}
        >
          {dates.map((d) => {
            const active = d === selectedDate;
            const [, m, day] = d.split('-').map(Number);
            return (
              <Pressable
                key={d}
                onPress={() => pickDate(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.date, active && styles.dateActive]}
              >
                <Text style={[styles.dateWeekday, active && styles.onGold]}>{t(`days.${weekdayOf(d)}`)}</Text>
                <Text style={[styles.dateDay, active && styles.onGold]}>{day}</Text>
                <Text style={[styles.dateWeekday, active && styles.onGold]}>{t(`months.${m - 1}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle title={t('booking.time')} />
        {slotsLoading ? (
          <ActivityIndicator size="large" color={colors.goldText} style={styles.spinner} />
        ) : slotsError ? (
          <ErrorText message={slotsError} />
        ) : slots.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title={t('booking.noSlots')} />
        ) : (
          <View style={styles.slots}>
            {slots.map((slot) => {
              const active = selectedSlot?.startsAt === slot.startsAt;
              return (
                <Pressable
                  key={slot.startsAt}
                  onPress={() => setSelectedSlot(slot)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.slot, { width: slotWidth }, active && styles.dateActive]}
                >
                  <Text style={[styles.slotText, active && styles.onGold]}>{slot.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.ms }]}>
        <ErrorText message={formError} />
        <Button
          title={reschedule ? t('booking.update') : t('booking.confirm')}
          onPress={confirm}
          disabled={!selectedSlot}
          loading={busy}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Txt variant="subhead" style={styles.summaryLabel}>{label}</Txt>
      <Txt variant="subhead" style={styles.summaryValue}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  summary: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.md,
    marginBottom: spacing.ml,
  },
  summaryEyebrow: { color: colors.gold },
  summaryTitle: { color: colors.onDark, marginTop: 2, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 3 },
  summaryLabel: { color: colors.onDarkMuted },
  summaryValue: { color: colors.onDark, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  dates: { marginBottom: spacing.ml, marginHorizontal: -spacing.md },
  datesContent: { gap: spacing.sm, paddingHorizontal: spacing.md },
  date: {
    width: 62,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dateActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dateWeekday: { ...type.caption },
  dateDay: { ...type.heading },
  onGold: { color: colors.ink },
  spinner: { marginVertical: spacing.lg },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  slotText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.heading },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.ms,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
