import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * Tracks whether the first-launch "How it works" guide has been shown.
 * Stored as a string flag to stay consistent with the rest of the MMKV
 * usage (the test mock only models string values). The key is versioned
 * (`guide_seen_v1`) — bump the suffix to re-surface the guide if its
 * contents change substantially in a future release.
 */
export function hasSeenGuide(): boolean {
  try {
    return storage.getString(STORAGE_KEYS.GUIDE_SEEN) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen(): void {
  try {
    storage.set(STORAGE_KEYS.GUIDE_SEEN, '1');
  } catch {
    // Best-effort: if persistence fails the guide simply shows again next launch.
  }
}
