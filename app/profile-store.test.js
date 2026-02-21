import { describe, expect, it } from 'vitest';
import {
  createProfileRecord,
  isProfileRecord,
  loadProfileRecords,
  removeProfileRecord,
  saveProfileRecords,
  upsertProfileRecord
} from './profile-store.js';

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return {
    setItem(key, value) {
      data[key] = value;
    },
    getItem(key) {
      return key in data ? data[key] : null;
    }
  };
}

describe('profile-store', () => {
  it('creates a normalized profile record', () => {
    const profile = createProfileRecord({
      name: '  Staging  ',
      cookies: [
        /** @type {chrome.cookies.Cookie} */ ({
          name: 'token',
          value: 'abc',
          domain: '.example.com',
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
          storeId: '0',
          session: true
        })
      ],
      localStorageEntries: [
        { key: 'theme', value: 'light' },
        { key: 'theme', value: 'dark' }
      ],
      sessionStorageEntries: [{ key: 'sid', value: '123' }]
    });

    expect(profile.name).toBe('Staging');
    expect(profile.cookies).toHaveLength(1);
    expect(profile.localStorageEntries).toEqual([{ key: 'theme', value: 'dark' }]);
    expect(isProfileRecord(profile)).toBe(true);
  });

  it('throws when profile name is empty', () => {
    expect(() =>
      createProfileRecord({
        name: '   ',
        cookies: [],
        localStorageEntries: [],
        sessionStorageEntries: []
      })
    ).toThrow('Profile name is required.');
  });

  it('saves and loads profile records', () => {
    const storage = createMemoryStorage();
    const profile = createProfileRecord({
      name: 'Local',
      cookies: [],
      localStorageEntries: [],
      sessionStorageEntries: []
    });

    saveProfileRecords(storage, [profile]);
    const loaded = loadProfileRecords(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(profile.id);
  });

  it('upserts existing records by id', () => {
    const storage = createMemoryStorage();
    const initial = createProfileRecord({
      id: 'profile-1',
      name: 'Initial',
      cookies: [],
      localStorageEntries: [],
      sessionStorageEntries: [],
      createdAt: '2026-02-20T00:00:00.000Z',
      updatedAt: '2026-02-20T00:00:00.000Z'
    });

    saveProfileRecords(storage, [initial]);

    const updated = createProfileRecord({
      id: 'profile-1',
      name: 'Updated',
      cookies: [],
      localStorageEntries: [{ key: 'k', value: 'v' }],
      sessionStorageEntries: [],
      createdAt: '2026-02-20T00:00:00.000Z',
      updatedAt: '2026-02-20T00:00:00.000Z'
    });

    const nextRecords = upsertProfileRecord(storage, updated);
    expect(nextRecords).toHaveLength(1);
    expect(nextRecords[0].name).toBe('Updated');
    expect(nextRecords[0].createdAt).toBe('2026-02-20T00:00:00.000Z');
  });

  it('removes profile records by id', () => {
    const storage = createMemoryStorage();
    const profileA = createProfileRecord({
      id: 'a',
      name: 'A',
      cookies: [],
      localStorageEntries: [],
      sessionStorageEntries: []
    });
    const profileB = createProfileRecord({
      id: 'b',
      name: 'B',
      cookies: [],
      localStorageEntries: [],
      sessionStorageEntries: []
    });

    saveProfileRecords(storage, [profileA, profileB]);
    const nextRecords = removeProfileRecord(storage, 'a');
    expect(nextRecords).toHaveLength(1);
    expect(nextRecords[0].id).toBe('b');
  });
});

