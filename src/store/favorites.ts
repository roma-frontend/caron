import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

interface FavoritesState {
  items: FavoriteItem[];
  toggle: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  count: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => set((state) => {
        const exists = state.items.some((i) => i.id === item.id);
        return { items: exists ? state.items.filter((i) => i.id !== item.id) : [...state.items, item] };
      }),
      isFavorite: (id) => get().items.some((i) => i.id === id),
      count: () => get().items.length,
    }),
    { name: 'favorites-storage' },
  ),
);
