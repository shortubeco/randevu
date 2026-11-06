import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { appointmentsApi, stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Slot } from '../api/types';
import { Button, Card, ErrorText, colors } from '../components/ui';
import { formatPrice } from '../lib/format';
import { addDays, formatDateKey, istanbulDateKey, weekdayOf } from '../lib/time';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const DAYS_AHEAD = 14;

interface SlotResult {
  key: string;
  slots: Slot[];
  error: string | null;
}

export function BookingScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Card>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>{t('booking.summary')}</Text>
        <SummaryRow label={t('booking.stylist')} value={params.stylistName} />
        <SummaryRow label={t('booking.service')} value={params.serviceName} />
        {params.sureDk !== undefined ? (
          <SummaryRow label={t('booking.duration')} value={t('stylists.minutes', { count: params.sureDk })} />
        ) : null}
        {params.fiyat !== undefined ? <SummaryRow label={t('booking.price')} value={formatPrice(params.fiyat)} /> : null}
      </Card>

      <Text style={sectionTitle}>{t('booking.date')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {dates.map((d) => {
          const active = d === selectedDate;
          return (
            <Pressable
              key={d}
              onPress={() => pickDate(d)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginRight: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.card,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, color: active ? '#fff' : colors.muted }}>
                {t(`days.${weekdayOf(d)}`)}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: active ? '#fff' : colors.text }}>
                {formatDateKey(d).slice(0, 5)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={sectionTitle}>{t('booking.time')}</Text>
      {slotsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : slotsError ? (
        <ErrorText message={slotsError} />
      ) : slots.length === 0 ? (
        <Text style={{ color: colors.muted, marginBottom: 12 }}>{t('booking.noSlots')}</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {slots.map((slot) => {
            const active = selectedSlot?.startsAt === slot.startsAt;
            return (
              <Pressable
                key={slot.startsAt}
                onPress={() => setSelectedSlot(slot)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                <Text style={{ fontWeight: '600', color: active ? '#fff' : colors.text }}>{slot.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ErrorText message={formError} />
      <Button
        title={reschedule ? t('booking.update') : t('booking.confirm')}
        onPress={confirm}
        disabled={!selectedSlot}
        loading={busy}
      />
    </ScrollView>
  );
}

const sectionTitle = { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 8 };

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
