import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

interface RecentlyViewedState {
  items: ViewedItem[];
  add: (item: ViewedItem) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((state) => {
        const filtered = state.items.filter((i) => i.id !== item.id);
        return { items: [item, ...filtered].slice(0, 12) };
      }),
    }),
    { name: 'recently-viewed' },
  ),
);
