// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockMutation, mockPush, mockToast, cartState } = vi.hoisted(() => ({
  mockMutation: vi.fn(),
  mockPush: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  cartState: {
    items: [{ id: 'p1', name: 'Widget', price: 1000, quantity: 2, image: '' }],
    clearCart: vi.fn(),
    loadItems: vi.fn(),
  },
}));

// All Convex queries return undefined (loading) — the checkout renders step 0 fine.
vi.mock('convex/react', () => ({
  useMutation: () => mockMutation,
  useQuery: () => undefined,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/store/cart', () => ({
  useCartStore: (selector: (s: typeof cartState) => unknown) => selector(cartState),
}));
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { user: null; sessionToken: null }) => unknown) => selector({ user: null, sessionToken: null }),
}));
vi.mock('@/hooks/useSettings', () => ({ useSettings: () => null }));
vi.mock('@/lib/i18n/admin', () => ({ useT: () => ({ t: (k: string) => k, lang: 'hy', setLang: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('@/components/LocalizedLink', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

import CheckoutPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  cartState.items = [{ id: 'p1', name: 'Widget', price: 1000, quantity: 2, image: '' }];
});
afterEach(() => cleanup());

const nextBtn = () => screen.getByRole('button', { name: /sc\.next/ });

describe('CheckoutPage', () => {
  it('shows the empty-cart state when there are no items', () => {
    cartState.items = [];
    render(<CheckoutPage />);
    expect(screen.getByText('sc.cartEmpty')).toBeInTheDocument();
  });

  it('renders the contact step with required fields', () => {
    render(<CheckoutPage />);
    expect(screen.getByText('sc.contactInfo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sc.fullName')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sc.yourEmail')).toBeInTheDocument();
  });

  it('blocks advancing when contact fields are empty', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    await user.click(nextBtn());
    expect(mockToast.error).toHaveBeenCalledWith('sc.fillNamePhoneEmail');
    // Still on the contact step (delivery step title not shown).
    expect(screen.queryByText('sc.shippingAddress')).not.toBeInTheDocument();
  });

  it('advances to the delivery step once contact info is filled', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    const inputs = screen.getAllByRole('textbox');
    // name, phone, email are the three textboxes on step 0.
    await user.type(screen.getByPlaceholderText('sc.fullName'), 'John');
    await user.type(screen.getByPlaceholderText('+374 XX XXX XXX'), '+37411223344');
    await user.type(screen.getByPlaceholderText('sc.yourEmail'), 'john@x.com');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    await user.click(nextBtn());
    await waitFor(() => expect(screen.getByText('sc.shippingAddress')).toBeInTheDocument());
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
