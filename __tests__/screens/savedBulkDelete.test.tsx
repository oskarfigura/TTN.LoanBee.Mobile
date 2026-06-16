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
const mockRemove = jest.fn((id: string) => {
  mockLoans = mockLoans.filter(loan => loan.id !== id);
});
let mockLoans: Array<{ id: string; status: string }> = [];
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
    Alert: {
      alert: (
        _title: string,
        _message: string,
        buttons?: Array<{ style?: string; onPress?: () => void }>,
      ) => {
        const confirm = buttons?.find(button => button.style === 'destructive');
        confirm?.onPress?.();
      },
    },
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
      values?.count !== undefined ? `${key}:${values.count}` : key
    ),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('SafeAreaView', props, children)
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../../src/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    loans: mockLoans,
    refresh: mockRefresh,
    togglePinned: mockTogglePinned,
    remove: mockRemove,
  }),
}));

jest.mock('../../src/storage/recentCalculations', () => ({
  recentCalculationsStorage: {
    getAll: jest.fn(() => []),
  },
}));

jest.mock('../../src/storage/savedLoans', () => ({
  savedLoansStorage: {
    getAll: jest.fn(() => mockLoans),
  },
}));

jest.mock('../../src/components/loans/LoanProfileCard', () => ({
  LoanProfileCard: (props: Record<string, unknown>) => React.createElement('LoanProfileCard', props),
}));

jest.mock('../../src/components/ui/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));



jest.mock('../../src/components/ui/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => React.createElement('EmptyState', props),
}));


jest.mock('../../src/components/ui/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));


jest.mock('../../src/components/ui/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

const renderSaved = async (): Promise<ReactTestRenderer> => {
  const SavedScreen = (await import('../../app/(tabs)/saved')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(SavedScreen));
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

const getCards = (renderer: ReactTestRenderer) => (
  renderer.root.findAll(node => String(node.type) === 'LoanProfileCard')
);

beforeEach(() => {
  mockLoans = [
    { id: 'loan-1', status: 'active' },
    { id: 'loan-2', status: 'active' },
  ];
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

describe('Saved loans bulk delete', () => {
  it('opens a saved loan on tap when not in selection mode', async () => {
    const renderer = await renderSaved();

    await act(async () => {
      const card = getCards(renderer)[0];
      card.props.onPress(card.props.loan);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/saved/loan-1');
  });

  it('selects all and bulk deletes the saved loans after confirming', async () => {
    const renderer = await renderSaved();

    await act(async () => {
      const card = getCards(renderer)[0];
      card.props.onLongPress(card.props.loan.id);
    });

    expect(textContent(renderer.root)).toContain('saved.selectedCount');

    await act(async () => {
      getButton(renderer, 'saved.selectAll').props.onPress();
    });

    expect(getButton(renderer, 'saved.deselectAll')).toBeTruthy();

    await act(async () => {
      getButton(renderer, 'common.delete').props.onPress();
    });

    expect(mockRemove).toHaveBeenCalledWith('loan-1');
    expect(mockRemove).toHaveBeenCalledWith('loan-2');
  });

  it('cancel exits selection mode without deleting', async () => {
    const renderer = await renderSaved();

    await act(async () => {
      const card = getCards(renderer)[0];
      card.props.onLongPress(card.props.loan.id);
    });

    await act(async () => {
      getButton(renderer, 'common.cancel').props.onPress();
    });

    expect(renderer.root.findAll(node => String(node.type) === 'Button').filter(node => node.props.label === 'common.delete')).toHaveLength(0);
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
