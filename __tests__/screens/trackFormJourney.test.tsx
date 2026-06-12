import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
  replace: jest.fn(),
};
// Mutable route params — category is now passed in from the intent step.
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

jest.mock('../../src/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({
    add: mockAdd,
    update: mockUpdate,
  }),
}));

jest.mock('../../src/storage/mmkv', () => ({
  storage: {
    getString: jest.fn(() => 'GBP'),
  },
}));

jest.mock('../../src/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => undefined),
    getMaxDashboardOrder: jest.fn(() => 0),
    remove: jest.fn(),
  },
}));

jest.mock('../../src/review', () => ({
  useStoreReview: () => ({
    recordUsefulAction: mockRecordUsefulAction,
    requestReview: mockRequestReview,
  }),
}));

jest.mock('../../src/components/calculator/CurrencyPicker', () => ({
  CurrencyPicker: (props: Record<string, unknown>) => React.createElement('CurrencyPicker', props),
}));

jest.mock('../../src/components/loans/LenderTextInput', () => ({
  LenderTextInput: (props: Record<string, unknown>) => React.createElement('LenderTextInput', props),
}));

jest.mock('../../src/components/mortgage/OverpaymentEntryRow', () => ({
  OverpaymentEntryRow: (props: Record<string, unknown>) => React.createElement('OverpaymentEntryRow', props),
}));

jest.mock('../../src/components/ui/AppText', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
}));

jest.mock('../../src/components/ui/Button', () => ({
  Button: (props: Record<string, unknown>) => React.createElement('Button', props),
}));

jest.mock('../../src/components/ui/DatePickerField', () => ({
  DatePickerField: (props: Record<string, unknown>) => React.createElement('DatePickerField', props),
}));

jest.mock('../../src/components/ui/KeyboardAwareFormScreen', () => ({
  KeyboardAwareFormScreen: ({ children, footer, ...props }: { children?: React.ReactNode; footer?: React.ReactNode }) => (
    React.createElement('KeyboardAwareFormScreen', props, children, footer)
  ),
}));

jest.mock('../../src/components/ui/FormPrimitives', () => ({
  AppTextInput: (props: Record<string, unknown>) => React.createElement('AppTextInput', props),
  FieldError: (props: Record<string, unknown>) => React.createElement('FieldError', props),
  FieldHint: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FieldHint', props, children)
  ),
  FieldLabel: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FieldLabel', props, children)
  ),
  FormSection: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FormSection', props, children)
  ),
  InputAffix: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('InputAffix', props, children)
  ),
  InputSurface: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('InputSurface', props, children)
  ),
  SegmentedControl: (props: Record<string, unknown>) => React.createElement('SegmentedControl', props),
}));

jest.mock('../../src/components/ui/Icon', () => ({
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

const getStartDateField = (renderer: ReactTestRenderer): ReactTestInstance => (
  renderer.root.findAll(node => String(node.type) === 'DatePickerField').find(node => node.props.label === 'track.dealStartDate')!
);

const hasMortgageRepaymentToggle = (renderer: ReactTestRenderer): boolean => (
  renderer.root.findAll(node => String(node.type) === 'SegmentedControl').some(node => (
    (node.props.options as Array<{ value: string }>).some(option => option.value === 'interestOnly')
  ))
);

const findModeToggle = (renderer: ReactTestRenderer): ReactTestInstance | undefined => (
  renderer.root.findAll(node => String(node.type) === 'SegmentedControl').find(node => (
    (node.props.options as Array<{ value: string }>).some(option => option.value === 'beginning')
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
  it('uses one start-date field with category-aware hint copy and no minimum date', async () => {
    const renderer = await renderTrack();
    const startDateField = getStartDateField(renderer);

    expect(startDateField.props.hint).toBe('track.dealStartDateHint');
    expect(startDateField.props.minimumDate).toBeUndefined();
    expect(textContent(renderer.root)).toContain('track.currentBalance');
    expect(textContent(renderer.root)).toContain('track.remainingTerm');

    await act(async () => {
      startDateField.props.onChange('2019-01-01');
    });

    expect(textContent(renderer.root)).toContain('track.startingBalance');
    expect(textContent(renderer.root)).toContain('track.originalTerm');

    // Loan category (passed in from the intent step) uses loan-specific hint copy.
    const loanRenderer = await renderTrack({ category: 'loan' });
    expect(getStartDateField(loanRenderer).props.hint).toBe('track.dealStartDateHintLoan');
  });

  it('keeps loans on the single-deal path by hiding mortgage-only controls', async () => {
    const mortgageRenderer = await renderTrack({ category: 'mortgage' });
    expect(hasMortgageRepaymentToggle(mortgageRenderer)).toBe(true);

    const loanRenderer = await renderTrack({ category: 'loan' });
    expect(hasMortgageRepaymentToggle(loanRenderer)).toBe(false);
    expect(loanRenderer.root.findAll(node => String(node.type) === 'DatePickerField').some(node => node.props.label === 'track.dealEndDate')).toBe(false);
  });

  it('reveals price + deposit and hides the balance field when tracking from the beginning', async () => {
    const renderer = await renderTrack();

    // Default mortgage mode is "from today": balance field, no price/deposit.
    expect(textContent(renderer.root)).toContain('track.currentBalance');
    expect(textContent(renderer.root)).not.toContain('track.propertyPrice');

    await act(async () => {
      findModeToggle(renderer)!.props.onChange('beginning');
    });

    const text = textContent(renderer.root);
    expect(text).toContain('track.propertyPrice');
    expect(text).toContain('track.deposit');
    expect(text).not.toContain('track.currentBalance');
    expect(text).not.toContain('track.startingBalance');
  });

  it('saves the derived borrowed balance and records the deposit', async () => {
    const renderer = await renderTrack();

    await act(async () => {
      findModeToggle(renderer)!.props.onChange('beginning');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.nickname').props.onChangeText('Family home');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.propertyPrice').props.onChangeText('300000');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.deposit').props.onChangeText('60000');
    });
    await act(async () => {
      inputForLabel(renderer, 'track.rate').props.onChangeText('4.5');
    });
    await act(async () => {
      // First input in the (original) term group is the years field.
      inputForLabel(renderer, 'track.originalTerm').props.onChangeText('25');
    });

    await pressSave(renderer);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const saved = mockAdd.mock.calls[0][0] as {
      deals: Array<{ openingBalance: number }>;
      formSnapshot: { loanAmount: number; downPayment: number };
    };
    expect(saved.deals[0].openingBalance).toBe(240000);
    expect(saved.formSnapshot.loanAmount).toBe(300000);
    expect(saved.formSnapshot.downPayment).toBe(60000);
  });

  it('hides the from-today / from-the-beginning toggle for loans', async () => {
    const mortgageRenderer = await renderTrack({ category: 'mortgage' });
    expect(findModeToggle(mortgageRenderer)).toBeDefined();

    const loanRenderer = await renderTrack({ category: 'loan' });
    expect(findModeToggle(loanRenderer)).toBeUndefined();
  });

  it('caps the purchase date at today and clamps a future date when switching to from-the-beginning', async () => {
    const renderer = await renderTrack();

    // Pick a future start date while still in from-today mode…
    await act(async () => {
      getStartDateField(renderer).props.onChange('2999-01-01');
    });
    // …then switch to from-the-beginning.
    await act(async () => {
      findModeToggle(renderer)!.props.onChange('beginning');
    });

    const purchaseField = renderer.root
      .findAll(node => String(node.type) === 'DatePickerField')
      .find(node => node.props.label === 'track.purchaseDate')!;

    // Future date is clamped (a historical purchase can't be in the future)…
    expect(purchaseField.props.value).not.toBe('2999-01-01');
    // …and the picker is capped so the user can't reselect a future date.
    expect(purchaseField.props.maximumDate).toBeDefined();
  });
});
