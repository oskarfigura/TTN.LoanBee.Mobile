import { Platform, Vibration } from 'react-native';

/**
 * Light tactile tick for confirming a discrete tap/toggle (e.g. pin to dashboard).
 *
 * Uses React Native's built-in Vibration API so there is no extra native
 * dependency or prebuild step. Android honours the short duration and produces a
 * brief tick; iOS ignores the duration and would fire a full ~0.4s buzz, which
 * is far too heavy for a small toggle, so the haptic is gated to Android. To get
 * a genuinely light iOS haptic later, swap this helper for expo-haptics
 * (`selectionAsync` / `impactAsync(Light)`) — call sites stay unchanged.
 */
export function tapFeedback(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(10);
  }
}
