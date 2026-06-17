import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';

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
    // If persistence fails the guide simply shows again on the next launch.
  }
}
