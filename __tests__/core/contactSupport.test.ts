import { describe, expect, it } from '@jest/globals';
import {
  buildSupportMailtoUrl,
  ContactMeta,
  SUPPORT_EMAIL,
} from '@/shared/lib/services/contact/contactSupport';

const meta: ContactMeta = {
  version: '2.1.0',
  platform: 'ios',
  platformVersion: '17.4',
  language: 'en',
};

describe('buildSupportMailtoUrl', () => {
  it('targets the support address', () => {
    const url = buildSupportMailtoUrl({ subject: '[LoanBee] Support', promptLine: 'Hi' }, meta);
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  });

  it('URL-encodes the subject so the category drives it intact', () => {
    const url = buildSupportMailtoUrl(
      { subject: '[LoanBee] Sales enquiry', promptLine: 'Hi' },
      meta,
    );
    expect(url).toContain(`subject=${encodeURIComponent('[LoanBee] Sales enquiry')}`);
  });

  it('URL-encodes the body and includes the prompt line', () => {
    const url = buildSupportMailtoUrl(
      { subject: 'S', promptLine: 'Please describe the problem you are having:' },
      meta,
    );
    expect(url).toContain('&body=');
    // No raw spaces/newlines should leak into the query string.
    expect(url).not.toMatch(/body=[^&]*\s/);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('Please describe the problem you are having:');
  });

  it('appends a diagnostics footer with version, platform and language', () => {
    const url = buildSupportMailtoUrl({ subject: 'S', promptLine: 'Hi' }, meta);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('---');
    expect(body).toContain('App: LoanBee v2.1.0');
    expect(body).toContain('Platform: ios 17.4');
    expect(body).toContain('Language: en');
  });
});
