import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { AppNotification } from '../api/types';
import { Button, Centered, EmptyState, ErrorText, Loading, Txt, type IconName } from '../components/ui';
import { istanbulDateOf, istanbulTime, formatDateKey } from '../lib/time';
import { useUnread } from '../notifications/unread';
import { colors, spacing } from '../theme';

const KNOWN_TYPES = ['ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'HATIRLATMA'];

const TYPE_ICONS: Record<string, IconName> = {
  ONAYLANDI: 'checkmark-circle',
  IPTAL: 'close-circle',
  TAMAMLANDI: 'ribbon',
  HATIRLATMA: 'alarm',
};

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
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(n) => String(n.id)}
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
      ListEmptyComponent={<EmptyState icon="notifications-outline" title={t('notifications.empty')} />}
      renderItem={({ item: n }) => (
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={TYPE_ICONS[n.tip] ?? 'notifications'} size={20} color={colors.gold} />
          </View>
          <View style={styles.body}>
            <Txt variant="headline">{t(`notifications.types.${KNOWN_TYPES.includes(n.tip) ? n.tip : 'OTHER'}`)}</Txt>
            <Txt variant="body">{n.icerik}</Txt>
            <Txt variant="caption">{formatDateKey(istanbulDateOf(n.createdAt))} {istanbulTime(n.createdAt)}</Txt>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: spacing.ms,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  body: { flex: 1, gap: 2 },
});
