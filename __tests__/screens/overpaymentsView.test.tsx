import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OverpaymentImpact, OverpaymentScope } from '@/shared/domain/loans/overpaymentScope';
import { MortgageEvent, SavedLoan } from '@/shared/domain/types/SavedLoan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
};
const mockUnlockAsync = jest.fn(() => Promise.resolve());
const mockLockAsync = jest.fn(() => Promise.resolve());
const mockStorageUpdate = jest.fn();
const mockLoan = { id: 'loan-1' } as SavedLoan;
let mockScope: OverpaymentScope;
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Modal: ({ children, visible, ...props }: { children?: React.ReactNode; visible?: boolean }) => (
      React.createElement('Modal', { ...props, visible }, visible ? children : null)
    ),
    Pressable: ({ children, style, ...props }: { children?: React.ReactNode; style?: unknown }) => (
      React.createElement(
        'Pressable',
        { ...props, style: typeof style === 'function' ? style({ pressed: false }) : style },
        children,
      )
    ),
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

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: mockLockAsync,
  unlockAsync: mockUnlockAsync,
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');

  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Svg', props, children),
    Path: (props: Record<string, unknown>) => React.createElement('Path', props),
  };
});

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => mockLoan),
    update: mockStorageUpdate,
  },
}));

jest.mock('@/features/tracker/components/overpayments/MonthlyOverpaymentSheet', () => ({
  MonthlyOverpaymentSheet: (props: Record<string, unknown>) => React.createElement('MonthlyOverpaymentSheet', props),
}));

jest.mock('@/features/tracker/components/overpayments/LumpSumSheet', () => ({
  LumpSumSheet: (props: Record<string, unknown>) => React.createElement('LumpSumSheet', props),
}));

jest.mock('@/shared/ui/charts/OverpaymentsComparisonChart', () => ({
  OverpaymentsComparisonChart: (props: Record<string, unknown>) => (
    React.createElement('OverpaymentsComparisonChart', props)
  ),
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

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('KeyboardAvoidingView', props, children)
  ),
}));

const lumpEvent: MortgageEvent = {
  id: 'lump-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  type: 'lumpOverpayment',
  date: '2027-03-01',
  amount: 5000,
};

const monthlyImpact: OverpaymentImpact = {
  interestSaved: 1000,
  secondary: { kind: 'monthsSaved', value: 2 },
};

const lumpImpact: OverpaymentImpact = {
  interestSaved: 500,
  secondary: { kind: 'monthsSaved', value: 1 },
};

const makeScope = (overrides: Partial<OverpaymentScope> = {}): OverpaymentScope => ({
  labels: {
    titleKey: 'overpayments.title',
    monthlySectionKey: 'overpayments.monthlySection',
    monthlyEditKey: 'overpayments.monthlyEdit',
    monthlyPlaceholder: '0',
    monthlyCurrencySymbol: '£',
    lumpSectionKey: 'overpayments.lumpSection',
    lumpEmptyKey: 'overpayments.lumpEmpty',
    lumpPlaceholder: '0',
  },
  currency: 'GBP',
  monthlyAmount: 0,
  lumpEvents: [],
  minDate: new Date('2026-06-01T00:00:00'),
  maxDate: new Date('2046-06-01T00:00:00'),
  bannerImpact: null,
  chartData: {
    baselineRemaining: [100000, 90000],
    scenarioRemaining: [100000, 85000],
  },
  computeMonthlyImpact: jest.fn(() => monthlyImpact),
  computeLumpImpact: jest.fn(() => lumpImpact),
  applySaveMonthly: jest.fn(() => ({ id: 'monthly-saved' } as SavedLoan)),
  applyRemoveMonthly: jest.fn(() => ({ id: 'monthly-removed' } as SavedLoan)),
  applySaveLump: jest.fn(() => ({ id: 'lump-saved' } as SavedLoan)),
  applyDeleteLump: jest.fn(() => ({ id: 'lump-deleted' } as SavedLoan)),
  ...overrides,
});

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const renderOverpayments = async (): Promise<ReactTestRenderer> => {
  const { OverpaymentsView } = await import('@/features/tracker/components/overpayments/OverpaymentsView');
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(OverpaymentsView, {
      id: 'loan-1',
      notFoundTitleKey: 'saved.notFound',
      createScope: () => mockScope,
    }));
  });

  return renderer as ReactTestRenderer;
};

const getButton = (renderer: ReactTestRenderer, label: string) => (
  renderer.root.findAll(node => String(node.type) === 'Button').find(node => node.props.label === label)!
);

beforeEach(() => {
  mockScope = makeScope();
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

describe('OverpaymentsView', () => {
  it('opens the monthly sheet and wires save/remove through the scope adapter', async () => {
    const renderer = await renderOverpayments();

    await act(async () => {
      getButton(renderer, 'overpayments.monthlyNotSet').props.onPress();
    });

    let monthlySheet = renderer.root.find(node => String(node.type) === 'MonthlyOverpaymentSheet');
    expect(monthlySheet.props.visible).toBe(true);

    await act(async () => {
      monthlySheet.props.onSave(250);
    });

    expect(mockScope.applySaveMonthly).toHaveBeenCalledWith(250);
    expect(mockStorageUpdate).toHaveBeenCalledWith({ id: 'monthly-saved' });

    await act(async () => {
      getButton(renderer, 'overpayments.monthlyNotSet').props.onPress();
    });
    monthlySheet = renderer.root.find(node => String(node.type) === 'MonthlyOverpaymentSheet');

    await act(async () => {
      monthlySheet.props.onRemove();
    });

    expect(mockScope.applyRemoveMonthly).toHaveBeenCalledTimes(1);
    expect(mockStorageUpdate).toHaveBeenCalledWith({ id: 'monthly-removed' });
  });

  it('opens add/edit lump sheets and wires save/delete through the scope adapter', async () => {
    mockScope = makeScope({ lumpEvents: [lumpEvent] });
    const renderer = await renderOverpayments();

    await act(async () => {
      getButton(renderer, 'overpayments.lumpSumAdd').props.onPress();
    });

    let lumpSheet = renderer.root.find(node => String(node.type) === 'LumpSumSheet');
    expect(lumpSheet.props.visible).toBe(true);
    expect(lumpSheet.props.event).toBeNull();

    await act(async () => {
      lumpSheet.props.onSave('2028-01-01', 6000);
    });

    expect(mockScope.applySaveLump).toHaveBeenCalledWith('2028-01-01', 6000, null);
    expect(mockStorageUpdate).toHaveBeenCalledWith({ id: 'lump-saved' });

    const lumpRow = renderer.root.find(node => (
      String(node.type) === 'TouchableOpacity' && textContent(node).includes('5,000')
    ));

    await act(async () => {
      lumpRow.props.onPress();
    });

    lumpSheet = renderer.root.find(node => String(node.type) === 'LumpSumSheet');
    expect(lumpSheet.props.visible).toBe(true);
    expect(lumpSheet.props.event).toMatchObject({ id: 'lump-1' });

    await act(async () => {
      lumpSheet.props.onDelete('lump-1');
    });

    expect(mockScope.applyDeleteLump).toHaveBeenCalledWith('lump-1');
    expect(mockStorageUpdate).toHaveBeenCalledWith({ id: 'lump-deleted' });
  });

  it('opens and closes the fullscreen chart with orientation cleanup', async () => {
    const renderer = await renderOverpayments();
    const chartPreview = renderer.root.find(node => (
      String(node.type) === 'Pressable' && textContent(node).includes('overpayments.balanceChart')
    ));

    await act(async () => {
      chartPreview.props.onPress();
    });

    expect(mockUnlockAsync).toHaveBeenCalledTimes(1);

    const fullscreenModal = renderer.root.findAll(node => String(node.type) === 'Modal').find(node => node.props.supportedOrientations)!;

    await act(async () => {
      fullscreenModal.props.onRequestClose();
    });

    expect(mockLockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
  });

  it('opens chart help without opening the fullscreen chart', async () => {
    const renderer = await renderOverpayments();
    const helpButton = renderer.root.find(node => (
      String(node.type) === 'TouchableOpacity' && node.props.accessibilityLabel === 'chartHelp.open'
    ));
    const stopPropagation = jest.fn();

    await act(async () => {
      helpButton.props.onPress({ stopPropagation });
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(mockUnlockAsync).not.toHaveBeenCalled();
    expect(textContent(renderer.root)).toContain('chartHelp.balanceComparisonBody');
  });

  it('keeps the drawer impact card flat so the success panel has no bottom shadow', async () => {
    const { OverpaymentImpactCard } = await import('@/features/tracker/components/overpayments/OverpaymentSheetPrimitives');
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(React.createElement(OverpaymentImpactCard, {
        title: 'At this rate you could save',
        rows: [{ label: 'Interest saved', value: '£1,000.00' }],
      }));
    });

    const impactCard = (renderer as ReactTestRenderer).root.findAll(node => String(node.type) === 'View').find(node => {
      const style = node.props.style as Record<string, unknown> | undefined;
      return style?.borderWidth === 1 && style?.backgroundColor;
    })!;
    const style = impactCard.props.style as Record<string, unknown>;

    expect(style).not.toHaveProperty('shadowColor');
    expect(style).not.toHaveProperty('shadowOpacity');
    expect(style).not.toHaveProperty('shadowRadius');
    expect(style).not.toHaveProperty('elevation');
  });
});
