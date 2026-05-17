import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  markConsentFlowComplete,
  whenConsentFlowComplete,
} from '../../src/onboarding/firstRunGate';

// The gate is a module-level singleton, so these tests run in a deliberate
// order: the timeout path does not flip `settled`, so it is safe to exercise
// before the completion path.

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
    markConsentFlowComplete(); // idempotent
    await expect(whenConsentFlowComplete(10000)).resolves.toBeUndefined();
  });
});
