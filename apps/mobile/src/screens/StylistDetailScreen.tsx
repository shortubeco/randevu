import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { stylistsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Stylist, StylistService } from '../api/types';
import { Card, Centered, ErrorText, colors } from '../components/ui';
import { formatPrice } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StylistDetail'>;

export function StylistDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { stylistId } = route.params;
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [services, setServices] = useState<StylistService[]>([]);
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
