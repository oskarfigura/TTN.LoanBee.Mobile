import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
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
        data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) => (
            React.createElement(React.Fragment, { key: (item as { id?: string }).id ?? index }, renderItem({ item }))
          )),
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

jest.mock('../../src/components/ui/Icons/CheckIcon/CheckIcon', () => ({
  CheckIcon: (props: Record<string, unknown>) => React.createElement('CheckIcon', props),
}));

jest.mock('../../src/components/ui/Icons/TrashIcon/TrashIcon', () => ({
  TrashIcon: (props: Record<string, unknown>) => React.createElement('TrashIcon', props),
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

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const getRecentCardPressables = (renderer: ReactTestRenderer) => (
  renderer.root.findAll(node => (
    String(node.type) === 'TouchableOpacity' && typeof node.props.onLongPress === 'function'
  ))
);

const buildRecentItem = (id: string, createdAt = '2026-06-04T09:00:00.000Z') => ({
  id,
  category: undefined,
  currency: 'GBP',
  createdAt,
  updatedAt: createdAt,
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
});

beforeEach(() => {
  mockRecentItems = [buildRecentItem('recent-1')];
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
  it('opens by tapping the card, tracks, and deletes individual recent calculations', async () => {
    const renderer = await renderRecent();
    const [card] = getRecentCardPressables(renderer);

    await act(async () => {
      card.props.onPress();
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
      renderer.root.find(node => (
        String(node.type) === 'TouchableOpacity' && node.props.accessibilityLabel === 'common.delete'
      )).props.onPress();
    });

    expect(mockRemoveRecent).toHaveBeenCalledWith('recent-1');
    expect(renderer.root.findAll(node => String(node.type) === 'Button').filter(node => node.props.label === 'recent.track')).toHaveLength(0);
    expect(renderer.root.findAll(node => String(node.type) === 'Button').filter(node => node.props.label === 'recent.reopen')).toHaveLength(0);
  });

  it('selects cards by long press and bulk deletes selected calculations', async () => {
    mockRecentItems = [
      buildRecentItem('recent-1', '2026-06-04T09:00:00.000Z'),
      buildRecentItem('recent-2', '2026-06-05T09:00:00.000Z'),
    ];
    const renderer = await renderRecent();

    await act(async () => {
      getRecentCardPressables(renderer)[0].props.onLongPress();
    });

    expect(textContent(renderer.root)).toContain('recent.selectedCount');

    await act(async () => {
      getRecentCardPressables(renderer)[1].props.onPress();
    });

    await act(async () => {
      getButton(renderer, 'recent.deleteSelected').props.onPress();
    });

    expect(mockRemoveRecent).toHaveBeenCalledWith('recent-1');
    expect(mockRemoveRecent).toHaveBeenCalledWith('recent-2');
    expect(renderer.root.findAll(node => String(node.type) === 'Button').filter(node => node.props.label === 'recent.deleteSelected')).toHaveLength(0);
  });
});
