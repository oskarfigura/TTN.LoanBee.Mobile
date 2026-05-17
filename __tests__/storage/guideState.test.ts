import { describe, it, expect, beforeEach } from '@jest/globals';
import { hasSeenGuide, markGuideSeen } from '../../src/onboarding/guideState';
import { storage } from '../../src/storage/mmkv';
import { STORAGE_KEYS } from '../../src/storage/keys';

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
