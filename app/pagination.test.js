import { describe, expect, it } from 'vitest';
import { getPageSlice, getTotalPages } from './pagination.js';

describe('pagination', () => {
  it('calculates total pages with minimum of 1', () => {
    expect(getTotalPages(0, 10)).toBe(1);
    expect(getTotalPages(25, 10)).toBe(3);
  });

  it('returns sliced items and clamps current page', () => {
    const slice = getPageSlice(['a', 'b', 'c', 'd', 'e'], 99, 2);
    expect(slice.currentPage).toBe(3);
    expect(slice.totalPages).toBe(3);
    expect(slice.items).toEqual(['e']);
  });

  it('supports first page slicing', () => {
    const slice = getPageSlice([1, 2, 3, 4], 1, 2);
    expect(slice.currentPage).toBe(1);
    expect(slice.items).toEqual([1, 2]);
  });
});
