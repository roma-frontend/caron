// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentlyViewedStore } from './recentlyViewed';

type ViewedItem = ReturnType<typeof useRecentlyViewedStore.getState>['items'][number];

const item = (id: string): ViewedItem => ({
  id,
  slug: `slug-${id}`,
  name: `Item ${id}`,
  price: 100,
  image: null,
});

beforeEach(() => {
  localStorage.clear();
  useRecentlyViewedStore.setState({ items: [] });
});

describe('recentlyViewed add', () => {
  it('prepends the newest item', () => {
    useRecentlyViewedStore.getState().add(item('a'));
    useRecentlyViewedStore.getState().add(item('b'));
    expect(useRecentlyViewedStore.getState().items.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('dedupes and moves an existing item to the front', () => {
    useRecentlyViewedStore.getState().add(item('a'));
    useRecentlyViewedStore.getState().add(item('b'));
    useRecentlyViewedStore.getState().add(item('a'));
    expect(useRecentlyViewedStore.getState().items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('caps the list at 12 items', () => {
    for (let i = 0; i < 15; i++) {
      useRecentlyViewedStore.getState().add(item(`id-${i}`));
    }
    const items = useRecentlyViewedStore.getState().items;
    expect(items).toHaveLength(12);
    // newest first: id-14 ... id-3
    expect(items[0].id).toBe('id-14');
    expect(items[11].id).toBe('id-3');
  });
});
