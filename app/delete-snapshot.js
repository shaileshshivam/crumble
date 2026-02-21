// @ts-check

import { deriveCookieUrl, getCookieStorageKey } from './cookie-data.js';
import { mapCookiesForExport } from './cookie-transfer.js';

export const DELETE_SNAPSHOT_STORAGE_KEY = 'cookieSnatcher.lastDeleteSnapshot';
export const DELETE_SNAPSHOT_KIND = 'cookie-snatcher-delete-snapshot';
export const DELETE_SNAPSHOT_VERSION = 1;

/**
 * @param {chrome.cookies.Cookie[]} cookies
 * @param {string} reason
 * @param {string} [createdAt]
 */
export function createDeleteSnapshot(cookies, reason, createdAt = new Date().toISOString()) {
  return {
    kind: DELETE_SNAPSHOT_KIND,
    version: DELETE_SNAPSHOT_VERSION,
    reason,
    createdAt,
    count: cookies.length,
    cookies: mapCookiesForExport(cookies)
  };
}

/**
 * @param {unknown} value
 * @returns {value is {
 *   kind: string;
 *   version: number;
 *   reason: string;
 *   createdAt: string;
 *   count: number;
 *   cookies: Array<{
 *     name: string;
 *     value: string;
 *     domain: string;
 *     path?: string;
 *     secure?: boolean;
 *     httpOnly?: boolean;
 *     sameSite?: string | null;
 *     expirationDate?: number;
 *     storeId?: string;
 *   }>;
 * }}
 */
export function isDeleteSnapshot(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = /** @type {{
   * kind?: unknown;
   * version?: unknown;
   * reason?: unknown;
   * createdAt?: unknown;
   * count?: unknown;
   * cookies?: unknown;
   * }} */ (value);

  return (
    candidate.kind === DELETE_SNAPSHOT_KIND &&
    candidate.version === DELETE_SNAPSHOT_VERSION &&
    typeof candidate.reason === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.count === 'number' &&
    Array.isArray(candidate.cookies)
  );
}

/**
 * @param {{
 *   setItem: (key: string, value: string) => void;
 * }} storage
 * @param {ReturnType<typeof createDeleteSnapshot>} snapshot
 * @param {string} [storageKey]
 */
export function saveDeleteSnapshot(storage, snapshot, storageKey = DELETE_SNAPSHOT_STORAGE_KEY) {
  storage.setItem(storageKey, JSON.stringify(snapshot));
}

/**
 * @param {{
 *   getItem: (key: string) => string | null;
 * }} storage
 * @param {string} [storageKey]
 */
export function loadDeleteSnapshot(storage, storageKey = DELETE_SNAPSHOT_STORAGE_KEY) {
  const raw = storage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isDeleteSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   removeItem: (key: string) => void;
 * }} storage
 * @param {string} [storageKey]
 */
export function clearDeleteSnapshot(storage, storageKey = DELETE_SNAPSHOT_STORAGE_KEY) {
  storage.removeItem(storageKey);
}

/**
 * @param {ReturnType<typeof createDeleteSnapshot>} snapshot
 * @param {number} [nowMs]
 */
export function buildRestoreCookieSetOperations(snapshot, nowMs = Date.now()) {
  /** @type {Array<{
   *   name: string;
   *   value: string;
   *   domain: string;
   *   path: string;
   *   secure: boolean;
   *   httpOnly: boolean;
   *   sameSite: string;
   *   storeId?: string;
   *   expirationDate?: number;
   *   url: string;
   * }>} */
  const operations = [];
  let skippedCount = 0;

  snapshot.cookies.forEach((cookie) => {
    if (!cookie || typeof cookie !== 'object') {
      skippedCount += 1;
      return;
    }

    if (
      typeof cookie.name !== 'string' ||
      typeof cookie.value !== 'string' ||
      typeof cookie.domain !== 'string'
    ) {
      skippedCount += 1;
      return;
    }

    const operation = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: typeof cookie.path === 'string' && cookie.path ? cookie.path : '/',
      secure: Boolean(cookie.secure),
      httpOnly: Boolean(cookie.httpOnly),
      sameSite: typeof cookie.sameSite === 'string' && cookie.sameSite ? cookie.sameSite : 'lax',
      storeId: typeof cookie.storeId === 'string' ? cookie.storeId : undefined,
      expirationDate:
        typeof cookie.expirationDate === 'number' && cookie.expirationDate * 1000 > nowMs
          ? cookie.expirationDate
          : undefined,
      url: ''
    };

    try {
      operation.url = deriveCookieUrl(operation);
      operations.push(operation);
    } catch {
      skippedCount += 1;
    }
  });

  return {
    operations,
    skippedCount
  };
}

/**
 * @param {chrome.cookies.Cookie[]} currentCookies
 * @param {ReturnType<typeof createDeleteSnapshot>} snapshot
 */
export function applySnapshotDeletion(currentCookies, snapshot) {
  const deletedKeys = new Set(
    snapshot.cookies
      .filter((cookie) => cookie && typeof cookie.name === 'string' && typeof cookie.domain === 'string')
      .map((cookie) => getCookieStorageKey(/** @type {{ name: string; domain: string }} */ (cookie)))
  );

  return currentCookies.filter((cookie) => !deletedKeys.has(getCookieStorageKey(cookie)));
}

/**
 * @param {chrome.cookies.Cookie[]} currentCookies
 * @param {ReturnType<typeof createDeleteSnapshot>} snapshot
 */
export function rollbackSnapshotDeletion(currentCookies, snapshot) {
  const merged = [...currentCookies];
  const existingKeys = new Set(currentCookies.map((cookie) => getCookieStorageKey(cookie)));

  snapshot.cookies.forEach((cookie) => {
    if (!cookie || typeof cookie !== 'object') return;
    if (typeof cookie.name !== 'string' || typeof cookie.domain !== 'string') return;

    const key = getCookieStorageKey(/** @type {{ name: string; domain: string }} */ (cookie));
    if (existingKeys.has(key)) return;

    merged.push(
      /** @type {chrome.cookies.Cookie} */ ({
        name: cookie.name,
        value: typeof cookie.value === 'string' ? cookie.value : '',
        domain: cookie.domain,
        path: typeof cookie.path === 'string' && cookie.path ? cookie.path : '/',
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: typeof cookie.sameSite === 'string' && cookie.sameSite ? cookie.sameSite : 'lax',
        storeId: typeof cookie.storeId === 'string' ? cookie.storeId : '0',
        session: !cookie.expirationDate,
        expirationDate:
          typeof cookie.expirationDate === 'number' ? cookie.expirationDate : undefined
      })
    );
    existingKeys.add(key);
  });

  return merged;
}

