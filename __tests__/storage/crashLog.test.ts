import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  clearLastCrash,
  getLastCrash,
  installGlobalCrashHandler,
  recordCrash,
} from '@/shared/lib/services/diagnostics/crashLog';
import { storage } from '@/shared/lib/storage/mmkv';

beforeEach(() => {
  (storage as unknown as { clearAll: () => void }).clearAll();
});

describe('recordCrash / getLastCrash', () => {
  it('returns null when nothing has been recorded', () => {
    expect(getLastCrash()).toBeNull();
  });

  it('captures an Error with its message and stack', () => {
    recordCrash(new Error('boom'), 'render');
    const crash = getLastCrash();
    expect(crash?.message).toBe('boom');
    expect(crash?.context).toBe('render');
    expect(crash?.fatal).toBe(true);
    expect(typeof crash?.stack).toBe('string');
    expect(crash?.timestamp).toEqual(expect.any(String));
  });

  it('captures a non-Error value as a message', () => {
    recordCrash('string failure', 'global', false);
    const crash = getLastCrash();
    expect(crash?.message).toBe('string failure');
    expect(crash?.fatal).toBe(false);
  });

  it('keeps only the most recent crash', () => {
    recordCrash(new Error('first'), 'global');
    recordCrash(new Error('second'), 'global');
    expect(getLastCrash()?.message).toBe('second');
  });

  it('clearLastCrash removes the stored crash', () => {
    recordCrash(new Error('boom'), 'global');
    clearLastCrash();
    expect(getLastCrash()).toBeNull();
  });
});

describe('installGlobalCrashHandler', () => {
  it('chains onto ErrorUtils, records the error, and calls the previous handler', () => {
    const calls: Array<{ error: unknown; isFatal?: boolean }> = [];
    let registered: ((error: unknown, isFatal?: boolean) => void) | undefined;
    const previous = (error: unknown, isFatal?: boolean) => calls.push({ error, isFatal });

    (globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
      getGlobalHandler: () => previous,
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => {
        registered = handler;
      },
    };

    installGlobalCrashHandler();
    expect(registered).toBeDefined();

    const error = new Error('handled');
    registered?.(error, true);

    expect(getLastCrash()?.message).toBe('handled');
    expect(calls).toHaveLength(1);
    expect(calls[0].isFatal).toBe(true);
  });
});
