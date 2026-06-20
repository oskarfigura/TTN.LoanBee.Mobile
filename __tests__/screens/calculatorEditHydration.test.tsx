import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// End-to-end regression for "open a calculation for editing": drives the REAL
// useLoanCalculatorForm through app/(tabs)/index.tsx's hydration so it exercises
// the actual form.reset / focus-effect interaction rather than a mocked form.
//
// Covers two bugs:
//  1. Currency clobber — editing a calc whose currency differs from the device
//     default used to reset the currency back to the default the moment the form
//     opened (the focus effect re-fired after editValues was cleared to '').
//  2. Enum case — a saved loan's formSnapshot stores enums UPPERCASE; they must be
//     lowercased so the calc-type tabs / down-payment toggle reflect the calc.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockParams: Record<string, string | undefined> = {};
let forceRerender: () => void = () => {};
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: (next: Record<string, string | undefined>) => {
    mockParams = { ...mockParams, ...next };
    act(() => { forceRerender(); });
  },
};

jest.mock('react-native', () => {
  const R = require('react');
  return {
    ScrollView: ({ children, ...p }: Record<string, unknown>) => R.createElement('ScrollView', p, children),
    StyleSheet: { create: (s: unknown) => s },
    TouchableOpacity: ({ children, ...p }: Record<string, unknown>) => R.createElement('TouchableOpacity', p, children),
    View: ({ children, ...p }: Record<string, unknown>) => R.createElement('View', p, children),
  };
});

// Capture the latest focus callback so tests can simulate returning to the tab
// (a real re-focus) without forcing a dependency change.
let focusCallback: (() => void | (() => void)) | null = null;
jest.mock('expo-router', () => {
  const R = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      focusCallback = cb;
      R.useEffect(() => cb(), [cb]);
    },
    useLocalSearchParams: () => mockParams,
    useRouter: () => mockRouter,
  };
});
const runFocus = () => { act(() => { focusCallback?.(); }); };

// Device default currency resolves to GBP (no MMKV override, en locale), so a USD
// calc makes any clobber observable.
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));
jest.mock('@/shared/lib/storage/mmkv', () => ({
  storage: { getString: () => undefined, set: () => undefined, remove: () => undefined },
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return { SafeAreaView: ({ children, ...p }: Record<string, unknown>) => R.createElement('SafeAreaView', p, children) };
});
jest.mock('@/shared/lib/hooks/useSavedLoans', () => ({ useSavedLoans: () => ({ loans: [], refresh: jest.fn() }) }));
jest.mock('@/shared/lib/services/onboarding/guideState', () => ({ hasSeenGuide: () => true }));

let capturedForm: { getValues: (name: string) => unknown };
let capturedOnSubmit: (values: Record<string, unknown>) => void;
jest.mock('@/features/calculator/components/LoanForm', () => {
  const R = require('react');
  return {
    LoanForm: (props: {
      form: { getValues: (name: string) => unknown };
      onSubmit: (values: Record<string, unknown>) => void;
    }) => {
      capturedForm = props.form;
      capturedOnSubmit = props.onSubmit;
      return R.createElement('LoanForm', {});
    },
  };
});
jest.mock('@/features/tracker/components/dashboard/MortgageDashboard', () => {
  const R = require('react');
  return { MortgageDashboard: (p: Record<string, unknown>) => R.createElement('MortgageDashboard', p) };
});
jest.mock('@/shared/ui/components/Icon', () => {
  const R = require('react');
  return { Icon: (p: Record<string, unknown>) => R.createElement('Icon', p), IconName: new Proxy({}, { get: (_t, k) => k }) };
});
jest.mock('@/shared/ui/components/HeaderBackAction', () => {
  const R = require('react');
  return { HeaderBackAction: (p: Record<string, unknown>) => R.createElement('HeaderBackAction', p) };
});
jest.mock('@/shared/ui/components/ScreenHeader', () => {
  const R = require('react');
  return { ScreenHeader: (p: Record<string, unknown>) => R.createElement('ScreenHeader', p) };
});

const renderEditing = async (editValues: Record<string, unknown>) => {
  mockParams = { fromResult: '1', editValues: JSON.stringify(editValues) };
  const { BorrowingJourneyScreen } = await import('../../app/(tabs)/index');
  const Wrapper = () => {
    const [, setN] = React.useState(0);
    forceRerender = () => setN(n => n + 1);
    return React.createElement(BorrowingJourneyScreen, { mode: 'calculate' });
  };
  await act(async () => { create(React.createElement(Wrapper)); });
  // Let the editValues-clearing setParams re-render settle.
  await act(async () => {});
};

const originalConsoleError = console.error;
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) return;
    originalConsoleError(message, ...args);
  });
});

afterEach(() => { mockParams = {}; jest.restoreAllMocks(); jest.clearAllMocks(); });

describe('Calculator edit hydration', () => {
  it('ports every input — including a non-default currency — into the form', async () => {
    await renderEditing({
      category: 'mortgage', currency: 'USD', loanAmount: 300000, interest: 4.5,
      termInYears: 25, termInMonths: 0, downPayment: 10, downPaymentType: 'percent',
      desiredMonthlyPayment: 0, additionalMonthlyPayment: 0, startDate: '2026-01-01',
      calculationType: 'term',
    });

    expect(capturedForm.getValues('interest')).toBe(4.5);
    expect(capturedForm.getValues('loanAmount')).toBe(300000);
    expect(capturedForm.getValues('termInYears')).toBe(25);
    expect(capturedForm.getValues('calculationType')).toBe('term');
    expect(capturedForm.getValues('downPaymentType')).toBe('percent');
    // The bug: this used to come back as the device default 'GBP'.
    expect(capturedForm.getValues('currency')).toBe('USD');
  });

  it('keeps the edited currency across a mid-edit tab re-focus, then defaults again after recalculating', async () => {
    const edit = {
      category: 'mortgage', currency: 'USD', loanAmount: 300000, interest: 4.5,
      termInYears: 25, termInMonths: 0, downPayment: 10, downPaymentType: 'percent',
      desiredMonthlyPayment: 0, additionalMonthlyPayment: 0, startDate: '2026-01-01',
      calculationType: 'term',
    };
    await renderEditing(edit);
    expect(capturedForm.getValues('currency')).toBe('USD');

    // Leaving and returning to the tab without recalculating must NOT reset the
    // currency to the device default — the residual the skip-once guard missed.
    runFocus();
    expect(capturedForm.getValues('currency')).toBe('USD');

    // Recalculating consumes the edit; a subsequent fresh focus defaults again.
    act(() => { capturedOnSubmit(edit); });
    runFocus();
    expect(capturedForm.getValues('currency')).toBe('GBP');
  });

  it('lowercases UPPERCASE formSnapshot enums when hydrating', async () => {
    await renderEditing({
      category: 'mortgage', currency: 'GBP', loanAmount: 250000, interest: 3.99,
      termInYears: 30, termInMonths: 0, downPayment: 25000, downPaymentType: 'CASH',
      desiredMonthlyPayment: null, additionalMonthlyPayment: null, startDate: '2026-01-01',
      calculationType: 'PAYMENT',
    });

    expect(capturedForm.getValues('calculationType')).toBe('payment');
    expect(capturedForm.getValues('downPaymentType')).toBe('cash');
    expect(capturedForm.getValues('interest')).toBe(3.99);
  });
});
