// @ts-check

import { isCookieInCurrentDomain } from './domain-context.js';

/**
 * @param {{domain: string, name: string}} cookie
 * @returns {string}
 */
export function getCookieStorageKey(cookie) {
  return `${cookie.domain}:${cookie.name}`;
}

/**
 * @param {chrome.cookies.Cookie[]} cookies
 * @param {Record<string, boolean>} pinnedCookies
 * @returns {chrome.cookies.Cookie[]}
 */
export function sortCookiesByPinned(cookies, pinnedCookies) {
  return [...cookies].sort((a, b) => {
    const aIsPinned = Boolean(pinnedCookies[getCookieStorageKey(a)]);
    const bIsPinned = Boolean(pinnedCookies[getCookieStorageKey(b)]);

    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;

    const domainA = a.domain || '';
    const domainB = b.domain || '';
    const domainCompare = domainA.localeCompare(domainB);
    if (domainCompare !== 0) return domainCompare;

    return a.name.localeCompare(b.name);
  });
}

/**
 * @param {chrome.cookies.Cookie[]} cookies
 * @returns {Record<string, chrome.cookies.Cookie[]>}
 */
export function groupCookiesByDomain(cookies) {
  return cookies.reduce((acc, cookie) => {
    const domain = cookie.domain || 'Unknown Domain';
    if (!acc[domain]) {
      acc[domain] = [];
    }

    acc[domain].push(cookie);
    return acc;
  }, /** @type {Record<string, chrome.cookies.Cookie[]>} */ ({}));
}

/**
 * @param {{domain: string; path?: string; secure?: boolean}} cookie
 * @returns {string}
 */
export function deriveCookieUrl(cookie) {
  if (!cookie || !cookie.domain) {
    throw new Error('Cannot derive URL without cookie domain.');
  }

  const scheme = cookie.secure ? 'https://' : 'http://';
  const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
  const cleanPath = cookie.path && cookie.path.startsWith('/') ? cookie.path : `/${cookie.path || ''}`;

  if (cleanDomain.includes('://')) {
    throw new Error(`Invalid domain format for URL derivation: ${cookie.domain}`);
  }

  return `${scheme}${cleanDomain}${cleanPath}`;
}

/**
 * @param {string} dateString
 * @returns {number | null | 'invalid'}
 */
export function parseDateToUnixSeconds(dateString) {
  if (!dateString) {
    return null;
  }

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'invalid';
    }

    return Math.floor(date.getTime() / 1000);
  } catch {
    return 'invalid';
  }
}

/**
 * @param {{
 *  cookies: chrome.cookies.Cookie[];
 *  activeTab: 'current' | 'all';
 *  currentDomain: string;
 *  searchTerm: string;
 * }} params
 * @returns {chrome.cookies.Cookie[]}
 */
export function filterCookiesForActiveView({ cookies, activeTab, currentDomain, searchTerm }) {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const searchApplied = normalizedSearch !== '';

  if (activeTab === 'current') {
    return cookies.filter((cookie) => {
      const domainMatch = isCookieInCurrentDomain(cookie, currentDomain);
      if (!domainMatch) {
        return false;
      }

      return !searchApplied || cookie.name.toLowerCase().includes(normalizedSearch);
    });
  }

  if (!searchApplied) {
    return [...cookies];
  }

  return cookies.filter((cookie) => {
    return (
      cookie.name.toLowerCase().includes(normalizedSearch) ||
      cookie.value.toLowerCase().includes(normalizedSearch) ||
      (cookie.domain && cookie.domain.toLowerCase().includes(normalizedSearch))
    );
  });
}
