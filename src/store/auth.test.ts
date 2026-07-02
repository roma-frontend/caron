// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

type AuthUser = NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;

const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  name: 'Alice',
  email: 'alice@caron.group',
  role: 'customer',
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ sessionToken: null, user: null, impersonator: null });
});

describe('auth setSession', () => {
  it('sets token and user', () => {
    useAuthStore.getState().setSession('tok-123', user());
    expect(useAuthStore.getState().sessionToken).toBe('tok-123');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});

describe('auth patchUser', () => {
  it('merges fields into the current user', () => {
    useAuthStore.getState().setSession('tok', user());
    useAuthStore.getState().patchUser({ name: 'Bob', discountPercent: 10 });
    expect(useAuthStore.getState().user?.name).toBe('Bob');
    expect(useAuthStore.getState().user?.discountPercent).toBe(10);
    expect(useAuthStore.getState().user?.email).toBe('alice@caron.group');
  });

  it('is a no-op when there is no user', () => {
    useAuthStore.getState().patchUser({ name: 'Nobody' });
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('auth logout', () => {
  it('resets token, user and impersonator', () => {
    useAuthStore.getState().setSession('tok', user());
    useAuthStore.setState({ impersonator: { sessionToken: 't', user: user() } });
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.sessionToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.impersonator).toBeNull();
  });
});

describe('auth impersonation', () => {
  it('startImpersonation saves current session and switches', () => {
    const admin = user({ id: 'admin', role: 'superadmin' });
    useAuthStore.getState().setSession('admin-tok', admin);
    const target = user({ id: 'target' });
    useAuthStore.getState().startImpersonation('target-tok', target);
    const s = useAuthStore.getState();
    expect(s.sessionToken).toBe('target-tok');
    expect(s.user?.id).toBe('target');
    expect(s.impersonator?.user.id).toBe('admin');
  });

  it('startImpersonation is a no-op with no active session', () => {
    useAuthStore.getState().startImpersonation('target-tok', user({ id: 'target' }));
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useAuthStore.getState().impersonator).toBeNull();
  });

  it('stopImpersonation restores the saved session', () => {
    const admin = user({ id: 'admin', role: 'superadmin' });
    useAuthStore.getState().setSession('admin-tok', admin);
    useAuthStore.getState().startImpersonation('target-tok', user({ id: 'target' }));
    useAuthStore.getState().stopImpersonation();
    const s = useAuthStore.getState();
    expect(s.sessionToken).toBe('admin-tok');
    expect(s.user?.id).toBe('admin');
    expect(s.impersonator).toBeNull();
  });

  it('stopImpersonation is a no-op when not impersonating', () => {
    useAuthStore.getState().setSession('tok', user());
    useAuthStore.getState().stopImpersonation();
    expect(useAuthStore.getState().sessionToken).toBe('tok');
  });
});

describe('auth setHasHydrated', () => {
  it('sets the hydration flag', () => {
    useAuthStore.getState().setHasHydrated(true);
    expect(useAuthStore.getState()._hasHydrated).toBe(true);
  });
});
