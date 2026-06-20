import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};
const mockRefresh = jest.fn();
const mockSetValue = jest.fn();
const mockReset = jest.fn();
// Stable form reference: react-hook-form returns a stable object, so the focus
// effect's callback identity stays constant and the effect runs on focus, not
// on every render. A fresh object each render would re-fire it spuriously.
// getValues returns undefined (≠ the mocked 'GBP' default) so the focus effect's
// "only write when changed" guard still triggers setValue, matching prior behaviour.
const mockForm = { setValue: mockSetValue, getValues: () => undefined, reset: mockReset };
const mockUseLoanCalculatorForm = jest.fn((_options?: unknown) => mockForm);
let mockParams: Record<string, string | undefined> = {};
let mockLoans: unknown[] = [];
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    StyleSheet: { create: (styles: unknown) => styles },
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
  useLoanCalculatorForm: (options?: unknown) => mockUseLoanCalculatorForm(options),
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

const findAllByMockType = (renderer: ReactTestRenderer, type: string): ReactTestInstance[] => (
  renderer.root.findAll(node => String(node.type) === type)
);

const formValues = {
  category: 'mortgage',
  currency: 'GBP',
  loanAmount: 300000,
  interest: 4.5,
  termInYears: 25,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: 'percent',
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: '2026-01-01',
  calculationType: 'term',
};

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

describe('Calculate tab', () => {
  it('opens directly on the calculator form with no back action', async () => {
    const renderer = await renderCalculate();
    const header = findAllByMockType(renderer, 'ScreenHeader')[0];

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(1);
    expect(header.props.leftAction).toBeUndefined();
  });

  it('keeps direct Calculate results in the Calculate stack', async () => {
    const renderer = await renderCalculate();
    const loanForm = findAllByMockType(renderer, 'LoanForm')[0];

    await act(async () => {
      loanForm.props.onSubmit(formValues);
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate/result',
      params: expect.not.objectContaining({ returnTo: expect.anything() }),
    });
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

  it('returns to Results when the calculator was opened for editing', async () => {
    const editValues = {
      calculationType: 'term',
      termInYears: 20,
      termInMonths: 0,
    };
    mockParams = {
      fromResult: '1',
      editValues: JSON.stringify(editValues),
      returnResultParams: JSON.stringify({
        mode: 'draft',
        draftId: 'draft-1',
        currency: 'GBP',
      }),
    };
    const renderer = await renderCalculate();
    const header = findAllByMockType(renderer, 'ScreenHeader')[0];
    const backAction = header.props.leftAction as React.ReactElement<{ onPress: () => void }>;
    const loanForm = findAllByMockType(renderer, 'LoanForm')[0];

    expect(backAction).toBeDefined();
    expect(header.props.title).toBe('calculator.editTitle');
    expect(loanForm.props.submitLabel).toBe('calculator.updateResult');
    expect(mockUseLoanCalculatorForm).toHaveBeenCalledWith({ initialValues: editValues });
    const topContent = loanForm.props.topContent as React.ReactElement<{
      children: React.ReactElement<{ children: string }>;
    }>;
    expect(topContent.props.children.props.children).toBe('calculator.editSubtitle');

    await act(async () => {
      backAction.props.onPress();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/calculate/result',
      params: {
        mode: 'draft',
        draftId: 'draft-1',
        currency: 'GBP',
      },
    });
  });

  it('preserves a result return target after recalculating edited inputs', async () => {
    mockParams = {
      fromResult: '1',
      editValues: JSON.stringify(formValues),
      returnResultParams: JSON.stringify({
        mode: 'recent',
        recentId: 'recent-1',
        returnTo: '/saved/recent',
      }),
    };
    const renderer = await renderCalculate();
    const loanForm = findAllByMockType(renderer, 'LoanForm')[0];

    await act(async () => {
      loanForm.props.onSubmit(formValues);
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate/result',
      params: expect.objectContaining({
        returnTo: '/saved/recent',
      }),
    });
  });
});

describe('Home tab', () => {
  it('shows the calculator form directly when there are no saved loans', async () => {
    const renderer = await renderHome();
    const header = findAllByMockType(renderer, 'ScreenHeader')[0];

    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(1);
    expect(findAllByMockType(renderer, 'MortgageDashboard')).toHaveLength(0);
    // No multi-step journey: it is the single calculation surface, no back action.
    expect(header.props.leftAction).toBeUndefined();
  });

  it('returns Home-originated results to Home', async () => {
    const renderer = await renderHome();
    const loanForm = findAllByMockType(renderer, 'LoanForm')[0];

    await act(async () => {
      loanForm.props.onSubmit(formValues);
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate/result',
      params: expect.objectContaining({ returnTo: '/' }),
    });
  });

  it('shows the dashboard instead of the form when pinned loans exist', async () => {
    mockLoans = [
      { id: 'loan-1', pinnedToDashboard: true, dashboardOrder: 0 },
    ];
    const renderer = await renderHome();

    const dashboards = findAllByMockType(renderer, 'MortgageDashboard');
    expect(dashboards).toHaveLength(1);
    expect(findAllByMockType(renderer, 'LoanForm')).toHaveLength(0);

    await act(async () => {
      dashboards[0].props.onNewCalculation();
    });
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate',
      params: { fromTracked: '1', returnTo: '/' },
    });
  });
});
