import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let observed: string | undefined;

const Harness = ({ value, delay }: { value: string; delay: number }) => {
  observed = useDebouncedValue(value, delay);
  return null;
};

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    observed = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<Harness value="a" delay={400} />);
    });
    expect(observed).toBe('a');
    act(() => renderer.unmount());
  });

  it('delays updates until the debounce window elapses', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<Harness value="a" delay={400} />);
    });

    act(() => {
      renderer.update(<Harness value="b" delay={400} />);
    });
    // Not yet committed — still within the debounce window.
    expect(observed).toBe('a');

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(observed).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(observed).toBe('b');

    act(() => renderer.unmount());
  });

  it('coalesces rapid changes into the final value', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<Harness value="a" delay={400} />);
    });

    act(() => {
      renderer.update(<Harness value="ab" delay={400} />);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // Second change resets the timer before the first window elapses.
    act(() => {
      renderer.update(<Harness value="abc" delay={400} />);
    });
    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(observed).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(observed).toBe('abc');

    act(() => renderer.unmount());
  });
});
