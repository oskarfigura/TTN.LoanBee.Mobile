import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import i18n from '@/shared/lib/i18n';
import { colours, spacing } from '@/shared/ui/theme';
import { recordCrash } from '@/shared/lib/services/diagnostics/crashLog';
import { AppText, Button } from '@oskarfigura/ui-native';

// Expo Router renders this *above* RootLayout, so it mounts WITHOUT the app's
// providers (SafeAreaProvider, I18nextProvider, GestureHandlerRootView). Keep it
// provider-independent: plain View (no safe-area context), the i18n singleton
// directly (not the react-i18next hook), and defaultValue fallbacks so a missing
// translation can never make the recovery screen itself throw.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Persist the render error for on-device inspection (no third-party logging).
  React.useEffect(() => {
    recordCrash(error, 'render');
  }, [error]);

  return (
    <View style={styles.container}>
      <AppText variant="title1" style={styles.title}>
        {i18n.t('errorBoundary.title', { defaultValue: 'Something went wrong' })}
      </AppText>
      <AppText variant="bodyLg" tone="muted" style={styles.message}>
        {i18n.t('errorBoundary.message', {
          defaultValue:
            'The app ran into an unexpected error. Tap below to try again — your saved loans are safe.',
        })}
      </AppText>
      <Button
        label={i18n.t('errorBoundary.retry', { defaultValue: 'Try again' })}
        onPress={() => {
          void retry();
        }}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  button: {
    alignSelf: 'stretch',
  },
});
