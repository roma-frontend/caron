import { create } from 'zustand';

interface OrderNotificationState {
  pendingCount: number;
  flash: boolean;
  returnsPendingCount: number;
  returnsFlash: boolean;
  setPendingCount: (count: number) => void;
  setFlash: (flash: boolean) => void;
  setReturnsPendingCount: (count: number) => void;
  setReturnsFlash: (flash: boolean) => void;
}

export const useOrderNotificationStore = create<OrderNotificationState>((set) => ({
  pendingCount: 0,
  flash: false,
  returnsPendingCount: 0,
  returnsFlash: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setFlash: (flash) => set({ flash }),
  setReturnsPendingCount: (count) => set({ returnsPendingCount: count }),
  setReturnsFlash: (flash) => set({ returnsFlash: flash }),
}));
