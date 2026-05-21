import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  markConsentFlowComplete,
  whenConsentFlowComplete,
} from '../../src/onboarding/firstRunGate';

afterEach(() => {
  jest.useRealTimers();
});

describe('firstRunGate', () => {
  it('falls back to the timeout when consent never completes', async () => {
    jest.useFakeTimers();
    const pending = whenConsentFlowComplete(6000);
    jest.advanceTimersByTime(6000);
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves once the consent flow is marked complete', async () => {
    const pending = whenConsentFlowComplete(10000);
    markConsentFlowComplete();
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves immediately once already settled', async () => {
    markConsentFlowComplete();
    await expect(whenConsentFlowComplete(10000)).resolves.toBeUndefined();
  });
});
