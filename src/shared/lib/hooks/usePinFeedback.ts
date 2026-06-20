import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { tapFeedback } from '@/shared/lib/utils/haptics';

/**
 * Drives the tactile/visual feedback for a toggle control whose `active` state
 * flips on tap (e.g. pin-to-dashboard). Returns a reanimated style that gives
 * the wrapped element a short shake + scale "pop" whenever `active` changes, and
 * fires a haptic tick alongside it.
 *
 * The animation deliberately reacts to the `active` transition rather than to
 * the press itself, so call sites only need to flip state — no imperative
 * trigger wiring. A first-run guard skips the initial mount (and list
 * re-renders that don't change `active`) so nothing shakes or buzzes on load.
 *
 * Respects the OS "Reduce Motion" accessibility setting: when it is on, the
 * shake/pop is suppressed for motion-sensitive users. The haptic tick still
 * fires (it is not visual motion) and the icon state change is unaffected, so
 * the toggle stays clearly confirmed without movement.
 */
export const usePinFeedback = (active: boolean) => {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFirstRun = useRef(true);
  const reduceMotion = useRef(false);

  useEffect(() => {
    // AccessibilityInfo is always present on iOS/Android; the guard keeps the
    // hook safe in environments where the native module is absent (e.g. tests),
    // where it simply leaves Reduce Motion off.
    if (!AccessibilityInfo?.isReduceMotionEnabled) return;

    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) reduceMotion.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        reduceMotion.current = enabled;
      },
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (!reduceMotion.current) {
      rotate.value = withSequence(
        withTiming(-8, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(-5, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
      scale.value = withSequence(
        withTiming(1.18, { duration: 90 }),
        withTiming(1, { duration: 120 }),
      );
    }

    tapFeedback();
  }, [active, rotate, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotate.value}deg` }, { scale: scale.value }],
  }));
};
