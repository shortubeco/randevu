import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, ErrorText, Field, colors } from '../components/ui';
import { setLanguage, type Lang } from '../i18n';

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, setUser, logout } = useAuth();

  const [ad, setAd] = useState(user?.ad ?? '');
  const [soyad, setSoyad] = useState(user?.soyad ?? '');
  const [telefon, setTelefon] = useState(user?.telefon ?? '');
  const [infoBusy, setInfoBusy] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoOk, setInfoOk] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function saveInfo() {
    setInfoError(null);
    setInfoOk(null);
    setInfoBusy(true);
    try {
      const updated = await authApi.updateProfile({
        ad: ad.trim(),
        soyad: soyad.trim(),
        telefon: telefon.replace(/[\s()-]/g, ''),
      });
      setUser(updated);
      setInfoOk(t('profile.saved'));
    } catch (e) {
      setInfoError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setInfoBusy(false);
    }
  }

  async function changePassword() {
    setPwError(null);
    if (newPw.length < 8) return setPwError(t('auth.passwordShort'));
    setPwBusy(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      // Sunucu tüm refresh token'ları iptal eder; bu cihaz da çıkış yapmış olur.
      setPwBusy(false);
      Alert.alert(t('profile.changePassword'), t('profile.passwordChanged'), [
        { text: t('common.ok'), onPress: () => logout() },
      ]);
      return;
    } catch (e) {
      setPwError(e instanceof ApiError ? e.message : t('common.genericError'));
    } finally {
      setPwBusy(false);
    }
  }

  function confirmLogout() {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }

  const lang = (i18n.language === 'en' ? 'en' : 'tr') as Lang;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Card>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{t('profile.info')}</Text>
        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600', marginBottom: 2 }}>
          {user?.ad} {user?.soyad}
        </Text>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>{user?.email}</Text>
        <Field label={t('auth.ad')} value={ad} onChangeText={setAd} autoCapitalize="words" />
        <Field label={t('auth.soyad')} value={soyad} onChangeText={setSoyad} autoCapitalize="words" />
        <Field label={t('auth.telefon')} value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" />
        <ErrorText message={infoError} />
        {infoOk ? <Text style={{ color: colors.primary, marginBottom: 8 }}>{infoOk}</Text> : null}
        <Button title={t('common.save')} onPress={saveInfo} loading={infoBusy} />
      </Card>

      <Card>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{t('profile.changePassword')}</Text>
        <Field label={t('profile.currentPassword')} value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
        <Field label={t('profile.newPassword')} value={newPw} onChangeText={setNewPw} secureTextEntry />
        <ErrorText message={pwError} />
        <Button
          title={t('profile.changePassword')}
          variant="secondary"
          onPress={changePassword}
          loading={pwBusy}
          disabled={!currentPw || !newPw}
        />
      </Card>

      <Card>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{t('profile.language')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['tr', 'en'] as const).map((code) => (
            <View key={code} style={{ flex: 1 }}>
              <Button
                title={code.toUpperCase()}
                variant={lang === code ? 'primary' : 'secondary'}
                onPress={() => setLanguage(code)}
              />
            </View>
          ))}
        </View>
      </Card>

      <Button title={t('profile.logout')} variant="danger" onPress={confirmLogout} />
    </ScrollView>
  );
}
