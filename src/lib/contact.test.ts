import { describe, it, expect } from 'vitest';
import { isPlaceholderEmail, displayEmail, contactLabel } from './contact';

describe('isPlaceholderEmail', () => {
  it('detects the Telegram placeholder', () => {
    expect(isPlaceholderEmail('tg_123@telegram.local')).toBe(true);
    expect(isPlaceholderEmail('real@caron.group')).toBe(false);
    expect(isPlaceholderEmail(undefined)).toBe(false);
  });
});

describe('displayEmail', () => {
  it('hides the placeholder, keeps real emails', () => {
    expect(displayEmail('tg_1@telegram.local')).toBe('');
    expect(displayEmail('real@caron.group')).toBe('real@caron.group');
    expect(displayEmail(null)).toBe('');
  });
});

describe('contactLabel', () => {
  it('shows @username for Telegram placeholder accounts', () => {
    expect(contactLabel('tg_1@telegram.local', 'i_amVip')).toBe('@i_amVip');
  });
  it('falls back to Telegram when no handle', () => {
    expect(contactLabel('tg_1@telegram.local', undefined)).toBe('Telegram');
  });
  it('shows the real email otherwise', () => {
    expect(contactLabel('real@caron.group', 'ignored')).toBe('real@caron.group');
  });
});
