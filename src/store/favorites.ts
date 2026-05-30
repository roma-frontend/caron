import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  addedAt?: number;
  priceAtAdd?: number;
}

interface FavoritesState {
  items: FavoriteItem[];
  toggle: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  count: () => number;
  getPriceDrop: (id: string) => number | null;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => set((state) => {
        const exists = state.items.some((i) => i.id === item.id);
        if (exists) {
          return { items: state.items.filter((i) => i.id !== item.id) };
        }
        return {
          items: [...state.items, {
            ...item,
            addedAt: Date.now(),
            priceAtAdd: item.price,
          }],
        };
      }),
      isFavorite: (id: string) => get().items.some((i) => i.id === id),
      count: () => get().items.length,
      getPriceDrop: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || !item.priceAtAdd) return null;
        const drop = item.priceAtAdd - item.price;
        return drop > 0 ? drop : null;
      },
    }),
    { name: 'favorites-storage' },
  ),
);
