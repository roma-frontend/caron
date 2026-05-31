import { create } from 'zustand';

interface OrderNotificationState {
  pendingCount: number;
  flash: boolean;
  setPendingCount: (count: number) => void;
  setFlash: (flash: boolean) => void;
}

export const useOrderNotificationStore = create<OrderNotificationState>((set) => ({
  pendingCount: 0,
  flash: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setFlash: (flash) => set({ flash }),
}));
