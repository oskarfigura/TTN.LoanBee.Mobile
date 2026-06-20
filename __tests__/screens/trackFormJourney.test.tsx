import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
  replace: jest.fn(),
};
// Mutable route params — category is supplied via the `?category=` route param.
let mockParams: Record<string, string> = {};
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockRecordUsefulAction = jest.fn(() => Promise.resolve());
const mockRequestReview = jest.fn(() => Promise.resolve(false));
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
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
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/shared/lib/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    add: mockAdd,
    update: mockUpdate,
  }),
}));

jest.mock('@/shared/lib/storage/mmkv', () => ({
  storage: {
    getString: jest.fn(() => 'GBP'),
  },
}));

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => undefined),
    getMaxDashboardOrder: jest.fn(() => 0),
    remove: jest.fn(),
  },
}));

jest.mock('@/shared/lib/services/review', () => ({
  useStoreReview: () => ({
    recordUsefulAction: mockRecordUsefulAction,
    requestReview: mockRequestReview,
  }),
}));

jest.mock('@/features/calculator/components/CurrencyPicker', () => ({
  CurrencyPicker: (props: Record<string, unknown>) => React.createElement('CurrencyPicker', props),
}));

jest.mock('@/features/tracker/components/editing/LenderTextInput', () => ({
  LenderTextInput: (props: Record<string, unknown>) => React.createElement('LenderTextInput', props),
}));

jest.mock('@/features/tracker/components/overpayments/OverpaymentEntryRow', () => ({
  OverpaymentEntryRow: (props: Record<string, unknown>) => React.createElement('OverpaymentEntryRow', props),
}));

jest.mock('@/shared/ui/components/ChoiceTabs', () => ({
  ChoiceTabs: (props: Record<string, unknown>) => React.createElement('ChoiceTabs', props),
}));

jest.mock('@/shared/ui/components/DatePickerField', () => ({
  DatePickerField: (props: Record<string, unknown>) => React.createElement('DatePickerField', props),
}));

jest.mock('@/shared/ui/components/KeyboardAwareFormScreen', () => ({
  KeyboardAwareFormScreen: ({ children, footer, ...props }: { children?: React.ReactNode; footer?: React.ReactNode }) => (
    React.createElement('KeyboardAwareFormScreen', props, children, footer)
  ),
}));


jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const renderTrack = async (params: Record<string, string> = {}): Promise<ReactTestRenderer> => {
  mockParams = params;
  const TrackScreen = (await import('../../app/saved/track')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(TrackScreen));
  });

  return renderer as ReactTestRenderer;
};

const hasMortgageRepaymentToggle = (renderer: ReactTestRenderer): boolean => (
  renderer.root.findAll(node => String(node.type) === 'ChoiceTabs').some(node => (
    (node.props.options as Array<{ value: string }>).some(option => option.value === 'interestOnly')
  ))
);

const findPaymentBasisToggle = (renderer: ReactTestRenderer): ReactTestInstance | undefined => (
  renderer.root.findAll(node => String(node.type) === 'ChoiceTabs').find(node => (
    (node.props.options as Array<{ value: string }>).some(option => option.value === 'payment')
    && (node.props.options as Array<{ value: string }>).some(option => option.value === 'term')
  ))
);

// Locate the first AppTextInput that follows the field label `labelText`. A
// depth-first walk tracks the most recent FieldLabel, so each input is matched
// to the label rendered just above it (robust to the surrounding wrapper tree).
const inputForLabel = (renderer: ReactTestRenderer, labelText: string): ReactTestInstance => {
  let currentLabel = '';
  let found: ReactTestInstance | undefined;
  const walk = (node: ReactTestInstance | string | number | null | undefined): void => {
    if (found || node === null || node === undefined || typeof node === 'string' || typeof node === 'number') {
      return;
    }
    if (String(node.type) === 'FieldLabel') currentLabel = textContent(node);
    if (String(node.type) === 'AppTextInput' && currentLabel === labelText) {
      found = node;
      return;
    }
    node.children.forEach(child => walk(child as ReactTestInstance | string | number));
  };
  walk(renderer.root);
  return found!;
};

const pressSave = async (renderer: ReactTestRenderer): Promise<void> => {
  const saveButton = renderer.root
    .findAll(node => String(node.type) === 'Button')
    .find(node => node.props.label === 'track.save')!;
  await act(async () => {
    (saveButton.props.onPress as () => void)();
  });
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
  mockParams = {};
});

describe('Track form journey', () => {
  it('starts from current lender-confirmed facts and keeps enrichment closed', async () => {
    const renderer = await renderTrack();

    expect(textContent(renderer.root)).toContain('track.currentBalance');
    expect(textContent(renderer.root)).toContain('track.actualMonthlyPayment');
    expect(textContent(renderer.root)).toContain('track.optionalDetails');
    expect(textContent(renderer.root)).not.toContain('track.nickname');
    expect(renderer.root.findAll(node => String(node.type) === 'DatePickerField')).toHaveLength(0);
  });

  it('keeps loans on the single-deal path by hiding mortgage-only controls', async () => {
    const mortgageRenderer = await renderTrack({ category: 'mortgage' });
    expect(hasMortgageRepaymentToggle(mortgageRenderer)).toBe(true);

    const loanRenderer = await renderTrack({ category: 'loan' });
    expect(hasMortgageRepaymentToggle(loanRenderer)).toBe(false);
    expect(loanRenderer.root.findAll(node => String(node.type) === 'DatePickerField').some(node => node.props.label === 'track.dealEndDate')).toBe(false);
  });

  it('lets users enter a remaining term instead of an actual payment', async () => {
    const renderer = await renderTrack();

    await act(async () => {
      findPaymentBasisToggle(renderer)!.props.onChange('term');
    });

    const text = textContent(renderer.root);
    expect(text).toContain('track.remainingTerm');
    expect(text).not.toContain('track.actualMonthlyPaymentHint');
  });

  it('saves with the actual lender payment and a generated name', async () => {
    const renderer = await renderTrack();

    await act(async () => {
      inputForLabel(renderer, 'track.currentBalance').props.onChangeText('240000');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.rate').props.onChangeText('4.5');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.actualMonthlyPayment').props.onChangeText('1500');
    });

    await pressSave(renderer);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const saved = mockAdd.mock.calls[0][0] as {
      nickname: string;
      deals: Array<{ openingBalance: number; monthlyPayment: number }>;
    };
    expect(saved.deals[0].openingBalance).toBe(240000);
    expect(saved.deals[0].monthlyPayment).toBe(1500);
    expect(saved.nickname).toBe('track.defaultMortgageName');
  });

  it('only asks for a deal end date after the user opts in', async () => {
    const renderer = await renderTrack();

    await act(async () => {
      renderer.root.find(node => (
        String(node.type) === 'TouchableOpacity'
        && textContent(node).includes('track.optionalDetails')
      )).props.onPress();
    });
    expect(textContent(renderer.root)).toContain('track.nickname');
    expect(renderer.root.findAll(node => String(node.type) === 'DatePickerField')).toHaveLength(0);

    await act(async () => {
      renderer.root.find(node => (
        String(node.type) === 'TouchableOpacity'
        && textContent(node).includes('track.hasDealEnd')
      )).props.onPress();
    });

    const dealEndField = renderer.root
      .findAll(node => String(node.type) === 'DatePickerField')
      .find(node => node.props.label === 'track.dealEndDate');
    expect(dealEndField).toBeDefined();
  });
});
