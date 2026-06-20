import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@oskarfigura/ui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import i18n from '@/shared/lib/i18n';
import { AdProvider } from '@/ads/AdProvider';
import { fontFaces, fontSizes } from '@/shared/ui/theme';
import { loanBeeNativeTheme } from '@/shared/ui/theme/uiNativeTheme';
import { recordReviewAppOpen } from '@/shared/lib/services/review';
import { installGlobalCrashHandler } from '@/shared/lib/services/diagnostics/crashLog';

// Install as early as possible so uncaught JS errors during startup are captured.
installGlobalCrashHandler();

// Expo Router wraps this root route in a React error boundary when a component
// named `ErrorBoundary` is exported here, catching render errors anywhere in the
// app and showing a recovery screen instead of a blank white screen.
export { ErrorBoundary } from '@/shared/ui/components/RootErrorBoundary';

SplashScreen.preventAutoHideAsync();

const TabIcon = ({ symbol }: { symbol: string; color: string }) => (
  <Text style={[fontFaces.body.regular, { fontSize: fontSizes.lg }]}>{symbol}</Text>
);

export { TabIcon };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    recordReviewAppOpen().catch(() => undefined);
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider theme={loanBeeNativeTheme}>
            <I18nextProvider i18n={i18n}>
              <AdProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="about" />
                  <Stack.Screen name="contact" />
                  <Stack.Screen name="guide" />
                  <Stack.Screen
                    name="saved/new"
                    options={{
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen name="saved/[id]" />
                  <Stack.Screen name="saved/recent" />
                  <Stack.Screen
                    name="saved/track"
                    options={{
                      // Full-screen rather than a draggable sheet: the track form is
                      // long, and a partial-height modal cramps it and risks accidental
                      // swipe-to-dismiss mid-entry. The form keeps its own close (X).
                      presentation: 'fullScreenModal',
                    }}
                  />
                  <Stack.Screen name="saved/[id]/edit" />
                  <Stack.Screen name="saved/[id]/overpayments/index" />
                  <Stack.Screen
                    name="saved/[id]/deals/new"
                    options={{
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen name="saved/[id]/deals/[dealId]" />
                  <Stack.Screen
                    name="saved/[id]/events/new"
                    options={{
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen name="saved/[id]/events/[eventId]" />
                  <Stack.Screen
                    name="saved/[id]/complete-current"
                    options={{
                      presentation: 'modal',
                    }}
                  />
                </Stack>
              </AdProvider>
            </I18nextProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
