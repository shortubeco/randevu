import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { reviewsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { Button, Card, ErrorText, colors } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

export function ReviewScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { appointmentId, kuaforAd, hizmet } = route.params;
  const [puan, setPuan] = useState(0);
  const [yorum, setYorum] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (puan === 0) return setError(t('review.pickStars'));
    setError(null);
    setBusy(true);
    try {
      await reviewsApi.create(appointmentId, puan, yorum);
      Alert.alert(t('review.thanksTitle'), t('review.thanksMessage'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{hizmet}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{kuaforAd}</Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
            {t('review.ratingLabel')}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setPuan(n)} accessibilityLabel={t('review.stars', { count: n })}>
                <Ionicons
                  name={n <= puan ? 'star' : 'star-outline'}
                  size={40}
                  color={n <= puan ? '#F59E0B' : colors.muted}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
            {t('review.commentLabel')}
          </Text>
          <TextInput
            value={yorum}
            onChangeText={setYorum}
            multiline
            maxLength={500}
            placeholder={t('review.commentPlaceholder')}
            placeholderTextColor={colors.muted}
            style={{ minHeight: 90, textAlignVertical: 'top', fontSize: 16, color: colors.text }}
          />
        </Card>

        <ErrorText message={error} />
        <Button title={t('review.submit')} onPress={submit} disabled={puan === 0} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
