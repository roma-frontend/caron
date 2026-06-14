import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  sessionToken: string | null;
  user: { id: string; name: string; email: string; role: string; customerType?: string; discountPercent?: number; phone?: string } | null;
  setSession: (token: string, user: { id: string; name: string; email: string; role: string; customerType?: string; discountPercent?: number; phone?: string }) => void;
  logout: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      sessionToken: null,
      user: null,
      _hasHydrated: false,
      setSession: (token, user) => set({ sessionToken: token, user }),
      logout: () => set({ sessionToken: null, user: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ user: state.user, sessionToken: state.sessionToken }),
    },
  ),
);

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return { user, sessionToken, hydrated };
}
