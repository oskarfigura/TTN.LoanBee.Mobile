import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Minimal RN surface: the wrapper only touches Linking.openURL, Alert.alert
// and Platform. openURL is reassigned per-test to exercise both branches.
const mockOpenURL = jest.fn<(url: string) => Promise<void>>();
const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
  Linking: { openURL: (url: string) => mockOpenURL(url) },
  Platform: { OS: 'ios', Version: '17.4' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.1.0' } },
}));

jest.mock('@/shared/lib/i18n', () => ({
  __esModule: true,
  default: { language: 'en' },
}));

const loadWrapper = async () =>
  (await import('@/shared/lib/services/contact/openSupportEmail')).openSupportEmail;

const opts = {
  subject: '[LoanBee] Support',
  promptLine: 'Please describe the problem:',
  fallbackTitle: 'No mail app found',
  fallbackMessage: 'You can email us directly at:',
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetModules();
});

describe('openSupportEmail', () => {
  it('opens the mailto URL and does not alert on success', async () => {
    mockOpenURL.mockResolvedValueOnce(undefined);
    const openSupportEmail = await loadWrapper();

    await openSupportEmail(opts);

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL.mock.calls[0][0]).toContain('mailto:cactustech.developer@gmail.com');
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('falls back to an alert revealing the address when no mail app opens', async () => {
    mockOpenURL.mockRejectedValueOnce(new Error('no activity found'));
    const openSupportEmail = await loadWrapper();

    await openSupportEmail(opts);

    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, message] = mockAlert.mock.calls[0] as [string, string];
    expect(title).toBe('No mail app found');
    expect(message).toContain('cactustech.developer@gmail.com');
  });
});
