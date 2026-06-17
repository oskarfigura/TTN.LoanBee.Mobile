import { beforeEach, describe, expect, it } from '@jest/globals';
import { hasSeenGuide, markGuideSeen } from '@/shared/lib/services/onboarding/guideState';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { storage } from '@/shared/lib/storage/mmkv';

beforeEach(() => {
  storage.clearAll();
});

describe('guideState', () => {
  it('reports the guide as unseen by default', () => {
    expect(hasSeenGuide()).toBe(false);
  });

  it('persists the seen flag under the versioned key', () => {
    markGuideSeen();

    expect(hasSeenGuide()).toBe(true);
    expect(storage.getString(STORAGE_KEYS.GUIDE_SEEN)).toBe('1');
  });

  it('treats any other stored value as unseen', () => {
    storage.set(STORAGE_KEYS.GUIDE_SEEN, 'nope');
    expect(hasSeenGuide()).toBe(false);
  });
});
