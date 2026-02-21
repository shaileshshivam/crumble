// @ts-check

import { getCookieStorageKey } from './cookie-data.js';

/**
 * @param {{
 *   cookies: Array<{ name: string; value: string; domain: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: string | null; expirationDate?: number; storeId?: string }>;
 *   localStorageEntries: Array<{ key: string; value: string }>;
 *   sessionStorageEntries: Array<{ key: string; value: string }>;
 * }} profileState
 * @param {{
 *   cookies: chrome.cookies.Cookie[];
 *   localStorageEntries: Array<{ key: string; value: string }>;
 *   sessionStorageEntries: Array<{ key: string; value: string }>;
 * }} currentState
 */
export function diffProfileState(profileState, currentState) {
  const cookieDiff = diffCookies(profileState.cookies || [], currentState.cookies || []);
  const localStorageDiff = diffStorageEntries(
    profileState.localStorageEntries || [],
    currentState.localStorageEntries || []
  );
  const sessionStorageDiff = diffStorageEntries(
    profileState.sessionStorageEntries || [],
    currentState.sessionStorageEntries || []
  );

  const summary = {
    added:
      cookieDiff.added.length + localStorageDiff.added.length + sessionStorageDiff.added.length,
    removed:
      cookieDiff.removed.length + localStorageDiff.removed.length + sessionStorageDiff.removed.length,
    changed:
      cookieDiff.changed.length + localStorageDiff.changed.length + sessionStorageDiff.changed.length
  };

  return {
    cookies: cookieDiff,
    localStorage: localStorageDiff,
    sessionStorage: sessionStorageDiff,
    summary
  };
}

/**
 * @param {Array<{ name: string; value: string; domain: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: string | null; expirationDate?: number; storeId?: string }>} profileCookies
 * @param {chrome.cookies.Cookie[]} currentCookies
 */
function diffCookies(profileCookies, currentCookies) {
  const profileMap = new Map(profileCookies.map((cookie) => [cookieIdentity(cookie), cookie]));
  const currentMap = new Map(currentCookies.map((cookie) => [cookieIdentity(cookie), cookie]));

  /** @type {string[]} */
  const added = [];
  /** @type {string[]} */
  const removed = [];
  /** @type {Array<{ key: string; profileValue: string; currentValue: string }>} */
  const changed = [];

  currentMap.forEach((currentCookie, key) => {
    if (!profileMap.has(key)) {
      added.push(key);
      return;
    }

    const profileCookie = profileMap.get(key);
    if (!profileCookie) return;
    if (cookieComparableValue(profileCookie) !== cookieComparableValue(currentCookie)) {
      changed.push({
        key,
        profileValue: typeof profileCookie.value === 'string' ? profileCookie.value : '',
        currentValue: currentCookie.value
      });
    }
  });

  profileMap.forEach((_profileCookie, key) => {
    if (!currentMap.has(key)) {
      removed.push(key);
    }
  });

  return {
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort((a, b) => a.key.localeCompare(b.key))
  };
}

/**
 * @param {Array<{ key: string; value: string }>} profileEntries
 * @param {Array<{ key: string; value: string }>} currentEntries
 */
function diffStorageEntries(profileEntries, currentEntries) {
  const profileMap = new Map(profileEntries.map((entry) => [entry.key, entry.value]));
  const currentMap = new Map(currentEntries.map((entry) => [entry.key, entry.value]));

  /** @type {string[]} */
  const added = [];
  /** @type {string[]} */
  const removed = [];
  /** @type {Array<{ key: string; profileValue: string; currentValue: string }>} */
  const changed = [];

  currentMap.forEach((currentValue, key) => {
    if (!profileMap.has(key)) {
      added.push(key);
      return;
    }

    const profileValue = profileMap.get(key);
    if (profileValue !== currentValue) {
      changed.push({
        key,
        profileValue: profileValue ?? '',
        currentValue
      });
    }
  });

  profileMap.forEach((_profileValue, key) => {
    if (!currentMap.has(key)) {
      removed.push(key);
    }
  });

  return {
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort((a, b) => a.key.localeCompare(b.key))
  };
}

/**
 * @param {{ name: string; domain: string; path?: string; storeId?: string }} cookie
 */
function cookieIdentity(cookie) {
  const baseKey = getCookieStorageKey(cookie);
  const path = cookie.path || '/';
  const storeId = cookie.storeId || '0';
  return `${baseKey}:${path}:${storeId}`;
}

/**
 * @param {{ value?: string; secure?: boolean; httpOnly?: boolean; sameSite?: string | null; expirationDate?: number }} cookie
 */
function cookieComparableValue(cookie) {
  return JSON.stringify({
    value: typeof cookie.value === 'string' ? cookie.value : '',
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    sameSite: cookie.sameSite || 'lax',
    expirationDate: typeof cookie.expirationDate === 'number' ? cookie.expirationDate : null
  });
}

