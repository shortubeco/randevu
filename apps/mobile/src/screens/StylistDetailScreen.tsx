import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { reviewsApi, stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Stylist, StylistReviews, StylistService } from '../api/types';
import { Avatar, Card, Centered, ErrorText, Loading, SectionTitle, Stars, Txt } from '../components/ui';
import { formatPrice } from '../lib/format';
import { formatDateKey, istanbulDateOf } from '../lib/time';
import { colors, radius, spacing } from '../theme';
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
  }, [stylistId, t]);

  if (loading) return <Loading />;

  if (error || !stylist) {
    return (
      <Centered>
        <ErrorText message={error} />
      </Centered>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.profile}>
        <Avatar ad={stylist.ad} soyad={stylist.soyad} photoUrl={stylist.photoUrl} size={84} onDark />
        <Txt variant="title" style={styles.name}>{stylist.ad} {stylist.soyad}</Txt>
        <Txt variant="subhead" style={styles.shop}>{stylist.dukkanAd} · {stylist.isletmeAd}</Txt>
        {stylist.ortalama !== null ? (
          <View style={styles.rating}>
            <Stars value={stylist.ortalama} size={16} />
            <Txt variant="subhead" style={styles.ratingText}>
              {stylist.ortalama.toFixed(1)} · {t('review.count', { count: stylist.adet })}
            </Txt>
          </View>
        ) : null}
        {stylist.bio ? <Txt variant="body" style={styles.bio}>{stylist.bio}</Txt> : null}
      </View>

      <View style={styles.body}>
        <SectionTitle title={t('stylists.services')} />
        {services.length === 0 ? (
          <Txt variant="subhead">{t('stylists.noServices')}</Txt>
        ) : (
          <Card style={styles.group}>
            {services.map((sv, i) => (
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
                accessibilityRole="button"
                style={({ pressed }) => [styles.service, i > 0 && styles.divider, pressed && styles.pressed]}
              >
                <View style={styles.serviceBody}>
                  <Txt variant="headline">{sv.ad}</Txt>
                  <View style={styles.duration}>
                    <Ionicons name="time-outline" size={14} color={colors.muted} />
                    <Txt variant="caption">{t('stylists.minutes', { count: sv.sureDk })}</Txt>
                  </View>
                </View>
                <Txt variant="heading" style={styles.price}>{formatPrice(sv.fiyat)}</Txt>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Card>
        )}

        {reviews && (
          <>
            <SectionTitle title={t('review.title')} style={styles.reviewsTitle} />
            {reviews.adet === 0 ? (
              <Txt variant="subhead">{t('review.none')}</Txt>
            ) : (
              reviews.yorumlar.slice(0, 5).map((y) => (
                <Card key={y.id}>
                  <View style={styles.reviewHead}>
                    <Stars value={y.puan} />
                    <Txt variant="caption">{formatDateKey(istanbulDateOf(y.createdAt))}</Txt>
                  </View>
                  {y.yorum ? <Txt variant="body" style={styles.reviewText}>{y.yorum}</Txt> : null}
                  <Txt variant="caption" style={styles.reviewer}>{y.musteri}</Txt>
                </Card>
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.lg },
  profile: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.ink,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  name: { color: colors.onDark, marginTop: spacing.sm, textAlign: 'center' },
  shop: { color: colors.onDarkMuted, textAlign: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  ratingText: { color: colors.gold },
  bio: { color: colors.onDarkMuted, textAlign: 'center', marginTop: spacing.sm },
  body: { padding: spacing.md },
  group: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  service: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 64 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.goldTint },
  serviceBody: { flex: 1, gap: 2 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  price: { color: colors.goldText },
  reviewsTitle: { marginTop: spacing.md },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewText: { marginTop: spacing.sm },
  reviewer: { marginTop: spacing.sm, fontWeight: '600', color: colors.text },
});
