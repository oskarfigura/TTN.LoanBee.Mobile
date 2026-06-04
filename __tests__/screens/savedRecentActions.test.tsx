import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};
const mockRefresh = jest.fn();
const mockTogglePinned = jest.fn();
const mockRemoveRecent = jest.fn((id: string) => {
  mockRecentItems = mockRecentItems.filter(item => item.id !== id);
});
let mockRecentItems: Array<Record<string, unknown>> = [];
let mockLoans: unknown[] = [];
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
      ...props
    }: {
      data: unknown[];
      renderItem: ({ item }: { item: unknown }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) => (
      React.createElement(
        'FlatList',
        props,
        ListHeaderComponent,
        data.length === 0 ? ListEmptyComponent : data.map(item => renderItem({ item })),
        ListFooterComponent,
      )
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
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, unknown>) => (
      values?.date ? `${key}:${values.date}` : key
    ),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('../../src/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    loans: mockLoans,
    refresh: mockRefresh,
    togglePinned: mockTogglePinned,
  }),
}));

jest.mock('../../src/storage/recentCalculations', () => ({
  recentCalculationsStorage: {
    getAll: jest.fn(() => mockRecentItems),
    remove: mockRemoveRecent,
  },
}));

jest.mock('../../src/results/loanResultRoute', () => ({
  buildRecentResultParams: (id: string) => ({ mode: 'recent', recentId: id }),
  getResultForFormValues: () => ({
    monthlyPayments: 1200,
    totalInterestPaid: 45000,
  }),
}));

jest.mock('../../src/components/loans/LoanProfileCard', () => ({
  LoanProfileCard: (props: Record<string, unknown>) => React.createElement('LoanProfileCard', props),
}));

jest.mock('../../src/components/ui/AppText', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
}));

jest.mock('../../src/components/ui/Button', () => ({
  Button: (props: Record<string, unknown>) => React.createElement('Button', props),
}));

jest.mock('../../src/components/ui/Card', () => ({
  Card: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('Card', props, children)
  ),
}));

jest.mock('../../src/components/ui/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => React.createElement('EmptyState', props),
}));

jest.mock('../../src/components/ui/FormPrimitives', () => ({
  AppTextInput: (props: Record<string, unknown>) => React.createElement('AppTextInput', props),
  InputSurface: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('InputSurface', props, children)
  ),
}));

jest.mock('../../src/components/ui/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('../../src/components/ui/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('../../src/components/ui/Icons/SearchIcon/SearchIcon', () => ({
  SearchIcon: (props: Record<string, unknown>) => React.createElement('SearchIcon', props),
}));

const renderRecent = async (): Promise<ReactTestRenderer> => {
  const RecentScreen = (await import('../../app/saved/recent')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(RecentScreen));
  });

  return renderer as ReactTestRenderer;
};

const getButton = (renderer: ReactTestRenderer, label: string) => (
  renderer.root.findAll(node => String(node.type) === 'Button').find(node => node.props.label === label)!
);

beforeEach(() => {
  mockRecentItems = [{
    id: 'recent-1',
    category: undefined,
    currency: 'GBP',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:00:00.000Z',
    sourceLabel: 'test',
    formValues: {
      loanAmount: 200000,
      interest: 5,
      termInYears: 20,
      termInMonths: 0,
      downPayment: 0,
      downPaymentType: 'CASH',
      desiredMonthlyPayment: null,
      additionalMonthlyPayment: 0,
      startDate: '2026-06-04',
      calculationType: 'PAYMENT',
      currency: 'GBP',
    },
    resultSnapshot: {
      monthlyPayments: 1200,
      totalAmountPaid: 245000,
      totalInterestPaid: 45000,
      termInYears: 20,
      termInMonths: 0,
      totalTermInMonths: 240,
    },
  }];
  mockLoans = [];
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

describe('Recent calculations page', () => {
  it('reopens, tracks, and deletes recent calculations', async () => {
    const renderer = await renderRecent();

    await act(async () => {
      getButton(renderer, 'recent.reopen').props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/result',
      params: { mode: 'recent', recentId: 'recent-1' },
    });

    await act(async () => {
      getButton(renderer, 'recent.track').props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/saved/new',
      params: {
        recentId: 'recent-1',
        currency: 'GBP',
      },
    });

    await act(async () => {
      getButton(renderer, 'common.delete').props.onPress();
    });

    expect(mockRemoveRecent).toHaveBeenCalledWith('recent-1');
    expect(renderer.root.findAll(node => String(node.type) === 'Button').filter(node => node.props.label === 'recent.reopen')).toHaveLength(0);
  });
});
