import { afterEach, describe, expect, it, jest } from '@jest/globals';

afterEach(() => {
  jest.resetModules();
});

describe('onboardingGate', () => {
  it('stays pending until onboarding is dismissed (no timeout fallback)', async () => {
    const { whenOnboardingDismissed, markOnboardingDismissed } = await import('@/shared/lib/services/onboarding/onboardingGate');

    let resolved = false;
    const pending = whenOnboardingDismissed().then(() => {
      resolved = true;
    });

    // A real-timer tick: the gate must NOT resolve on its own.
    await new Promise((r) => setTimeout(r, 20));
    expect(resolved).toBe(false);

    markOnboardingDismissed();
    await expect(pending).resolves.toBeUndefined();
    expect(resolved).toBe(true);
  });

  it('resolves immediately once already settled', async () => {
    const { markOnboardingDismissed, whenOnboardingDismissed } = await import('@/shared/lib/services/onboarding/onboardingGate');
    markOnboardingDismissed();
    await expect(whenOnboardingDismissed()).resolves.toBeUndefined();
  });
});
