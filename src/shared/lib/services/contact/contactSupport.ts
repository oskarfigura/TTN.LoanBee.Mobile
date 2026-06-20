/**
 * Contact / support channel via a `mailto:` deep link — pure helpers.
 *
 * Zero-infrastructure by design: tapping a category opens the user's own mail
 * app pre-filled with the recipient, a category subject, and a diagnostics
 * footer. Nothing leaves the device until the user sends the mail themselves,
 * so there is no backend, third-party processor, or new dependency involved.
 *
 * This module is intentionally free of React Native / Expo imports so it can be
 * unit-tested in the `core` (node) Jest project. The side-effecting wrapper that
 * opens the composer lives in `openSupportEmail.ts`.
 */

export type ContactCategory = 'support' | 'feedback' | 'sales' | 'question';

export const SUPPORT_EMAIL = 'cactustech.developer@gmail.com';

export interface ContactMeta {
  /** App version, e.g. "2.1.0". */
  version: string;
  /** Platform, e.g. "ios" | "android". */
  platform: string;
  /** OS version, e.g. "17.4". */
  platformVersion: string;
  /** Active app language code, e.g. "en". */
  language: string;
}

export interface SupportEmailContent {
  /** Localized subject line, e.g. "[LoanBee] Support". */
  subject: string;
  /** Localized prompt shown above the user's typing area in the body. */
  promptLine: string;
}

/**
 * Pure builder — produces a `mailto:` URL with URL-encoded subject and body.
 * The body carries the prompt, room to type, and a diagnostics footer so
 * incoming mail is easy to triage without asking the user for their setup.
 */
export function buildSupportMailtoUrl(
  content: SupportEmailContent,
  meta: ContactMeta,
): string {
  const body = [
    content.promptLine,
    '',
    '',
    '---',
    `App: LoanBee v${meta.version}`,
    `Platform: ${meta.platform} ${meta.platformVersion}`,
    `Language: ${meta.language}`,
  ].join('\n');

  const query = `subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${SUPPORT_EMAIL}?${query}`;
}
