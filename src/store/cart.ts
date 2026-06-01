import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  lastRemoved: CartItem | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  undoRemove: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastRemoved: null,
      loadItems: (items) => set({ items, lastRemoved: null }),
      addItem: (item) => set((state) => {
        const existing = state.items.find((i) => i.id === item.id);
        if (existing) {
          return { items: state.items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),
      removeItem: (id) => set((state) => ({
        lastRemoved: state.items.find((i) => i.id === id) ?? null,
        items: state.items.filter((i) => i.id !== id),
      })),
      undoRemove: () => set((state) => {
        if (!state.lastRemoved) return state;
        return {
          items: [...state.items, state.lastRemoved],
          lastRemoved: null,
        };
      }),
      updateQuantity: (id, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => i.id === id ? { ...i, quantity } : i),
      })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      totalItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPriceValue: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'cart-storage' },
  ),
);
