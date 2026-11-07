import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import type { IconName } from '../components/ui';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ShopsScreen } from '../screens/ShopsScreen';
import { ShopStylistsScreen } from '../screens/ShopStylistsScreen';
import { StylistDetailScreen } from '../screens/StylistDetailScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { UnreadProvider, useUnread } from '../notifications/unread';
import { ReviewScreen } from '../screens/ReviewScreen';
import { colors, fonts } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Ekran geçişlerinde beyaz parlama olmasın diye gezinme zemini uygulamayla aynı.
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.ink,
    text: colors.onDark,
    border: colors.ink,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: colors.ink },
  headerTintColor: colors.onDark,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20 },
  headerShadowVisible: false,
};

// Sekme adı → [pasif ikon, aktif ikon]
const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Shops: ['storefront-outline', 'storefront'],
  Appointments: ['calendar-outline', 'calendar'],
  Notifications: ['notifications-outline', 'notifications'],
  Profile: ['person-outline', 'person'],
};

function MainTabs() {
  const { t } = useTranslation();
  const { unread } = useUnread();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerStyle,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.onDarkMuted,
        tabBarStyle: { backgroundColor: colors.ink, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          const [outline, filled] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      {/* Dükkanlar ekranı kendi fotoğraflı başlığını durum çubuğuna kadar uzatır. */}
      <Tab.Screen name="Shops" component={ShopsScreen} options={{ title: t('tabs.shops'), headerShown: false }} />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ title: t('tabs.appointments') }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t('tabs.notifications'),
          // Okunmamış bildirim sayısı: simgenin üzerinde altın rozet.
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.ink },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('tabs.profile') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <UnreadProvider>
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          ...headerStyle,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {signedIn ? (
          <>
            <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="ShopStylists"
              component={ShopStylistsScreen}
              options={({ route }) => ({ title: route.params.shopName })}
            />
            <Stack.Screen name="StylistDetail" component={StylistDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Booking" component={BookingScreen} options={{ title: t('booking.title') }} />
            <Stack.Screen name="Review" component={ReviewScreen} options={{ title: t('review.rateTitle') }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.register') }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </UnreadProvider>
  );
}
