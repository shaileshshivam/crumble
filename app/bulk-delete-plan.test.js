import { describe, expect, it } from 'vitest';
import {
  BULK_DELETE_TYPE,
  createBulkDeleteConfirmationPhrase,
  createBulkDeletePlan,
  isBulkDeleteConfirmationValid
} from './bulk-delete-plan.js';

function makeCookie(name, domain, expirationDate) {
  return /** @type {chrome.cookies.Cookie} */ ({
    name,
    value: `${name}-value`,
    domain,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    session: !expirationDate,
    storeId: '0',
    expirationDate
  });
}

describe('bulk-delete-plan', () => {
  it('builds filtered delete plan', () => {
    const cookies = [makeCookie('a', '.example.com', 2000000000), makeCookie('b', '.example.com')];
    const plan = createBulkDeletePlan({
      type: BULK_DELETE_TYPE.FILTERED,
      cookies,
      pinnedCookies: {}
    });

    expect(plan.title).toBe('Delete All Filtered Cookies');
    expect(plan.totalFiltered).toBe(2);
    expect(plan.targetCount).toBe(2);
    expect(plan.sessionTargetCount).toBe(1);
    expect(plan.pinnedSkippedCount).toBe(0);
    expect(plan.previewItems).toHaveLength(2);
  });

  it('builds session-only delete plan', () => {
    const cookies = [makeCookie('a', '.example.com', 2000000000), makeCookie('b', '.example.com')];
    const plan = createBulkDeletePlan({
      type: BULK_DELETE_TYPE.SESSION,
      cookies,
      pinnedCookies: {}
    });

    expect(plan.targetCookies.map((cookie) => cookie.name)).toEqual(['b']);
    expect(plan.sessionTargetCount).toBe(1);
  });

  it('excludes pinned cookies for non-pinned plan', () => {
    const cookieA = makeCookie('a', '.example.com');
    const cookieB = makeCookie('b', '.example.com');

    const plan = createBulkDeletePlan({
      type: BULK_DELETE_TYPE.NON_PINNED,
      cookies: [cookieA, cookieB],
      pinnedCookies: {
        '.example.com:a': true
      }
    });

    expect(plan.targetCookies.map((cookie) => cookie.name)).toEqual(['b']);
    expect(plan.pinnedSkippedCount).toBe(1);
  });

  it('limits preview list length', () => {
    const cookies = Array.from({ length: 20 }, (_, index) => makeCookie(`k${index}`, '.example.com'));
    const plan = createBulkDeletePlan({
      type: BULK_DELETE_TYPE.FILTERED,
      cookies,
      pinnedCookies: {}
    });

    expect(plan.previewItems).toHaveLength(10);
  });

  it('throws for unsupported plan type', () => {
    expect(() =>
      createBulkDeletePlan({
        type: /** @type {'filtered' | 'session' | 'nonpinned'} */ (/** @type {unknown} */ ('bad-type')),
        cookies: [],
        pinnedCookies: {}
      })
    ).toThrow('Unsupported bulk delete type.');
  });

  it('builds confirmation phrase from delete count', () => {
    expect(createBulkDeleteConfirmationPhrase({ targetCount: 8 })).toBe('DELETE 8');
  });

  it('validates confirmation phrase', () => {
    expect(isBulkDeleteConfirmationValid('DELETE 8', 'DELETE 8')).toBe(true);
    expect(isBulkDeleteConfirmationValid(' delete 8 ', 'DELETE 8')).toBe(false);
  });
});
