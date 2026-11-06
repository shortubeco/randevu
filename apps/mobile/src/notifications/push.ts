import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { devicesApi } from '../api/endpoints';

const TOKEN_KEY = 'pushToken';

// Uygulama açıkken gelen bildirimleri de banner olarak göster.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Expo push token'ını alır. Fiziksel cihaz, bildirim izni ve EAS projectId gerekir.
// Expo Go uzak push desteklemez; bu durumda null döner ve uygulama sessizce devam eder.
async function getPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

// Giriş sonrası çağrılır: token'ı alır ve sunucuya kaydeder.
export async function registerPush(): Promise<void> {
  const token = await getPushToken();
  if (!token) return;
  try {
    await devicesApi.register(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* kayıt başarısızsa bir sonraki girişte tekrar denenir */
  }
}

// Çıkıştan önce çağrılır: sunucudaki cihaz kaydını siler (oturum hâlâ geçerliyken).
export async function unregisterPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await devicesApi.unregister(token).catch(() => undefined);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* yoksay */
  }
}
