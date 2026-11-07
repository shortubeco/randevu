import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Button, Card, ErrorText, Field, SectionTitle, Txt } from '../components/ui';
import { setLanguage, type Lang } from '../i18n';
import { colors, radius, spacing } from '../theme';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];

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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.profile}>
          <Avatar ad={user?.ad ?? ''} soyad={user?.soyad ?? ''} size={72} onDark />
          <View style={styles.profileText}>
            <Txt variant="title" style={styles.name}>{user?.ad} {user?.soyad}</Txt>
            <Txt variant="subhead" style={styles.email} numberOfLines={1}>{user?.email}</Txt>
          </View>
        </View>

        <View style={styles.body}>
          <SectionTitle title={t('profile.info')} />
          <Card style={styles.card}>
            <Field label={t('auth.ad')} icon="person-outline" value={ad} onChangeText={setAd} autoCapitalize="words" />
            <Field label={t('auth.soyad')} icon="person-outline" value={soyad} onChangeText={setSoyad} autoCapitalize="words" />
            <Field label={t('auth.telefon')} icon="call-outline" value={telefon} onChangeText={setTelefon} keyboardType="phone-pad" />
            <ErrorText message={infoError} />
            {infoOk ? (
              <View style={styles.ok}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Txt variant="subhead" style={styles.okText}>{infoOk}</Txt>
              </View>
            ) : null}
            <Button title={t('common.save')} onPress={saveInfo} loading={infoBusy} />
          </Card>

          <SectionTitle title={t('profile.changePassword')} />
          <Card style={styles.card}>
            <Field label={t('profile.currentPassword')} icon="lock-closed-outline" value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
            <Field label={t('profile.newPassword')} icon="lock-closed-outline" value={newPw} onChangeText={setNewPw} secureTextEntry />
            <ErrorText message={pwError} />
            <Button
              title={t('profile.changePassword')}
              variant="secondary"
              onPress={changePassword}
              loading={pwBusy}
              disabled={!currentPw || !newPw}
            />
          </Card>

          <SectionTitle title={t('profile.language')} />
          <View style={styles.segment} accessibilityRole="radiogroup">
            {LANGS.map(({ code, label }) => {
              const active = lang === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLanguage(code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title={t('profile.logout')} variant="danger" icon="log-out-outline" onPress={confirmLogout} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.lg },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.ink,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  profileText: { flex: 1 },
  name: { color: colors.onDark },
  email: { color: colors.onDarkMuted },
  body: { padding: spacing.md },
  card: { marginBottom: spacing.lg },
  ok: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.ms },
  okText: { color: colors.success },
  segment: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.full,
  },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: radius.full },
  segmentActive: { backgroundColor: colors.gold },
  segmentText: { fontSize: 15, lineHeight: 20, fontWeight: '500', color: colors.text },
  segmentTextActive: { color: colors.ink, fontWeight: '600' },
});
