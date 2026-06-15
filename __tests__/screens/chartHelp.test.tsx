import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Modal: ({ children, visible, ...props }: { children?: React.ReactNode; visible?: boolean }) => (
      React.createElement('Modal', { ...props, visible }, visible ? children : null)
    ),
    Pressable: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('Pressable', props, children)
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));


jest.mock('../../src/components/ui/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

import { ChartHelpButton, ChartHelpDrawer } from '../../src/components/charts/ChartHelp';

const textContent = (node: unknown): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return (node as { children?: unknown[] }).children?.map(textContent).join('') ?? '';
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
});

describe('ChartHelp', () => {
  it('stops chart-card propagation before opening help', async () => {
    const onPress = jest.fn();
    const stopPropagation = jest.fn();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(React.createElement(ChartHelpButton, {
        accessibilityLabel: 'About chart',
        onPress,
      }));
    });

    const button = (renderer as ReactTestRenderer).root.find(node => String(node.type) === 'TouchableOpacity');
    button.props.onPress({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders drawer content and wires the close action', async () => {
    const onClose = jest.fn();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(React.createElement(ChartHelpDrawer, {
        visible: true,
        content: { title: 'Balance over time', body: 'Shows the remaining balance.' },
        closeLabel: 'Close',
        onClose,
      }));
    });

    expect(textContent((renderer as ReactTestRenderer).root)).toContain('Balance over time');
    expect(textContent((renderer as ReactTestRenderer).root)).toContain('Shows the remaining balance.');

    const closeButton = (renderer as ReactTestRenderer).root.findAll(node => (
      String(node.type) === 'TouchableOpacity' && node.props.accessibilityLabel === 'Close'
    ))[0];
    closeButton.props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
