import { useCallback, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Appointment } from '../api/types';
import { Button, Card, Centered, EmptyState, ErrorText, Loading, SectionTitle, Stars, StatusBadge, Txt } from '../components/ui';
import { formatPrice } from '../lib/format';
import { canChange, istanbulDateOf, istanbulTime } from '../lib/time';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const ACTIVE = new Set(['BEKLIYOR', 'ONAYLANDI']);

export function AppointmentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Zaman, yükleme anında alınır; render içinde Date.now() çağrılmaz.
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setItems(await appointmentsApi.mine());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setNow(Date.now());
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Ekran her odaklandığında yenile (randevu alındıktan veya değiştirildikten sonra).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upcoming = items
    .filter((a) => ACTIVE.has(a.status) && new Date(a.baslangic).getTime() >= now)
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic));
  const past = items
    .filter((a) => !(ACTIVE.has(a.status) && new Date(a.baslangic).getTime() >= now))
    .sort((a, b) => b.baslangic.localeCompare(a.baslangic));

  const sections = [
    { title: t('appointments.upcoming'), data: upcoming },
    { title: t('appointments.past'), data: past },
  ].filter((s) => s.data.length > 0);

  function confirmCancel(a: Appointment) {
    Alert.alert(t('appointments.cancel'), t('appointments.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appointments.cancel'),
        style: 'destructive',
        onPress: async () => {
          try {
            await appointmentsApi.cancel(a.id);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), e instanceof ApiError ? e.message : t('common.genericError'));
          }
        },
      },
    ]);
  }

  function goReschedule(a: Appointment) {
    navigation.navigate('Booking', {
      stylistId: a.stylistId,
      stylistName: `${a.kuaforAd} ${a.kuaforSoyad}`,
      serviceId: a.serviceId,
      serviceName: a.hizmet,
      fiyat: a.fiyat,
      appointmentId: a.id,
    });
  }

  if (loading) return <Loading />;

  if (error && items.length === 0) {
    return (
      <Centered>
        <ErrorText message={error} />
        <Button title={t('common.retry')} variant="secondary" onPress={load} />
      </Centered>
    );
  }

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(a) => String(a.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.goldText}
          colors={[colors.goldText]}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListEmptyComponent={
        <EmptyState icon="calendar-outline" title={t('appointments.empty')}>
          <Button
            title={t('appointments.findShop')}
            size="sm"
            onPress={() => navigation.navigate('Tabs', { screen: 'Shops' })}
          />
        </EmptyState>
      }
      renderSectionHeader={({ section }) => <SectionTitle title={section.title} style={styles.sectionTitle} />}
      renderItem={({ item: a }) => {
        const changeable = canChange(a, now);
        const upcomingItem = ACTIVE.has(a.status) && new Date(a.baslangic).getTime() >= now;
        const showLock = upcomingItem && !changeable;
        const [, month, day] = istanbulDateOf(a.baslangic).split('-').map(Number);
        return (
          <Card>
            <View style={styles.row}>
              <View style={[styles.dateTile, !upcomingItem && styles.dateTilePast]}>
                <Txt variant="title" style={[styles.dateDay, !upcomingItem && styles.dateTextPast]}>{day}</Txt>
                <Txt variant="caption" style={[styles.dateMonth, !upcomingItem && styles.dateTextPast]}>
                  {t(`months.${month - 1}`)}
                </Txt>
              </View>
              <View style={styles.body}>
                <Txt variant="headline">{a.hizmet}</Txt>
                <Txt variant="subhead">{a.kuaforAd} {a.kuaforSoyad}</Txt>
                <View style={styles.meta}>
                  <Ionicons name="time-outline" size={14} color={colors.goldText} />
                  <Txt variant="subhead" style={styles.metaText}>
                    {istanbulTime(a.baslangic)} · {formatPrice(a.fiyat)}
                  </Txt>
                </View>
              </View>
            </View>
            <View style={styles.statusRow}>
              <StatusBadge status={a.status} />
              {a.puan !== null ? <Stars value={a.puan} /> : null}
            </View>

            {changeable ? (
              <View style={styles.actions}>
                <Button title={t('appointments.change')} variant="secondary" size="sm" style={styles.action} onPress={() => goReschedule(a)} />
                <Button title={t('appointments.cancel')} variant="danger" size="sm" style={styles.action} onPress={() => confirmCancel(a)} />
              </View>
            ) : null}
            {showLock ? (
              <View style={styles.lock}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
                <Txt variant="caption" style={styles.lockText}>{t('appointments.locked')}</Txt>
              </View>
            ) : null}
            {a.status === 'TAMAMLANDI' && a.puan === null ? (
              <Button
                title={t('review.cta')}
                variant="secondary"
                size="sm"
                icon="star-outline"
                style={styles.reviewButton}
                onPress={() =>
                  navigation.navigate('Review', {
                    appointmentId: a.id,
                    kuaforAd: `${a.kuaforAd} ${a.kuaforSoyad}`,
                    hizmet: a.hizmet,
                  })
                }
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, flexGrow: 1 },
  sectionTitle: { marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.ms },
  dateTile: {
    width: 60,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
  },
  dateTilePast: { backgroundColor: colors.bg },
  dateDay: { color: colors.gold },
  dateMonth: { color: colors.onDarkMuted },
  dateTextPast: { color: colors.muted },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  metaText: { color: colors.text, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.ms },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.ms },
  action: { flex: 1 },
  lock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.ms },
  lockText: { flex: 1 },
  reviewButton: { marginTop: spacing.ms },
});
