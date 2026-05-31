import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';

// Lightweight, dependency-free crash capture. The app deliberately ships NO
// third-party logging SDK, so this only persists the most recent fatal error
// locally (MMKV) for on-device inspection during QA/testing. Native crashes are
// covered for free by Play Console (Android vitals) and Xcode Organizer (iOS),
// which need no SDK — this fills the JS-error gap between those.

export type CrashContext = 'global' | 'render';

export interface CapturedCrash {
  message: string;
  stack?: string;
  context: CrashContext;
  fatal: boolean;
  timestamp: string;
}

const serialiseError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown error' };
  }
};

export const recordCrash = (
  error: unknown,
  context: CrashContext,
  fatal = true,
): void => {
  try {
    const { message, stack } = serialiseError(error);
    const entry: CapturedCrash = {
      message,
      stack,
      context,
      fatal,
      timestamp: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.LAST_CRASH, JSON.stringify(entry));
  } catch {
    // Crash logging must never itself throw.
  }
};

export const getLastCrash = (): CapturedCrash | null => {
  try {
    const raw = storage.getString(STORAGE_KEYS.LAST_CRASH);
    if (!raw) return null;
    return JSON.parse(raw) as CapturedCrash;
  } catch {
    return null;
  }
};

export const clearLastCrash = (): void => {
  try {
    storage.remove(STORAGE_KEYS.LAST_CRASH);
  } catch {
    // ignore
  }
};

interface ReactNativeErrorUtils {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

let installed = false;

// Chains onto React Native's global error handler so uncaught JS errors are
// recorded before the default handler (red box in dev / crash in production)
// runs. Idempotent and safe to call once at app startup.
export const installGlobalCrashHandler = (): void => {
  if (installed) return;
  installed = true;

  const errorUtils = (globalThis as typeof globalThis & {
    ErrorUtils?: ReactNativeErrorUtils;
  }).ErrorUtils;

  if (!errorUtils?.setGlobalHandler) return;

  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    recordCrash(error, 'global', Boolean(isFatal));
    previousHandler?.(error, isFatal);
  });
};
