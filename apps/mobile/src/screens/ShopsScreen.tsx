import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { locationsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { City, Shop } from '../api/types';
import { Card, Centered, ErrorText, colors } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

interface ShopsResult {
  key: string;
  list: Shop[];
  error: string | null;
}

const sectionTitle = { fontSize: 15, fontWeight: '600' as const, color: colors.text, marginBottom: 8 };

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 8,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.card,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

// Müşteri akışının ilk adımı: şehir → ilçe → (isteğe bağlı hizmet araması) → dükkan.
export function ShopsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [cities, setCities] = useState<City[] | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [districts, setDistricts] = useState<City[]>([]);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [shopsResult, setShopsResult] = useState<ShopsResult | null>(null);

  useEffect(() => {
    locationsApi
      .cities()
      .then(setCities)
      .catch((e) => setCitiesError(e instanceof ApiError ? e.message : t('common.genericError')));
  }, [t]);

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
    setCityId(id);
    setDistrictId(null);
    setDistricts([]);
    locationsApi
      .districts(id)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }

  const header = (
    <View style={{ marginBottom: 12 }}>
      <Text style={sectionTitle}>{t('shops.city')}</Text>
      {citiesError ? (
        <ErrorText message={citiesError} />
      ) : cities === null ? (
        <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {cities.map((c) => (
            <Chip key={c.id} label={c.ad} active={c.id === cityId} onPress={() => pickCity(c.id)} />
          ))}
        </ScrollView>
      )}

      {cityId !== null && (
        <>
          <Text style={sectionTitle}>{t('shops.district')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {districts.map((d) => (
              <Chip key={d.id} label={d.ad} active={d.id === districtId} onPress={() => setDistrictId(d.id)} />
            ))}
          </ScrollView>
        </>
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('shops.search')}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: colors.card,
          color: colors.text,
        }}
      />
    </View>
  );

  // Liste boşken gösterilecek durum: ilçe seçilmedi / yükleniyor / hata / boş.
  const emptyState = () => {
    if (districtId === null) return <Centered><Text style={{ color: colors.muted }}>{t('shops.pickDistrict')}</Text></Centered>;
    if (!current) return <Centered><ActivityIndicator color={colors.primary} /></Centered>;
    if (current.error) return <Centered><ErrorText message={current.error} /></Centered>;
    return <Centered><Text style={{ color: colors.muted }}>{t('shops.empty')}</Text></Centered>;
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={current?.error ? [] : current?.list ?? []}
      keyExtractor={(s) => String(s.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyState}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('ShopStylists', { shopId: item.id, shopName: item.ad })}>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{item.ad}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{item.isletmeAd}</Text>
            <Text style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
              {t('shops.stylistCount', { count: item.kuaforSayisi })}
            </Text>
            {item.adres ? <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>{item.adres}</Text> : null}
          </Card>
        </Pressable>
      )}
    />
  );
}
