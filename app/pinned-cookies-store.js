// @ts-check

const DEFAULT_STORAGE_KEY = 'pinnedCookies';

/**
 * @param {string} [storageKey]
 * @returns {Record<string, boolean>}
 */
export function loadPinnedCookiesFromStorage(storageKey = DEFAULT_STORAGE_KEY) {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading pinned cookies:', error);
    return {};
  }
}

/**
 * @param {Record<string, boolean>} pinnedCookies
 * @param {string} [storageKey]
 */
export function savePinnedCookiesToStorage(pinnedCookies, storageKey = DEFAULT_STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pinnedCookies));
  } catch (error) {
    console.error('Error saving pinned cookies:', error);
  }
}
