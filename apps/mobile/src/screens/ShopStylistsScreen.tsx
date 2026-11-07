import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Stylist } from '../api/types';
import { Avatar, Button, Card, Centered, EmptyState, ErrorText, Loading, Stars, Txt } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// Seçilen dükkanın görünür kuaförleri. Kuaför seçilince kuaför detayına (hizmet seçimi) geçilir.
export function ShopStylistsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { shopId } = useRoute<RouteProp<RootStackParamList, 'ShopStylists'>>().params;
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStylists(await stylistsApi.byShop(shopId));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, t]);

  // Ekran odaklandığında yükle (kuaför detayından dönünce de güncel kalır).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <Loading />;

  if (error && stylists.length === 0) {
    return (
      <Centered>
        <ErrorText message={error} />
        <Button title={t('common.retry')} variant="secondary" onPress={load} />
      </Centered>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={stylists}
      keyExtractor={(s) => String(s.id)}
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
      ListEmptyComponent={<EmptyState icon="people-outline" title={t('stylists.empty')} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('StylistDetail', { stylistId: item.id })}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.card}>
            <Avatar ad={item.ad} soyad={item.soyad} photoUrl={item.photoUrl} />
            <View style={styles.body}>
              <Txt variant="headline">{item.ad} {item.soyad}</Txt>
              {item.ortalama !== null ? (
                <View style={styles.rating}>
                  <Stars value={item.ortalama} />
                  <Txt variant="caption">{t('stylists.rating', { avg: item.ortalama.toFixed(1), count: item.adet })}</Txt>
                </View>
              ) : null}
              {item.bio ? <Txt variant="subhead" numberOfLines={2}>{item.bio}</Txt> : null}
              <Txt variant="caption">{t('stylists.slotInfo', { minutes: item.slotDakika })}</Txt>
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
  content: { padding: spacing.md, flexGrow: 1 },
  pressed: { opacity: 0.75 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  body: { flex: 1, gap: spacing.xs },
  rating: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
});
