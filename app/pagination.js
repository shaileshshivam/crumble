// @ts-check

/**
 * @param {number} itemCount
 * @param {number} itemsPerPage
 * @returns {number}
 */
export function getTotalPages(itemCount, itemsPerPage) {
  const safePageSize = Math.max(1, itemsPerPage);
  return Math.max(1, Math.ceil(itemCount / safePageSize));
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} currentPage
 * @param {number} itemsPerPage
 * @returns {{ currentPage: number; totalPages: number; items: T[] }}
 */
export function getPageSlice(items, currentPage, itemsPerPage) {
  const totalPages = getTotalPages(items.length, itemsPerPage);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);

  return {
    currentPage: safePage,
    totalPages,
    items: items.slice(startIndex, endIndex)
  };
}
