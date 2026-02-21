import { describe, expect, it } from 'vitest';
import {
  applySnapshotDeletion,
  buildRestoreCookieSetOperations,
  createDeleteSnapshot,
  loadDeleteSnapshot,
  rollbackSnapshotDeletion,
  saveDeleteSnapshot
} from './delete-snapshot.js';

function makeCookie(name, domain, expirationDate) {
  return /** @type {chrome.cookies.Cookie} */ ({
    name,
    value: `${name}-value`,
    domain,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    storeId: '0',
    session: !expirationDate,
    expirationDate
  });
}

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return {
    setItem(key, value) {
      data[key] = value;
    },
    getItem(key) {
      return key in data ? data[key] : null;
    },
    removeItem(key) {
      delete data[key];
    }
  };
}

describe('delete-snapshot', () => {
  it('creates a snapshot with metadata and cookies', () => {
    const snapshot = createDeleteSnapshot(
      [makeCookie('session', '.example.com', 2000000000)],
      'filtered',
      '2026-02-20T00:00:00.000Z'
    );

    expect(snapshot.kind).toBe('cookie-snatcher-delete-snapshot');
    expect(snapshot.version).toBe(1);
    expect(snapshot.reason).toBe('filtered');
    expect(snapshot.createdAt).toBe('2026-02-20T00:00:00.000Z');
    expect(snapshot.count).toBe(1);
    expect(snapshot.cookies).toHaveLength(1);
  });

  it('saves and loads snapshot from storage', () => {
    const storage = createMemoryStorage();
    const snapshot = createDeleteSnapshot([makeCookie('a', '.example.com')], 'filtered');

    saveDeleteSnapshot(storage, snapshot);
    const loaded = loadDeleteSnapshot(storage);

    expect(loaded).not.toBeNull();
    expect(loaded?.count).toBe(1);
    expect(loaded?.cookies[0].name).toBe('a');
  });

  it('returns null for invalid snapshot payloads', () => {
    const storage = createMemoryStorage();
    storage.setItem('cookieSnatcher.lastDeleteSnapshot', '{"bad":true}');
    expect(loadDeleteSnapshot(storage)).toBeNull();
  });

  it('builds restore operations and skips invalid cookies', () => {
    const snapshot = createDeleteSnapshot(
      [
        makeCookie('fresh', '.example.com', 2000000000),
        makeCookie('expired', '.example.com', 1600000000)
      ],
      'filtered',
      '2026-02-20T00:00:00.000Z'
    );

    snapshot.cookies.push(/** @type {any} */ ({ name: 'bad' }));

    const restore = buildRestoreCookieSetOperations(snapshot, 1700000000000);
    expect(restore.operations).toHaveLength(2);
    expect(restore.operations[0].url).toBe('http://example.com/');
    expect(restore.operations[0].expirationDate).toBe(2000000000);
    expect(restore.operations[1].expirationDate).toBeUndefined();
    expect(restore.skippedCount).toBe(1);
  });

  it('applies and rolls back snapshot deletion in-memory', () => {
    const currentCookies = [
      makeCookie('a', '.example.com'),
      makeCookie('b', '.example.com'),
      makeCookie('c', '.example.com')
    ];
    const snapshot = createDeleteSnapshot(
      [makeCookie('a', '.example.com'), makeCookie('b', '.example.com')],
      'filtered'
    );

    const afterApply = applySnapshotDeletion(currentCookies, snapshot);
    expect(afterApply.map((cookie) => cookie.name)).toEqual(['c']);

    const afterRollback = rollbackSnapshotDeletion(afterApply, snapshot);
    expect(afterRollback.map((cookie) => cookie.name).sort()).toEqual(['a', 'b', 'c']);
  });
});

