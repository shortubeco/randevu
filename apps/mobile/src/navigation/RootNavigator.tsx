import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../components/ui';
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
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type IconName = ComponentProps<typeof Ionicons>['name'];

// Sekme adı → [pasif ikon, aktif ikon]
const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Shops: ['business-outline', 'business'],
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
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused, color, size }) => {
          const [outline, filled] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Shops" component={ShopsScreen} options={{ title: t('tabs.shops') }} />
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
          // Okunmamış bildirim sayısı: simgenin üzerinde kırmızı rozet.
          tabBarBadge: unread > 0 ? unread : undefined,
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <UnreadProvider>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.text,
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
            <Stack.Screen name="Review" component={ReviewScreen} options={{ title: t('review.title') }} />
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
