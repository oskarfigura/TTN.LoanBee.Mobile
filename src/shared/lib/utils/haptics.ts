import { Vibration } from 'react-native';

/**
 * Subtle tactile tick for confirming a discrete tap/toggle (e.g. pin to dashboard).
 *
 * Uses React Native's built-in Vibration API so there is no extra native
 * dependency or prebuild step. Kept behind this thin helper so the haptic style
 * is centralised and can later be swapped for expo-haptics without touching call
 * sites.
 */
export function tapFeedback(): void {
  Vibration.vibrate(10);
}
