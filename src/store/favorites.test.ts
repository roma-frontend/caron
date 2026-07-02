// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useFavoritesStore, type FavoriteItem } from './favorites';

const fav = (over: Partial<FavoriteItem> = {}): FavoriteItem => ({
  id: 'f1',
  name: 'Filter',
  price: 200,
  image: null,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useFavoritesStore.setState({ items: [] });
});

describe('favorites toggle', () => {
  it('adds an item and stamps addedAt / priceAtAdd', () => {
    useFavoritesStore.getState().toggle(fav());
    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].priceAtAdd).toBe(200);
    expect(typeof items[0].addedAt).toBe('number');
  });

  it('removes an item when toggled again', () => {
    useFavoritesStore.getState().toggle(fav());
    useFavoritesStore.getState().toggle(fav());
    expect(useFavoritesStore.getState().items).toHaveLength(0);
  });

  it('dedupes by id (no duplicates)', () => {
    useFavoritesStore.getState().toggle(fav({ id: 'a' }));
    useFavoritesStore.getState().toggle(fav({ id: 'b' }));
    useFavoritesStore.getState().toggle(fav({ id: 'a' })); // removes a
    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('b');
  });
});

describe('favorites isFavorite / count', () => {
  it('isFavorite reflects membership', () => {
    expect(useFavoritesStore.getState().isFavorite('f1')).toBe(false);
    useFavoritesStore.getState().toggle(fav());
    expect(useFavoritesStore.getState().isFavorite('f1')).toBe(true);
  });

  it('count returns number of items', () => {
    useFavoritesStore.getState().toggle(fav({ id: 'a' }));
    useFavoritesStore.getState().toggle(fav({ id: 'b' }));
    expect(useFavoritesStore.getState().count()).toBe(2);
  });
});

describe('favorites getPriceDrop', () => {
  it('returns the positive drop when price fell', () => {
    useFavoritesStore.getState().toggle(fav({ id: 'a', price: 200 }));
    // simulate a later price decrease
    useFavoritesStore.setState((s) => ({
      items: s.items.map((i) => (i.id === 'a' ? { ...i, price: 150 } : i)),
    }));
    expect(useFavoritesStore.getState().getPriceDrop('a')).toBe(50);
  });

  it('returns null when price did not drop', () => {
    useFavoritesStore.getState().toggle(fav({ id: 'a', price: 200 }));
    expect(useFavoritesStore.getState().getPriceDrop('a')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(useFavoritesStore.getState().getPriceDrop('nope')).toBeNull();
  });
});
