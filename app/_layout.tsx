import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Geist_400Regular, Geist_500Medium, useFonts } from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocationPermissionOnLaunch } from '@/hooks/use-location-permission-on-launch';
import { NotificationProvider } from '@/context/NotificationContext';
import { LegalAcceptanceProvider } from '@/context/LegalAcceptanceContext';
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
   shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
  });

  useLocationPermissionOnLaunch(fontsLoaded);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NotificationProvider>
      <LegalAcceptanceProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </LegalAcceptanceProvider>
    </NotificationProvider>
  );
}
