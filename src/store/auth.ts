import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthUser { id: string; name: string; email: string; role: string; customerType?: string; discountPercent?: number; phone?: string; telegramUsername?: string }

interface AuthState {
  sessionToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  /** Merge fresh fields into the current user (e.g. when the server profile changes). */
  patchUser: (patch: Partial<NonNullable<AuthState['user']>>) => void;
  logout: () => void;
  /** Original superadmin session saved while impersonating another user. */
  impersonator: { sessionToken: string; user: AuthUser } | null;
  startImpersonation: (token: string, user: AuthUser) => void;
  stopImpersonation: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      user: null,
      impersonator: null,
      _hasHydrated: false,
      setSession: (token, user) => set({ sessionToken: token, user }),
      patchUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => set({ sessionToken: null, user: null, impersonator: null }),
      // Save the current (superadmin) session, then switch to the target's.
      startImpersonation: (token, user) => {
        const cur = get();
        if (!cur.sessionToken || !cur.user) return;
        set({ impersonator: { sessionToken: cur.sessionToken, user: cur.user }, sessionToken: token, user });
      },
      // Restore the saved superadmin session.
      stopImpersonation: () => {
        const imp = get().impersonator;
        if (!imp) return;
        set({ sessionToken: imp.sessionToken, user: imp.user, impersonator: null });
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ user: state.user, sessionToken: state.sessionToken, impersonator: state.impersonator }),
    },
  ),
);

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return { user, sessionToken, hydrated };
}
