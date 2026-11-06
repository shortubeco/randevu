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
  StylistDetail: { stylistId: number };
  Booking: BookingParams;
};

export type TabParamList = {
  Stylists: undefined;
  Appointments: undefined;
  Profile: undefined;
};
