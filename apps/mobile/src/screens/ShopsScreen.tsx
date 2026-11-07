import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { locationsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { City, Shop } from '../api/types';
import { Select } from '../components/Select';
import { Button, Card, EmptyState, ErrorText, PhotoHeader, Txt } from '../components/ui';
import { colors, radius, shadows, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const PHOTO = require('../../assets/images/hero-stylist-3993320.jpg');

interface ShopsResult {
  key: string;
  list: Shop[];
  error: string | null;
}

// Müşteri akışının ilk adımı: şehir → ilçe → (isteğe bağlı hizmet araması) → dükkan.
export function ShopsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [cities, setCities] = useState<City[] | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [citiesAttempt, setCitiesAttempt] = useState(0);
  const [cityId, setCityId] = useState<number | null>(null);
  const [districts, setDistricts] = useState<City[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [shopsResult, setShopsResult] = useState<ShopsResult | null>(null);
  // Hızlı şehir değişiminde geç gelen eski yanıt yeni ilçe listesinin üzerine yazmasın.
  const latestCity = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    locationsApi
      .cities()
      .then((list) => {
        if (active) setCities(list);
      })
      .catch((e) => {
        if (active) setCitiesError(e instanceof ApiError ? e.message : t('common.genericError'));
      });
    return () => {
      active = false;
    };
  }, [t, citiesAttempt]);

  // Yazarken her harfte istek atmamak için arama kısa bir gecikmeyle uygulanır.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(handle);
  }, [query]);

  // Dükkan listesi: ilçe ve arama değişince yeniden çekilir. Eski istekler sonucu yazmaz.
  const requestKey = districtId === null ? null : `${districtId}|${search}`;
  useEffect(() => {
    if (districtId === null || requestKey === null) return;
    let active = true;
    locationsApi
      .shops(districtId, search || undefined)
      .then((list) => {
        if (active) setShopsResult({ key: requestKey, list, error: null });
      })
      .catch((e) => {
        if (active) {
          setShopsResult({
            key: requestKey,
            list: [],
            error: e instanceof ApiError ? e.message : t('common.genericError'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [districtId, search, requestKey, t]);

  const current = requestKey !== null && shopsResult && shopsResult.key === requestKey ? shopsResult : null;

  function pickCity(id: number) {
    latestCity.current = id;
    setCityId(id);
    setDistrictId(null);
    setDistricts([]);
    setDistrictsLoading(true);
    locationsApi
      .districts(id)
      .then((list) => {
        if (latestCity.current === id) setDistricts(list);
      })
      .catch(() => {
        if (latestCity.current === id) setDistricts([]);
      })
      .finally(() => {
        if (latestCity.current === id) setDistrictsLoading(false);
      });
  }

  function retryCities() {
    setCitiesError(null);
    setCitiesAttempt((n) => n + 1);
  }

  const header = (
    <View>
      <PhotoHeader
        source={PHOTO}
        eyebrow={t('shops.heroEyebrow')}
        title={t('shops.heroTitle')}
        style={[styles.hero, { paddingTop: insets.top }]}
      />
      <View style={styles.filters}>
        {citiesError ? (
          <View style={styles.citiesError}>
            <ErrorText message={citiesError} />
            <Button title={t('common.retry')} variant="secondary" size="sm" onPress={retryCities} />
          </View>
        ) : (
          <>
            <Select
              label={t('shops.city')}
              placeholder={t('shops.selectCity')}
              searchPlaceholder={t('shops.searchCity')}
              icon="location-outline"
              options={cities ?? []}
              value={cityId}
              onChange={pickCity}
              loading={cities === null}
            />
            <Select
              label={t('shops.district')}
              placeholder={cityId === null ? t('shops.pickCityFirst') : t('shops.selectDistrict')}
              searchPlaceholder={t('shops.searchDistrict')}
              icon="navigate-outline"
              options={districts}
              value={districtId}
              onChange={setDistrictId}
              disabled={cityId === null}
              loading={districtsLoading}
            />
          </>
        )}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('shops.search')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('shops.search')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      </View>
    </View>
  );

  // Liste boşken gösterilecek durum: ilçe seçilmedi / yükleniyor / hata / boş.
  const emptyState = () => {
    if (districtId === null) {
      return <EmptyState icon="storefront-outline" title={t('shops.pickDistrict')} text={t('shops.pickDistrictHint')} />;
    }
    if (!current) return <ActivityIndicator size="large" color={colors.goldText} style={styles.spinner} />;
    if (current.error) {
      return (
        <View style={styles.listPad}>
          <ErrorText message={current.error} />
        </View>
      );
    }
    return <EmptyState icon="search-outline" title={t('shops.empty')} text={t('shops.emptyHint')} />;
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={current?.error ? [] : current?.list ?? []}
      keyExtractor={(s) => String(s.id)}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={emptyState}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('ShopStylists', { shopId: item.id, shopName: item.ad })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.listPad, pressed && styles.pressed]}
        >
          <Card style={styles.shop}>
            <View style={styles.shopIcon}>
              <Ionicons name="storefront" size={22} color={colors.gold} />
            </View>
            <View style={styles.shopBody}>
              <View style={styles.shopTitle}>
                <Txt variant="headline" style={styles.shopName} numberOfLines={2}>{item.ad}</Txt>
                {item.plan === 'GOLD' ? (
                  <View style={styles.planBadge}>
                    <Ionicons name="ribbon" size={12} color={colors.ink} />
                    <Txt variant="caption" style={styles.planText}>{item.planAd}</Txt>
                  </View>
                ) : null}
              </View>
              <Txt variant="subhead">{item.isletmeAd}</Txt>
              {item.adres ? <Txt variant="caption" numberOfLines={2}>{item.adres}</Txt> : null}
              <View style={styles.meta}>
                <Ionicons name="people-outline" size={14} color={colors.goldText} />
                <Txt variant="caption" style={styles.metaText}>{t('shops.stylistCount', { count: item.kuaforSayisi })}</Txt>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: spacing.lg },
  listPad: { paddingHorizontal: spacing.md },
  pressed: { opacity: 0.75 },
  hero: { minHeight: 200 },
  filters: {
    marginTop: -spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadows.raised,
  },
  citiesError: { marginBottom: spacing.ms },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.heading, paddingVertical: spacing.sm },
  spinner: { paddingVertical: spacing.xl },
  shop: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  shopBody: { flex: 1, gap: 2 },
  shopTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  shopName: { flex: 1 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.gold,
  },
  planText: { color: colors.ink, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  metaText: { color: colors.goldText, fontWeight: '500' },
});
