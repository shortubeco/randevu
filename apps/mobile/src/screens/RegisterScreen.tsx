import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, ErrorText, Field, colors } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen(_: Props) {
  const { t } = useTranslation();
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Field label={t('auth.ad')} value={form.ad} onChangeText={set('ad')} textContentType="givenName" autoCapitalize="words" />
        <Field label={t('auth.soyad')} value={form.soyad} onChangeText={set('soyad')} textContentType="familyName" autoCapitalize="words" />
        <Field label={t('auth.telefon')} value={form.telefon} onChangeText={set('telefon')} keyboardType="phone-pad" textContentType="telephoneNumber" />
        <Field label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" textContentType="emailAddress" />
        <Field label={t('auth.password')} value={form.password} onChangeText={set('password')} secureTextEntry textContentType="newPassword" />
        <Field label={t('auth.passwordAgain')} value={form.passwordAgain} onChangeText={set('passwordAgain')} secureTextEntry textContentType="newPassword" />
        <ErrorText message={error} />
        <Button title={t('auth.register')} onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
