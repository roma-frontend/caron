import { create } from 'zustand';

interface BuyBarState {
  /**
   * True while the product-detail sticky buy-bar occupies the bottom edge.
   * The mobile tab bar reads this and steps aside so the two fixed bottom
   * bars never overlap (e.g. the tab bar's floating action button peeking
   * above the shorter buy-bar).
   */
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const useBuyBarStore = create<BuyBarState>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible }),
}));
