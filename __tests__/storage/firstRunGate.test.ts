import { afterEach, describe, expect, it, jest } from '@jest/globals';

afterEach(() => {
  jest.useRealTimers();
  jest.resetModules();
});

describe('firstRunGate', () => {
  it('falls back to the timeout when consent never completes', async () => {
    jest.useFakeTimers();
    const { whenConsentFlowComplete } = await import('@/shared/lib/services/onboarding/firstRunGate');
    const pending = whenConsentFlowComplete(6000);
    jest.advanceTimersByTime(6000);
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves once the consent flow is marked complete', async () => {
    jest.useFakeTimers();
    const { markConsentFlowComplete, whenConsentFlowComplete } = await import('@/shared/lib/services/onboarding/firstRunGate');
    const pending = whenConsentFlowComplete(10000);
    markConsentFlowComplete();
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves immediately once already settled', async () => {
    const { markConsentFlowComplete, whenConsentFlowComplete } = await import('@/shared/lib/services/onboarding/firstRunGate');
    markConsentFlowComplete();
    await expect(whenConsentFlowComplete(10000)).resolves.toBeUndefined();
  });
});
