import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Button, ErrorText, Field, colors } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
      setError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary, marginBottom: 32, textAlign: 'center' }}>
          Randevu
        </Text>
        <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" />
        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
        <ErrorText message={error} />
        <Button title={t('auth.login')} onPress={submit} loading={busy} />
        <View style={{ marginTop: 16 }}>
          <Button title={t('auth.noAccount')} variant="secondary" onPress={() => navigation.navigate('Register')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
