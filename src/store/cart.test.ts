// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, type CartItem } from './cart';

const base = (over: Partial<Omit<CartItem, 'quantity'>> = {}): Omit<CartItem, 'quantity'> => ({
  id: 'p1',
  name: 'Brake Pad',
  price: 100,
  image: null,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastRemoved: null, selectedIds: [] });
});

describe('cart addItem', () => {
  it('adds a new item with quantity = qtyStep (default 1)', () => {
    useCartStore.getState().addItem(base());
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it('uses qtyStep as the initial quantity for a new item', () => {
    useCartStore.getState().addItem(base({ id: 'p2', qtyStep: 5 }));
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('increments existing item by qtyStep', () => {
    useCartStore.getState().addItem(base({ qtyStep: 2 }));
    useCartStore.getState().addItem(base({ qtyStep: 2 }));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(4);
  });

  it('clamps increment to maxStock', () => {
    useCartStore.getState().addItem(base({ maxStock: 3, qtyStep: 2 }));
    useCartStore.getState().addItem(base({ maxStock: 3, qtyStep: 2 }));
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('keeps distinct items separate', () => {
    useCartStore.getState().addItem(base({ id: 'a' }));
    useCartStore.getState().addItem(base({ id: 'b' }));
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe('cart removeItem / undoRemove', () => {
  it('removes an item and stores it as lastRemoved', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().removeItem('p1');
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().lastRemoved?.id).toBe('p1');
  });

  it('undoRemove restores the last removed item', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().removeItem('p1');
    useCartStore.getState().undoRemove();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().lastRemoved).toBeNull();
  });

  it('undoRemove is a no-op when nothing was removed', () => {
    useCartStore.getState().undoRemove();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removeItem for missing id sets lastRemoved to null', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().removeItem('missing');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().lastRemoved).toBeNull();
  });
});

describe('cart updateQuantity', () => {
  it('updates quantity for an item', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().updateQuantity('p1', 7);
    expect(useCartStore.getState().items[0].quantity).toBe(7);
  });

  it('removes the item when quantity <= 0', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().updateQuantity('p1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes the item on negative quantity', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().updateQuantity('p1', -3);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('cart clearCart / loadItems / setSelectedIds', () => {
  it('clearCart empties items', () => {
    useCartStore.getState().addItem(base());
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('loadItems replaces items and resets lastRemoved', () => {
    const preset: CartItem[] = [
      { id: 'x', name: 'X', price: 10, image: null, quantity: 2 },
    ];
    useCartStore.getState().loadItems(preset);
    expect(useCartStore.getState().items).toEqual(preset);
    expect(useCartStore.getState().lastRemoved).toBeNull();
  });

  it('setSelectedIds updates selection', () => {
    useCartStore.getState().setSelectedIds(['a', 'b']);
    expect(useCartStore.getState().selectedIds).toEqual(['a', 'b']);
  });
});

describe('cart computed totals', () => {
  beforeEach(() => {
    useCartStore.getState().loadItems([
      { id: 'a', name: 'A', price: 100, image: null, quantity: 2 },
      { id: 'b', name: 'B', price: 50, image: null, quantity: 3 },
    ]);
  });

  it('totalItems / totalItemCount sum quantities', () => {
    expect(useCartStore.getState().totalItems()).toBe(5);
    expect(useCartStore.getState().totalItemCount()).toBe(5);
  });

  it('totalPrice / totalPriceValue sum price * quantity', () => {
    expect(useCartStore.getState().totalPrice()).toBe(350);
    expect(useCartStore.getState().totalPriceValue()).toBe(350);
  });

  it('totals are zero for an empty cart', () => {
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });
});
