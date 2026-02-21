// @ts-check

/**
 * @param {unknown} responseData
 * @returns {{ key: string; value: string }[]}
 */
export function normalizeStorageEntries(responseData) {
  if (!responseData || typeof responseData !== 'object') {
    return [];
  }

  const candidate = /** @type {{ items?: unknown }} */ (responseData);
  if (!Array.isArray(candidate.items)) {
    return [];
  }

  return candidate.items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const entry = /** @type {{ key?: unknown; value?: unknown }} */ (item);
      return {
        key: typeof entry.key === 'string' ? entry.key : '',
        value: typeof entry.value === 'string' ? entry.value : String(entry.value ?? '')
      };
    })
    .filter((item) => item.key);
}

/**
 * @param {{ key: string; value: string }[]} entries
 * @returns {{ key: string; value: string }[]}
 */
export function sortStorageEntries(entries) {
  return [...entries].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * @param {{ key: string; value: string }[]} entries
 * @param {Record<string, boolean>} pinnedEntries
 * @param {(entry: { key: string; value: string }) => string} getPinKey
 * @returns {{ key: string; value: string }[]}
 */
export function sortStorageEntriesByPinned(entries, pinnedEntries, getPinKey) {
  return [...entries].sort((a, b) => {
    const aPinned = Boolean(pinnedEntries[getPinKey(a)]);
    const bPinned = Boolean(pinnedEntries[getPinKey(b)]);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    return a.key.localeCompare(b.key);
  });
}

/**
 * @param {{ key: string; value: string }[]} entries
 * @param {string} searchTerm
 * @returns {{ key: string; value: string }[]}
 */
export function filterStorageEntries(entries, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return [...entries];
  }

  return entries.filter((entry) => {
    return (
      entry.key.toLowerCase().includes(normalizedSearch) ||
      entry.value.toLowerCase().includes(normalizedSearch)
    );
  });
}

/**
 * Groups storage keys by namespace prefix.
 * Example: `auth.token` and `auth.refresh` go into group `auth`.
 *
 * @param {{ key: string; value: string }[]} entries
 * @returns {Record<string, { key: string; value: string }[]>}
 */
export function groupStorageEntriesByNamespace(entries) {
  return entries.reduce((acc, entry) => {
    const namespace = extractNamespace(entry.key);
    if (!acc[namespace]) {
      acc[namespace] = [];
    }

    acc[namespace].push(entry);
    return acc;
  }, /** @type {Record<string, { key: string; value: string }[]>} */ ({}));
}

/**
 * @param {string} key
 * @returns {string}
 */
function extractNamespace(key) {
  if (!key) {
    return 'root';
  }

  if (key.includes(':')) {
    return key.split(':')[0] || 'root';
  }

  if (key.includes('.')) {
    return key.split('.')[0] || 'root';
  }

  return 'root';
}
