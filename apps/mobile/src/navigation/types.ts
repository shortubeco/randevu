import type { NavigatorScreenParams } from '@react-navigation/native';

export interface BookingParams {
  stylistId: number;
  stylistName: string;
  serviceId: number;
  serviceName: string;
  sureDk?: number;
  fiyat?: number;
  // Dolu ise randevu değiştirme modudur.
  appointmentId?: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ShopStylists: { shopId: number; shopName: string };
  StylistDetail: { stylistId: number };
  Booking: BookingParams;
  Review: { appointmentId: number; kuaforAd: string; hizmet: string };
};

export type TabParamList = {
  Shops: undefined;
  Appointments: undefined;
  Notifications: undefined;
  Profile: undefined;
};
