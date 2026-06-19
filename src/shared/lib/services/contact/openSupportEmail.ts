import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '@/shared/lib/i18n';
import {
  buildSupportMailtoUrl,
  ContactMeta,
  SUPPORT_EMAIL,
  SupportEmailContent,
} from '@/shared/lib/services/contact/contactSupport';

/** Gather the diagnostics metadata for the current runtime. */
function currentContactMeta(): ContactMeta {
  return {
    version: Constants.expoConfig?.version ?? '1.0.0',
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    language: i18n.language ?? 'en',
  };
}

export interface OpenSupportEmailOptions extends SupportEmailContent {
  /** Title for the fallback alert shown when no mail app can be opened. */
  fallbackTitle: string;
  /** Message for the fallback alert; the support address is appended to it. */
  fallbackMessage: string;
}

/**
 * Open the device mail composer for the given content.
 *
 * We intentionally do NOT call `Linking.canOpenURL` first: on Android 11+ it
 * returns a false negative for `mailto:` unless a `<queries>` intent is
 * declared, which would silently disable contact. Instead we attempt
 * `openURL` and fall back to an alert showing the address if it throws.
 */
export async function openSupportEmail(opts: OpenSupportEmailOptions): Promise<void> {
  const url = buildSupportMailtoUrl(
    { subject: opts.subject, promptLine: opts.promptLine },
    currentContactMeta(),
  );

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(opts.fallbackTitle, `${opts.fallbackMessage}\n\n${SUPPORT_EMAIL}`);
  }
}
