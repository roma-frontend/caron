import { describe, it, expect, vi } from 'vitest';
import type React from 'react';
import { cn, numericInputProps } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional/falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

/** Build a minimal mock keyboard event with a spy on preventDefault. */
function makeEvent(key: string, value = '') {
  const preventDefault = vi.fn();
  const ev = {
    key,
    preventDefault,
    currentTarget: { value },
  } as unknown as React.KeyboardEvent<HTMLInputElement>;
  return { ev, preventDefault };
}

describe('numericInputProps', () => {
  it('returns text/decimal input props', () => {
    const props = numericInputProps();
    expect(props.type).toBe('text');
    expect(props.inputMode).toBe('decimal');
    expect(typeof props.onKeyDown).toBe('function');
  });

  it('allows digit keys', () => {
    const props = numericInputProps();
    const { ev, preventDefault } = makeEvent('5');
    props.onKeyDown(ev);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('allows navigation/control keys', () => {
    const props = numericInputProps();
    for (const key of ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End']) {
      const { ev, preventDefault } = makeEvent(key);
      props.onKeyDown(ev);
      expect(preventDefault).not.toHaveBeenCalled();
    }
  });

  it('blocks non-digit keys', () => {
    const props = numericInputProps();
    const { ev, preventDefault } = makeEvent('a');
    props.onKeyDown(ev);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('allows a single decimal point when none present', () => {
    const props = numericInputProps(true);
    const { ev, preventDefault } = makeEvent('.', '12');
    props.onKeyDown(ev);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('blocks a second decimal point', () => {
    const props = numericInputProps(true);
    const { ev, preventDefault } = makeEvent('.', '12.3');
    props.onKeyDown(ev);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('blocks the decimal point when decimals disallowed', () => {
    const props = numericInputProps(false);
    const { ev, preventDefault } = makeEvent('.', '12');
    props.onKeyDown(ev);
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
