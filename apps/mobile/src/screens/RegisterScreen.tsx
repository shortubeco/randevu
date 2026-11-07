import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, Card, ErrorText, Field, PhotoHeader } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const PHOTO = require('../../assets/images/hero-haircut-9992819.jpg');

export function RegisterScreen(_: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({ ad: '', soyad: '', telefon: '', email: '', password: '', passwordAgain: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    const { ad, soyad, telefon, email, password, passwordAgain } = form;
    if (!ad.trim() || !soyad.trim() || !telefon.trim() || !email.trim() || !password) {
      return setError(t('auth.fillAll'));
    }
    if (password.length < 8) return setError(t('auth.passwordShort'));
    if (password !== passwordAgain) return setError(t('auth.passwordMismatch'));
    const phone = telefon.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(phone)) return setError(t('auth.phoneInvalid'));

    setError(null);
    setBusy(true);
    try {
      await register({ ad: ad.trim(), soyad: soyad.trim(), telefon: phone, email: email.trim(), password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <PhotoHeader source={PHOTO} eyebrow={t('auth.registerEyebrow')} title={t('auth.registerTitle')} style={styles.header} />
        <View style={styles.body}>
          <Card style={styles.form}>
            <Field label={t('auth.ad')} icon="person-outline" value={form.ad} onChangeText={set('ad')} textContentType="givenName" autoComplete="given-name" autoCapitalize="words" />
            <Field label={t('auth.soyad')} icon="person-outline" value={form.soyad} onChangeText={set('soyad')} textContentType="familyName" autoComplete="family-name" autoCapitalize="words" />
            <Field label={t('auth.telefon')} icon="call-outline" value={form.telefon} onChangeText={set('telefon')} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" />
            <Field label={t('auth.email')} icon="mail-outline" value={form.email} onChangeText={set('email')} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
            <Field label={t('auth.password')} icon="lock-closed-outline" value={form.password} onChangeText={set('password')} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
            <Field label={t('auth.passwordAgain')} icon="lock-closed-outline" value={form.passwordAgain} onChangeText={set('passwordAgain')} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
            <ErrorText message={error} />
            <Button title={t('auth.register')} onPress={submit} loading={busy} />
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: { height: 170 },
  body: { paddingHorizontal: spacing.md, marginTop: -spacing.md },
  form: { padding: spacing.ml },
});
