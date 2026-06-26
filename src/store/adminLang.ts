import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AdminLang = 'hy' | 'ru' | 'en';

interface AdminLangState {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
}

/**
 * Admin UI language. Persisted to localStorage and consumed via `useAdminT`.
 * Independent from the public storefront (which stays Armenian); this only
 * controls the admin panel chrome.
 */
export const useAdminLangStore = create<AdminLangState>()(
  persist(
    (set) => ({
      lang: 'hy',
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'admin-lang',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
