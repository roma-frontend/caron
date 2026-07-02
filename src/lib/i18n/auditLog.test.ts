import { describe, it, expect } from 'vitest';
import { auditActionLabel, auditText } from './auditLog';

// Stub translator: returns the key unchanged. This lets us assert that the
// dynamic parts (quoted target name, capability, status) are extracted and
// composed correctly, independent of the actual translations.
const t = (key: string) => key;

describe('auditActionLabel', () => {
  it('falls back to the raw action code for unknown actions', () => {
    expect(auditActionLabel('totally.unknown', t)).toBe('totally.unknown');
  });
});

describe('auditText', () => {
  it('extracts the quoted target name for impersonation', () => {
    const text = auditText({ action: 'user.impersonate', summary: 'Started impersonating "Ivan Petrov" (ivan@x.com)' }, t);
    expect(text).toContain('«Ivan Petrov»');
  });

  it('renders capability + role from meta for access.setCapability', () => {
    const text = auditText({
      action: 'access.setCapability',
      summary: 'Disabled "trash" for manager',
      meta: JSON.stringify({ enabled: false, capability: 'trash', role: 'manager' }),
    }, t);
    expect(text).toContain('trash');
    expect(text).toContain('ac.roleManager');
  });

  it('renders order status transition from meta', () => {
    const text = auditText({
      action: 'order.updateStatus',
      summary: 'Order #123: pending→shipped',
      meta: JSON.stringify({ prevStatus: 'pending', nextStatus: 'shipped' }),
    }, t);
    expect(text).toContain('pending');
    expect(text).toContain('shipped');
  });

  it('falls back to the stored summary for unknown actions', () => {
    const text = auditText({ action: 'weird.thing', summary: 'Some raw summary' }, t);
    expect(text).toBe('Some raw summary');
  });

  it('tolerates malformed meta JSON', () => {
    const text = auditText({ action: 'order.bulkAction', summary: 'x', meta: '{not json' }, t);
    expect(typeof text).toBe('string');
  });
});
