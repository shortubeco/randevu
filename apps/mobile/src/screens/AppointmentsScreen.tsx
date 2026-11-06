import { useCallback, useState } from 'react';
import { Alert, RefreshControl, SectionList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Appointment } from '../api/types';
import { Button, Card, Centered, ErrorText, StatusBadge, colors } from '../components/ui';
import { formatPrice } from '../lib/format';
import { canChange, formatDateKey, istanbulDateOf, istanbulTime } from '../lib/time';
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

  if (loading) return <Centered>{null}</Centered>;

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
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      sections={sections}
      keyExtractor={(a) => String(a.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListEmptyComponent={
        <Centered>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('appointments.empty')}</Text>
        </Centered>
      }
      renderSectionHeader={({ section }) => (
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 4 }}>
          {section.title}
        </Text>
      )}
      renderItem={({ item: a }) => {
        const changeable = canChange(a, now);
        const showLock = ACTIVE.has(a.status) && new Date(a.baslangic).getTime() >= now && !changeable;
        return (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{a.hizmet}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>
                  {a.kuaforAd} {a.kuaforSoyad}
                </Text>
              </View>
              <StatusBadge status={a.status} />
            </View>
            <Text style={{ color: colors.text, marginTop: 10, fontWeight: '500' }}>
              {formatDateKey(istanbulDateOf(a.baslangic))} · {istanbulTime(a.baslangic)} · {formatPrice(a.fiyat)}
            </Text>

            {changeable ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button title={t('appointments.change')} variant="secondary" onPress={() => goReschedule(a)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('appointments.cancel')} variant="danger" onPress={() => confirmCancel(a)} />
                </View>
              </View>
            ) : null}
            {showLock ? (
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 10 }}>{t('appointments.locked')}</Text>
            ) : null}
            {a.status === 'TAMAMLANDI' && a.puan === null ? (
              <Button
                title={t('review.cta')}
                variant="secondary"
                onPress={() =>
                  navigation.navigate('Review', {
                    appointmentId: a.id,
                    kuaforAd: `${a.kuaforAd} ${a.kuaforSoyad}`,
                    hizmet: a.hizmet,
                  })
                }
              />
            ) : null}
            {a.puan !== null ? (
              <Text style={{ color: '#B45309', marginTop: 10, fontSize: 14 }}>
                {'★'.repeat(a.puan)}
                {'☆'.repeat(5 - a.puan)}
              </Text>
            ) : null}
          </Card>
        );
      }}
    />
  );
}
