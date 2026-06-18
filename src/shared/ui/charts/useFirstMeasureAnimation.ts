import { useEffect, useRef } from 'react';

/**
 * Charts remount (via a width-based `key`) whenever the measured container width changes
 * so gifted-charts recomputes its path/bar geometry from the new `width`. That remount also
 * replays the entrance animation, which is wanted on the first real measurement but jarring
 * on later width changes (device rotation, the landscape-capable fullscreen modal).
 *
 * This returns true only for the first render at a non-zero width, so callers pass it as
 * `isAnimated`: the chart animates in once, then snaps silently to the new geometry on any
 * subsequent remount.
 */
export const useFirstMeasureAnimation = (containerWidth: number): boolean => {
  const hasAnimatedRef = useRef(false);
  const shouldAnimate = containerWidth > 0 && !hasAnimatedRef.current;

  useEffect(() => {
    if (containerWidth > 0) hasAnimatedRef.current = true;
  }, [containerWidth]);

  return shouldAnimate;
};
