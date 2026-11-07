import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { reviewsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { Button, Card, ErrorText, Field, Txt } from '../components/ui';
import { colors, radius, spacing } from '../theme';
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Txt variant="heading" style={styles.service}>{hizmet}</Txt>
          <Txt variant="subhead" style={styles.stylist}>{kuaforAd}</Txt>
        </View>

        <Card>
          <Txt variant="headline" style={styles.center}>{t('review.ratingLabel')}</Txt>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setPuan(n)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityState={{ selected: n === puan }}
                accessibilityLabel={t('review.stars', { count: n })}
              >
                <Ionicons
                  name={n <= puan ? 'star' : 'star-outline'}
                  size={42}
                  color={n <= puan ? colors.gold : colors.border}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        <Field
          label={t('review.commentLabel')}
          value={yorum}
          onChangeText={setYorum}
          multiline
          maxLength={500}
          placeholder={t('review.commentPlaceholder')}
          autoCapitalize="sentences"
          style={styles.comment}
        />

        <ErrorText message={error} />
        <Button title={t('review.submit')} onPress={submit} disabled={puan === 0} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  summary: {
    padding: spacing.md,
    marginBottom: spacing.ms,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  service: { color: colors.onDark },
  stylist: { color: colors.onDarkMuted, marginTop: 2 },
  center: { textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.ms },
  comment: { minHeight: 110, textAlignVertical: 'top' },
});
