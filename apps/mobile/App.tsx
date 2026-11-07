import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { loadSavedLanguage } from './src/i18n';
import { fonts } from './src/theme';

// Başlık fontu yüklenene kadar açılış ekranı kalır; yazılar sonradan zıplamaz.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.heading]: require('./assets/fonts/RobotoCondensed-Bold.ttf'),
  });
  // Font yüklenemezse uygulama sistem fontuyla açılır.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
