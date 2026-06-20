import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  const ReactLocal = require('react');

  return {
    StyleSheet: { create: (styles: unknown) => styles },
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      ReactLocal.createElement('TouchableOpacity', props, children)
    ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@oskarfigura/ui-native', () => {
  const ReactLocal = require('react');

  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
      ReactLocal.createElement('AppText', props, children)
    ),
  };
});

jest.mock('@/shared/ui/theme', () => ({
  colours: new Proxy({}, { get: (_target, prop) => String(prop) }),
  radii: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const renderButton = async (
  props: { onPress: () => void; isExporting: boolean },
): Promise<ReactTestRenderer> => {
  const { ExportCsvButton } = await import('@/shared/ui/components/ExportCsvButton');
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(ExportCsvButton, props));
  });

  return renderer as ReactTestRenderer;
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('ExportCsvButton', () => {
  it('shows the export label and fires onPress when idle', async () => {
    const onPress = jest.fn();
    const renderer = await renderButton({ onPress, isExporting: false });
    const button = renderer.root.find(node => String(node.type) === 'TouchableOpacity');

    expect(textContent(button)).toContain('results.exportCsv');
    expect(button.props.disabled).toBe(false);

    act(() => {
      button.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the exporting label and is disabled while a CSV export is in flight', async () => {
    const renderer = await renderButton({ onPress: jest.fn(), isExporting: true });
    const button = renderer.root.find(node => String(node.type) === 'TouchableOpacity');

    expect(textContent(button)).toContain('results.exportingCsv');
    expect(button.props.disabled).toBe(true);
  });

  // The tracked-schedule card is rendered behind a staged requestIdleCallback pipeline,
  // so assert the wiring at the source level (mirrors the existing convention in
  // savedDetailShare.test.tsx) to confirm the ad-gated export reaches all three surfaces.
  it('is wired into the saved-mortgage schedule and the calculator schedule', () => {
    const mortgage = readFileSync(
      join(process.cwd(), 'src/features/tracker/components/detail/MortgageDetailView/index.tsx'),
      'utf8',
    );
    const calculator = readFileSync(
      join(process.cwd(), 'src/features/calculator/components/LoanCalculationView.tsx'),
      'utf8',
    );

    expect(mortgage).toContain('<ExportCsvButton');
    expect(mortgage).toContain('onPress={handleExportSchedule}');
    expect(calculator).toContain('<ExportCsvButton');
    expect(calculator).toContain('onPress={handleExportCsv}');
  });
});
