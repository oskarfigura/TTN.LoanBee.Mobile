import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  push: jest.fn(),
};
const mockRefresh = jest.fn();
const mockSetValue = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockLoans: unknown[] = [];
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
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

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
    useLocalSearchParams: () => mockParams,
    useRouter: () => mockRouter,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('../../src/hooks/useLoanCalculatorForm', () => ({
  getDefaultCurrency: () => 'GBP',
  useLoanCalculatorForm: () => ({
    setValue: mockSetValue,
  }),
}));

jest.mock('../../src/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    loans: mockLoans,
    refresh: mockRefresh,
  }),
}));

jest.mock('../../src/onboarding/guideState', () => ({
  hasSeenGuide: () => true,
}));

jest.mock('../../src/onboarding/firstRunGate', () => ({
  whenConsentFlowComplete: () => Promise.resolve(),
}));

jest.mock('../../src/components/calculator/LoanForm', () => ({
  LoanForm: (props: Record<string, unknown>) => React.createElement('LoanForm', props),
}));

jest.mock('../../src/components/loans/MortgageDashboard', () => ({
  MortgageDashboard: (props: Record<string, unknown>) => React.createElement('MortgageDashboard', props),
}));

jest.mock('../../src/components/ui/AppText', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
}));

jest.mock('../../src/components/ui/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('../../src/components/ui/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const findTouchableByText = (renderer: ReactTestRenderer, text: string): ReactTestInstance => (
  renderer.root.find(node => String(node.type) === 'TouchableOpacity' && textContent(node).includes(text))
);

const findAllByMockType = (renderer: ReactTestRenderer, type: string): ReactTestInstance[] => (
  renderer.root.findAll(node => String(node.type) === type)
);

const renderHome = async (): Promise<ReactTestRenderer> => {
  const HomeScreen = (await import('../../app/(tabs)/index')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(HomeScreen));
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
  mockParams = {};
  mockLoans = [];
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('Home intent journey', () => {
  it('keeps the upfront choice intent-first and opens the calculator form only for planning', async () => {
    const renderer = await renderHome();

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(0);
    expect(textContent(renderer.root)).toContain('journey.planTitle');
    // Track is split into category-specific cards chosen up front.
    expect(textContent(renderer.root)).toContain('journey.trackMortgageTitle');
    expect(textContent(renderer.root)).toContain('journey.trackLoanTitle');
    expect(textContent(renderer.root)).not.toContain('journey.borrowingType');

    await act(async () => {
      findTouchableByText(renderer, 'journey.planTitle').props.onPress();
    });

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('routes each track card to the category-specific track form', async () => {
    const renderer = await renderHome();

    await act(async () => {
      findTouchableByText(renderer, 'journey.trackMortgageTitle').props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/saved/track?category=mortgage');

    await act(async () => {
      findTouchableByText(renderer, 'journey.trackLoanTitle').props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/saved/track?category=loan');

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(0);
  });
});
