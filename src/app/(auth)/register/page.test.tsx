// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockRegister, mockLogin, mockSetSession, mockPush, mockSetAuthCookie, mockToast } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockLogin: vi.fn(),
  mockSetSession: vi.fn(),
  mockPush: vi.fn(),
  mockSetAuthCookie: vi.fn().mockResolvedValue(undefined),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('convex/react', () => ({
  useAction: () => mockRegister,
  useMutation: () => mockLogin,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { setSession: typeof mockSetSession }) => unknown) => selector({ setSession: mockSetSession }),
}));
vi.mock('@/actions/auth', () => ({ setAuthCookie: mockSetAuthCookie }));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('@/lib/i18n/admin', () => ({ useT: () => ({ t: (k: string) => k, lang: 'hy', setLang: vi.fn() }) }));
vi.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ enableRegistration: true }) }));
vi.mock('@/lib/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));
vi.mock('@/components/shared/Turnstile', () => ({ Turnstile: () => null, turnstileEnabled: () => false }));
vi.mock('@/components/TelegramLoginButton', () => ({ TelegramLoginButton: () => null }));
vi.mock('@/components/LocalizedLink', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/components/layout/Logo', () => ({ Logo: () => null }));

import RegisterPage from './page';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const next = () => screen.getByRole('button', { name: /auth\.wizard\.next/ });

describe('RegisterPage wizard', () => {
  it('blocks step 1 when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(next());
    expect(mockToast.error).toHaveBeenCalledWith('auth.fillRequiredFields');
  });

  it('rejects an email that fails the stricter check (a@b)', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText('auth.namePlaceholder'), 'John');
    // 'a@b' passes the native type=email check but fails the app's EMAIL_RE (needs a dot).
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'a@b');
    await user.click(next());
    expect(mockToast.error).toHaveBeenCalledWith('auth.wizard.emailInvalid');
    expect(screen.queryByPlaceholderText('auth.passwordPlaceholderMin')).not.toBeInTheDocument();
  });

  it('advances to the password step and enforces matching passwords', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText('auth.namePlaceholder'), 'John');
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'john@x.com');
    await user.click(next());

    // Now on password step.
    const pw = await screen.findByPlaceholderText('auth.passwordPlaceholderMin');
    await user.type(pw, 'Str0ng!pass');
    await user.type(screen.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'different');
    await user.click(next());
    expect(mockToast.error).toHaveBeenCalledWith('auth.passwordsMismatch');
  });

  it('shows a strong password rating', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByPlaceholderText('auth.namePlaceholder'), 'John');
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'john@x.com');
    await user.click(next());
    await user.type(await screen.findByPlaceholderText('auth.passwordPlaceholderMin'), 'Str0ng!passX');
    expect(screen.getByText(/auth\.pw\.strong/)).toBeInTheDocument();
  });

  it('registers and redirects to the dashboard on the final step', async () => {
    mockRegister.mockResolvedValueOnce({ userId: 'u1', sessionToken: 'sess', name: 'John', email: 'john@x.com', role: 'customer' });
    const user = userEvent.setup();
    render(<RegisterPage />);
    // Step 0
    await user.type(screen.getByPlaceholderText('auth.namePlaceholder'), 'John');
    await user.type(screen.getByPlaceholderText('auth.emailPlaceholder'), 'john@x.com');
    await user.click(next());
    // Step 1
    await user.type(await screen.findByPlaceholderText('auth.passwordPlaceholderMin'), 'goodpass1');
    await user.type(screen.getByPlaceholderText('auth.confirmPasswordPlaceholder'), 'goodpass1');
    await user.click(next());
    // Step 2 → submit
    const submit = await screen.findByRole('button', { name: /auth\.register/ });
    await user.click(submit);

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    expect(mockSetSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
