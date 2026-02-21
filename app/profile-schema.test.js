import { describe, expect, it } from 'vitest';
import { createProfileRecord } from './profile-store.js';
import { createProfileExportPayload, parseProfileImportPayload } from './profile-schema.js';

function makeProfileRecord(name = 'Staging') {
  return createProfileRecord({
    id: 'profile-1',
    name,
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
    localStorageEntries: [{ key: 'theme', value: 'dark' }],
    sessionStorageEntries: [{ key: 'sid', value: '123' }],
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  });
}

describe('profile-schema', () => {
  it('creates v2 export payload', () => {
    const payload = createProfileExportPayload(makeProfileRecord());
    expect(payload.kind).toBe('cookie-snatcher-profile-export');
    expect(payload.version).toBe(2);
    expect(payload.profile.state.storage.localStorage).toHaveLength(1);
  });

  it('parses v2 payload without migration', () => {
    const payload = createProfileExportPayload(makeProfileRecord());
    const parsed = parseProfileImportPayload(payload);

    expect(parsed.migratedFromVersion).toBeNull();
    expect(parsed.profile.name).toBe('Staging');
    expect(parsed.profile.localStorageEntries).toEqual([{ key: 'theme', value: 'dark' }]);
  });

  it('migrates legacy direct v1 profile payload', () => {
    const legacyProfile = makeProfileRecord('Legacy');
    const parsed = parseProfileImportPayload(legacyProfile);

    expect(parsed.migratedFromVersion).toBe(1);
    expect(parsed.profile.name).toBe('Legacy');
  });

  it('migrates legacy wrapped v1 profile payload', () => {
    const legacyProfile = makeProfileRecord('Wrapped');
    const parsed = parseProfileImportPayload({
      kind: 'cookie-snatcher-profile-export',
      version: 1,
      profile: legacyProfile
    });

    expect(parsed.migratedFromVersion).toBe(1);
    expect(parsed.profile.name).toBe('Wrapped');
  });

  it('throws for unsupported payload versions', () => {
    expect(() =>
      parseProfileImportPayload({
        kind: 'cookie-snatcher-profile-export',
        version: 99
      })
    ).toThrow('Unsupported profile payload format or version.');
  });
});

