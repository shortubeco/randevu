import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, Card, ErrorText, Field, PhotoLayer, Txt } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const PHOTO = require('../../assets/images/login-barber-3998407.jpg');

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError(t('auth.fillAll'));
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setError(t('auth.customerOnly'));
      else setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <PhotoLayer source={PHOTO} strong />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Ionicons name="cut" size={24} color={colors.gold} />
            <Txt variant="heading" style={styles.brandName}>{t('app.name')}</Txt>
          </View>

          <View style={styles.intro}>
            <Txt variant="eyebrow" style={styles.eyebrow}>{t('auth.loginEyebrow')}</Txt>
            <Txt variant="display" style={styles.title}>{t('auth.loginTitle')}</Txt>
          </View>

          <Card style={styles.form}>
            <Field
              label={t('auth.email')}
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <Field
              label={t('auth.password')}
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
            />
            <ErrorText message={error} />
            <Button title={t('auth.login')} onPress={submit} loading={busy} />
            <Button
              title={t('auth.noAccount')}
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('Register')}
              style={styles.link}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: colors.ink },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.ml },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: { color: colors.onDark },
  intro: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.xl, paddingBottom: spacing.lg },
  eyebrow: { color: colors.gold },
  title: { color: colors.onDark, marginTop: spacing.xs },
  form: { marginBottom: 0, padding: spacing.ml },
  link: { marginTop: spacing.sm },
});
