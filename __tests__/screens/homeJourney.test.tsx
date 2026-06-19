import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};
const mockRefresh = jest.fn();
const mockSetValue = jest.fn();
// Stable form reference: react-hook-form returns a stable object, so the focus
// effect's callback identity stays constant and the effect runs on focus, not
// on every render. A fresh object each render would re-fire it spuriously.
// getValues returns undefined (≠ the mocked 'GBP' default) so the focus effect's
// "only write when changed" guard still triggers setValue, matching prior behaviour.
const mockForm = { setValue: mockSetValue, getValues: () => undefined };
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

jest.mock('@/shared/lib/hooks/useLoanCalculatorForm', () => ({
  getDefaultCurrency: () => 'GBP',
  useLoanCalculatorForm: () => mockForm,
}));

jest.mock('@/shared/lib/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    loans: mockLoans,
    refresh: mockRefresh,
  }),
}));

jest.mock('@/shared/lib/services/onboarding/guideState', () => ({
  hasSeenGuide: () => true,
}));

jest.mock('@/shared/lib/services/onboarding/firstRunGate', () => ({
  whenConsentFlowComplete: () => Promise.resolve(),
}));

jest.mock('@/features/calculator/components/LoanForm', () => ({
  LoanForm: (props: Record<string, unknown>) => React.createElement('LoanForm', props),
}));

jest.mock('@/features/tracker/components/dashboard/MortgageDashboard', () => ({
  MortgageDashboard: (props: Record<string, unknown>) => React.createElement('MortgageDashboard', props),
}));

// Stub the journey icons so the test never pulls in react-native-svg.
jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));


jest.mock('@/shared/ui/components/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('@/shared/ui/components/ScreenHeader', () => ({
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

const renderCalculate = async (): Promise<ReactTestRenderer> => {
  const { BorrowingJourneyScreen } = await import('../../app/(tabs)/index');
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(BorrowingJourneyScreen, { mode: 'calculate' }));
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
  it('opens the Calculate tab directly on the calculator form', async () => {
    const renderer = await renderCalculate();
    const header = findAllByMockType(renderer, 'ScreenHeader')[0];

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(1);
    expect(textContent(renderer.root)).not.toContain('journey.intentTitle');
    expect(header.props.leftAction).toBeUndefined();
  });

  it('shows an explicit return action when Calculate was opened from a tracked view', async () => {
    mockParams = {
      fromTracked: '1',
      returnTo: '/saved/loan-1',
    };
    const renderer = await renderCalculate();
    const header = findAllByMockType(renderer, 'ScreenHeader')[0];
    const backAction = header.props.leftAction as React.ReactElement<{ onPress: () => void }>;

    expect(backAction).toBeDefined();

    await act(async () => {
      backAction.props.onPress();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/saved/loan-1');
  });

  it('keeps the upfront choice intent-first and opens the calculator form only for planning', async () => {
    const renderer = await renderHome();

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(0);
    // Step 1 is a clean Calculate-vs-Track fork; category cards live on step 2.
    expect(textContent(renderer.root)).toContain('journey.calculateTitle');
    expect(textContent(renderer.root)).toContain('journey.trackTitle');
    expect(textContent(renderer.root)).not.toContain('journey.trackChoiceTitle');

    await act(async () => {
      findTouchableByText(renderer, 'journey.calculateTitle').props.onPress();
    });

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('routes through the track step 2 to the category-specific form', async () => {
    const renderer = await renderHome();

    // Track my borrowing reveals the category step without navigating away.
    await act(async () => {
      findTouchableByText(renderer, 'journey.trackTitle').props.onPress();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(textContent(renderer.root)).toContain('journey.trackChoiceTitle');

    await act(async () => {
      findTouchableByText(renderer, 'save.mortgage').props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/saved/track?category=mortgage');

    await act(async () => {
      findTouchableByText(renderer, 'save.loan').props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/saved/track?category=loan');

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(0);
  });
});
