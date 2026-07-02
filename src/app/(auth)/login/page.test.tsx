// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- Mocks for the login page's heavy dependencies ---------------------------
const { mockLogin, mockSetSession, mockPush, mockSetAuthCookie, mockToast } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSetSession: vi.fn(),
  mockPush: vi.fn(),
  mockSetAuthCookie: vi.fn().mockResolvedValue(undefined),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('convex/react', () => ({
  useMutation: () => mockLogin,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { setSession: typeof mockSetSession }) => unknown) => selector({ setSession: mockSetSession }),
}));
vi.mock('@/actions/auth', () => ({ setAuthCookie: mockSetAuthCookie }));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('@/lib/i18n/admin', () => ({
  useT: () => ({ t: (k: string) => k, lang: 'hy', setLang: vi.fn() }),
}));
vi.mock('@/components/TelegramLoginButton', () => ({ TelegramLoginButton: () => null }));
vi.mock('@/components/LocalizedLink', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import LoginPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('auth.emailPlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('does not submit when fields are empty (shows a toast)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'auth.login' }));
    expect(mockToast.error).toHaveBeenCalledWith('auth.fillAllFields');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in and redirects on success', async () => {
    mockLogin.mockResolvedValueOnce({
      userId: 'u1', sessionToken: 'sess', name: 'Owner', email: 'o@x.com', role: 'superadmin',
    });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'o@x.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password1');
    await user.click(screen.getByRole('button', { name: 'auth.login' }));

    await waitFor(() => expect(mockSetSession).toHaveBeenCalled());
    expect(mockSetAuthCookie).toHaveBeenCalledWith('sess');
    expect(mockPush).toHaveBeenCalledWith('/admin');
  });

  it('reveals the 2FA code field when the server requires TOTP', async () => {
    mockLogin.mockRejectedValueOnce({ data: { code: 'TOTP_REQUIRED' } });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'mgr@x.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password1');
    await user.click(screen.getByRole('button', { name: 'auth.login' }));

    // The TOTP label appears on the second step.
    await waitFor(() => expect(screen.getByText('auth.totpLabel')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();

    // Entering a valid code and resubmitting logs in.
    mockLogin.mockResolvedValueOnce({ userId: 'u2', sessionToken: 's2', name: 'Mgr', email: 'mgr@x.com', role: 'manager' });
    await user.type(screen.getByPlaceholderText('123456'), '287082');
    await user.click(screen.getByRole('button', { name: 'auth.login' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin'));
  });

  it('shows an invalid-code error on TOTP_INVALID', async () => {
    mockLogin.mockRejectedValueOnce({ data: { code: 'TOTP_REQUIRED' } });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'mgr@x.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password1');
    await user.click(screen.getByRole('button', { name: 'auth.login' }));
    await waitFor(() => expect(screen.getByText('auth.totpLabel')).toBeInTheDocument());

    mockLogin.mockRejectedValueOnce({ data: { code: 'TOTP_INVALID' } });
    await user.type(screen.getByPlaceholderText('123456'), '000000');
    await user.click(screen.getByRole('button', { name: 'auth.login' }));
    await waitFor(() => expect(screen.getByText('auth.totpInvalid')).toBeInTheDocument());
  });
});
