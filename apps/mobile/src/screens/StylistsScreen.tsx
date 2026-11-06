import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Stylist } from '../api/types';
import { Button, Card, Centered, ErrorText, colors } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export function StylistsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStylists(await stylistsApi.list());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Ekran odaklandığında yükle (kuaför detayından dönünce de güncel kalır).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return <Centered>{null}</Centered>;
  }

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
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={stylists}
      keyExtractor={(s) => String(s.id)}
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
          <Text style={{ color: colors.muted }}>{t('stylists.empty')}</Text>
        </Centered>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('StylistDetail', { stylistId: item.id })}>
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
              {item.ad} {item.soyad}
            </Text>
            {item.bio ? <Text style={{ color: colors.muted, marginTop: 6 }}>{item.bio}</Text> : null}
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>
              {t('stylists.slotInfo', { minutes: item.slotDakika })}
            </Text>
          </Card>
        </Pressable>
      )}
    />
  );
}
