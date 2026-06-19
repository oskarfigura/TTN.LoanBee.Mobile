import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};
const mockSetLanguage = jest.fn();
const mockSetCurrency = jest.fn();
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Alert: { alert: jest.fn() },
    ScrollView: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('ScrollView', props, children)
    ),
    StyleSheet: { create: (styles: unknown) => styles },
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('TouchableOpacity', props, children)
    ),
    View: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('View', props, children)
    ),
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => mockRouter,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (
      values?.count ? `${key}:${values.count}` : key
    ),
  }),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    text: jest.fn(() => Promise.resolve('[]')),
    uri: 'file://backup.json',
  })),
  Paths: { cache: '/tmp' },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
}));

jest.mock('@/shared/lib/hooks/useLocale', () => ({
  useLocale: () => ({
    language: 'en',
    currency: 'GBP',
    setLanguage: mockSetLanguage,
    setCurrency: mockSetCurrency,
  }),
}));

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: {
    clear: jest.fn(),
    getAll: jest.fn(() => []),
    importAll: jest.fn(loans => loans),
  },
}));

jest.mock('@/shared/lib/storage/dataTransfer', () => ({
  buildSavedLoansBackup: jest.fn(() => '[]'),
  DataTransferError: class DataTransferError extends Error {
    code = 'invalidShape';
  },
  parseSavedLoansBackup: jest.fn(() => []),
}));

jest.mock('@/shared/lib/services/diagnostics/crashLog', () => ({
  clearLastCrash: jest.fn(),
  getLastCrash: jest.fn(() => null),
}));

jest.mock('@/features/calculator/components/CurrencyPicker', () => ({
  CurrencyPicker: (props: Record<string, unknown>) => React.createElement('CurrencyPicker', props),
}));

jest.mock('@/shared/ui/components/ChoiceTabs', () => ({
  ChoiceTabs: (props: Record<string, unknown>) => React.createElement('ChoiceTabs', props),
}));


jest.mock('@/shared/ui/components/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('@/shared/ui/components/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const renderSettings = async (): Promise<ReactTestRenderer> => {
  const SettingsScreen = (await import('../../app/(tabs)/settings')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(SettingsScreen));
  });

  return renderer as ReactTestRenderer;
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
      return;
    }
    originalConsoleError(message, ...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('Settings About route', () => {
  it('uses one card treatment for every Settings section', async () => {
    const renderer = await renderSettings();
    const cards = renderer.root.findAll(node => String(node.type) === 'Card');

    expect(cards).toHaveLength(5);
    cards.forEach(card => {
      expect(card.props.variant).toBeUndefined();
    });
  });

  it('uses the shared calculator-style tabs for language selection', async () => {
    const renderer = await renderSettings();
    const languageTabs = renderer.root.find(node => String(node.type) === 'ChoiceTabs');

    expect(languageTabs.props.value).toBe('en');
    expect(languageTabs.props.options).toEqual([
      { label: 'English', value: 'en' },
      { label: 'Polski', value: 'pl' },
    ]);

    await act(async () => {
      languageTabs.props.onChange('pl');
    });

    expect(mockSetLanguage).toHaveBeenCalledWith('pl');
  });

  it('opens About from Settings', async () => {
    const renderer = await renderSettings();
    const aboutRow = renderer.root.find(node => (
      String(node.type) === 'TouchableOpacity' && textContent(node).includes('settings.about')
    ));

    await act(async () => {
      aboutRow.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/about');
  });

  it('keeps About out of the visible tab layout', () => {
    const tabLayout = readFileSync(join(process.cwd(), 'app/(tabs)/_layout.tsx'), 'utf8');

    expect(tabLayout).not.toContain('name="about"');
    expect(tabLayout).not.toContain("name='about'");
  });
});
