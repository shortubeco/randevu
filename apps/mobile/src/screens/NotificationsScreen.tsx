import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { AppNotification } from '../api/types';
import { Button, Card, Centered, ErrorText, colors } from '../components/ui';
import { istanbulDateOf, istanbulTime, formatDateKey } from '../lib/time';
import { useUnread } from '../notifications/unread';

const KNOWN_TYPES = ['ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'HATIRLATMA'];

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { markAllRead } = useUnread();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await notificationsApi.mine());
      setError(null);
      // Liste görüldü: rozet sıfırlanır.
      void markAllRead();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, markAllRead]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(n) => String(n.id)}
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
          <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('notifications.empty')}</Text>
        </Centered>
      }
      renderItem={({ item: n }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              {t(`notifications.types.${KNOWN_TYPES.includes(n.tip) ? n.tip : 'OTHER'}`)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {formatDateKey(istanbulDateOf(n.createdAt))} {istanbulTime(n.createdAt)}
            </Text>
          </View>
          <Text style={{ color: colors.text }}>{n.icerik}</Text>
        </Card>
      )}
    />
  );
}
