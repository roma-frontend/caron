// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore } from './compare';

type CompareItem = ReturnType<typeof useCompareStore.getState>['items'][number];

const item = (id: string): CompareItem => ({
  id,
  slug: `slug-${id}`,
  name: `Item ${id}`,
  price: 100,
  image: null,
  attributes: {},
});

beforeEach(() => {
  localStorage.clear();
  useCompareStore.setState({ items: [] });
});

describe('compare add', () => {
  it('adds items', () => {
    useCompareStore.getState().add(item('a'));
    expect(useCompareStore.getState().items).toHaveLength(1);
  });

  it('caps at 3 items', () => {
    useCompareStore.getState().add(item('a'));
    useCompareStore.getState().add(item('b'));
    useCompareStore.getState().add(item('c'));
    useCompareStore.getState().add(item('d'));
    expect(useCompareStore.getState().items).toHaveLength(3);
    expect(useCompareStore.getState().isInCompare('d')).toBe(false);
  });
});

describe('compare remove / clear', () => {
  it('removes by id', () => {
    useCompareStore.getState().add(item('a'));
    useCompareStore.getState().add(item('b'));
    useCompareStore.getState().remove('a');
    expect(useCompareStore.getState().items.map((i) => i.id)).toEqual(['b']);
  });

  it('clear empties the list', () => {
    useCompareStore.getState().add(item('a'));
    useCompareStore.getState().clear();
    expect(useCompareStore.getState().items).toHaveLength(0);
  });
});

describe('compare isInCompare', () => {
  it('reflects membership', () => {
    expect(useCompareStore.getState().isInCompare('a')).toBe(false);
    useCompareStore.getState().add(item('a'));
    expect(useCompareStore.getState().isInCompare('a')).toBe(true);
  });
});
