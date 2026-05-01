import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import i18n from '@/i18n';
import { AdProvider } from '@/ads/AdProvider';
import { colours, fonts, fontSizes } from '@/theme';
import { recordReviewAppOpen } from '@/review';

SplashScreen.preventAutoHideAsync();

const TabIcon = ({ symbol }: { symbol: string; color: string }) => (
  <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.lg }}>{symbol}</Text>
);

export { TabIcon };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    Manrope: Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    recordReviewAppOpen().catch(() => undefined);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  const headerStyle = { backgroundColor: colours.primary };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <AdProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="calculator" />
              <Stack.Screen
                name="saved/new"
                options={{
                  headerShown: true,
                  title: i18n.t('save.title'),
                  headerStyle,
                  headerTintColor: colours.white,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="saved/[id]"
                options={{
                  headerShown: true,
                  title: i18n.t('saved.loanDetail'),
                  headerStyle,
                  headerTintColor: colours.white,
                }}
              />
              <Stack.Screen
                name="saved/[id]/edit"
                options={{
                  headerShown: true,
                  title: i18n.t('saved.editLoan'),
                  headerStyle,
                  headerTintColor: colours.white,
                }}
              />
            </Stack>
          </AdProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
