import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { reviewsApi, stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Stylist, StylistReviews, StylistService } from '../api/types';
import { Card, Centered, ErrorText, colors } from '../components/ui';
import { formatPrice } from '../lib/format';
import { formatDateKey, istanbulDateOf } from '../lib/time';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StylistDetail'>;

export function StylistDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { stylistId } = route.params;
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [services, setServices] = useState<StylistService[]>([]);
  const [reviews, setReviews] = useState<StylistReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, sv] = await Promise.all([stylistsApi.get(stylistId), stylistsApi.services(stylistId)]);
        setStylist(s);
        setServices(sv);
        navigation.setOptions({ title: `${s.ad} ${s.soyad}` });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.genericError'));
      } finally {
        setLoading(false);
      }
    })();
    // Değerlendirme hatası sayfayı engellemez.
    reviewsApi
      .forStylist(stylistId)
      .then(setReviews)
      .catch(() => setReviews(null));
  }, [stylistId, navigation, t]);

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }

  if (error || !stylist) {
    return (
      <Centered>
        <ErrorText message={error} />
      </Centered>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} style={{ backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
        {stylist.ad} {stylist.soyad}
      </Text>
      {stylist.bio ? <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 16 }}>{stylist.bio}</Text> : null}

      {reviews && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('review.title')}</Text>
          {reviews.adet === 0 ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>{t('review.none')}</Text>
          ) : (
            <>
              <Text style={{ color: '#B45309', marginTop: 6, fontWeight: '600' }}>
                {reviews.ortalama?.toFixed(1)} · {t('review.count', { count: reviews.adet })}
              </Text>
              {reviews.yorumlar.slice(0, 5).map((y) => (
                <View key={y.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '500' }}>
                    {'★'.repeat(y.puan)}
                    {'☆'.repeat(5 - y.puan)} · {y.musteri}
                  </Text>
                  {y.yorum ? <Text style={{ color: colors.text, marginTop: 2 }}>{y.yorum}</Text> : null}
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {formatDateKey(istanbulDateOf(y.createdAt))}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Card>
      )}

      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginVertical: 12 }}>
        {t('stylists.services')}
      </Text>

      {services.length === 0 ? (
        <Text style={{ color: colors.muted }}>{t('stylists.noServices')}</Text>
      ) : (
        services.map((sv) => (
          <Pressable
            key={sv.id}
            onPress={() =>
              navigation.navigate('Booking', {
                stylistId: stylist.id,
                stylistName: `${stylist.ad} ${stylist.soyad}`,
                serviceId: sv.id,
                serviceName: sv.ad,
                sureDk: sv.sureDk,
                fiyat: sv.fiyat,
              })
            }
          >
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{sv.ad}</Text>
                  <Text style={{ color: colors.muted, marginTop: 4 }}>
                    {t('stylists.minutes', { count: sv.sureDk })}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{formatPrice(sv.fiyat)}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
