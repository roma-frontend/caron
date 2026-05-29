import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  attributes: Record<string, string>;
}

interface CompareState {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  isInCompare: (id: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => set((s) => s.items.length >= 3 ? s : { items: [...s.items, item] }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      isInCompare: (id) => get().items.some((i) => i.id === id),
    }),
    { name: 'compare-storage' },
  ),
);
