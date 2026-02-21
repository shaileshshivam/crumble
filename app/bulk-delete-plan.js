// @ts-check

import { getCookieStorageKey } from './cookie-data.js';

export const BULK_DELETE_TYPE = {
  FILTERED: 'filtered',
  SESSION: 'session',
  NON_PINNED: 'nonpinned'
};

const PREVIEW_LIMIT = 10;

/**
 * @param {{
 *   type: 'filtered' | 'session' | 'nonpinned';
 *   cookies: chrome.cookies.Cookie[];
 *   pinnedCookies: Record<string, boolean>;
 * }} options
 */
export function createBulkDeletePlan(options) {
  const cookies = Array.isArray(options.cookies) ? options.cookies : [];
  const pinnedCookies = options.pinnedCookies || {};

  /** @type {chrome.cookies.Cookie[]} */
  let targetCookies = [];
  let title = '';

  switch (options.type) {
    case BULK_DELETE_TYPE.FILTERED:
      title = 'Delete All Filtered Cookies';
      targetCookies = [...cookies];
      break;
    case BULK_DELETE_TYPE.SESSION:
      title = 'Delete Filtered Session Cookies';
      targetCookies = cookies.filter((cookie) => !cookie.expirationDate);
      break;
    case BULK_DELETE_TYPE.NON_PINNED:
      title = 'Delete Filtered Non-Pinned Cookies';
      targetCookies = cookies.filter((cookie) => !isPinnedCookie(cookie, pinnedCookies));
      break;
    default:
      throw new Error('Unsupported bulk delete type.');
  }

  const previewItems = targetCookies.slice(0, PREVIEW_LIMIT).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    isSession: !cookie.expirationDate,
    isPinned: isPinnedCookie(cookie, pinnedCookies)
  }));

  return {
    type: options.type,
    title,
    totalFiltered: cookies.length,
    targetCount: targetCookies.length,
    sessionTargetCount: targetCookies.filter((cookie) => !cookie.expirationDate).length,
    pinnedSkippedCount:
      options.type === BULK_DELETE_TYPE.NON_PINNED
        ? cookies.filter((cookie) => isPinnedCookie(cookie, pinnedCookies)).length
        : 0,
    targetCookies,
    previewItems
  };
}

/**
 * @param {{ targetCount: number }} plan
 * @returns {string}
 */
export function createBulkDeleteConfirmationPhrase(plan) {
  return `DELETE ${Math.max(0, Number(plan.targetCount) || 0)}`;
}

/**
 * @param {string} value
 * @param {string} expected
 * @returns {boolean}
 */
export function isBulkDeleteConfirmationValid(value, expected) {
  return value.trim() === expected;
}

/**
 * @param {chrome.cookies.Cookie} cookie
 * @param {Record<string, boolean>} pinnedCookies
 */
function isPinnedCookie(cookie, pinnedCookies) {
  return Boolean(pinnedCookies[getCookieStorageKey(cookie)]);
}
