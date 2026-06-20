import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: { MortgageIcon: 'MortgageIcon' },
}));

jest.mock('@/features/tracker/components/editing/LoanPurposePicker', () => ({
  LoanPurposeIcon: (props: Record<string, unknown>) => React.createElement('LoanPurposeIcon', props),
}));

const renderTag = async (props: Record<string, unknown>): Promise<ReactTestRenderer> => {
  const { LoanCategoryTag } = await import('@/features/tracker/components/LoanCategoryTag');
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(LoanCategoryTag, props as never));
  });

  return renderer as ReactTestRenderer;
};

const findHost = (renderer: ReactTestRenderer, type: string): ReactTestInstance => (
  renderer.root.find(node => String(node.type) === type)
);

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
});

describe('LoanCategoryTag', () => {
  it('matches the summary glyph to the text size and centres it vertically', async () => {
    const renderer = await renderTag({
      loan: { category: 'mortgage' },
      lender: 'LoanBee Bank',
      variant: 'bodySm',
    });

    const row = findHost(renderer, 'View');
    const icon = findHost(renderer, 'Icon');
    const label = findHost(renderer, 'AppText');

    expect(row.props.style[0]).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });
    expect(icon.props).toMatchObject({
      icon: 'MortgageIcon',
      size: 13,
    });
    expect(label.props.variant).toBe('bodySm');
    expect(label.children.join('')).toBe('saved.category.mortgage · LoanBee Bank');
  });

  it('can render a text-only category for list badges that already have an icon tile', async () => {
    const renderer = await renderTag({
      loan: { category: 'loan', loanPurpose: 'car' },
      showIcon: false,
    });

    expect(renderer.root.findAll(node => String(node.type) === 'Icon')).toHaveLength(0);
    expect(renderer.root.findAll(node => String(node.type) === 'LoanPurposeIcon')).toHaveLength(0);
    expect(findHost(renderer, 'AppText').children.join('')).toBe('loanPurpose.car');
  });

  it('uses the selected text variant size for purpose icons', async () => {
    const renderer = await renderTag({
      loan: { category: 'loan', loanPurpose: 'car' },
      variant: 'bodyLg',
    });

    expect(findHost(renderer, 'LoanPurposeIcon').props.size).toBe(16);
  });
});
