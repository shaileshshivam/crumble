// @ts-check

import { createProfileRecord } from './profile-store.js';

export const PROFILE_EXPORT_KIND = 'cookie-snatcher-profile-export';
export const PROFILE_EXPORT_VERSION = 2;

/**
 * @param {ReturnType<typeof createProfileRecord>} profile
 */
export function createProfileExportPayload(profile) {
  return {
    kind: PROFILE_EXPORT_KIND,
    version: PROFILE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      state: {
        cookies: profile.cookies,
        storage: {
          localStorage: profile.localStorageEntries,
          sessionStorage: profile.sessionStorageEntries
        }
      }
    }
  };
}

/**
 * @param {unknown} input
 */
export function parseProfileImportPayload(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Profile import payload must be an object.');
  }

  const candidate = /** @type {{
   * kind?: unknown;
   * version?: unknown;
   * profile?: unknown;
   * id?: unknown;
   * name?: unknown;
   * createdAt?: unknown;
   * updatedAt?: unknown;
   * cookies?: unknown;
   * localStorageEntries?: unknown;
   * sessionStorageEntries?: unknown;
   * }} */ (input);

  if (candidate.kind === PROFILE_EXPORT_KIND && candidate.version === PROFILE_EXPORT_VERSION) {
    return {
      migratedFromVersion: null,
      profile: normalizeV2Profile(candidate.profile)
    };
  }

  // Legacy payload support:
  // 1) A wrapped v1 export: { kind: PROFILE_EXPORT_KIND, version: 1, profile: { ...v1Profile } }
  // 2) A direct v1 profile object.
  if (
    (candidate.kind === PROFILE_EXPORT_KIND && candidate.version === 1 && candidate.profile) ||
    candidate.kind === 'cookie-snatcher-profile'
  ) {
    const legacyProfile = candidate.kind === PROFILE_EXPORT_KIND ? candidate.profile : candidate;
    return {
      migratedFromVersion: 1,
      profile: normalizeV1Profile(legacyProfile)
    };
  }

  throw new Error('Unsupported profile payload format or version.');
}

/**
 * @param {unknown} profileInput
 */
function normalizeV2Profile(profileInput) {
  if (!profileInput || typeof profileInput !== 'object') {
    throw new Error('Invalid v2 profile payload.');
  }

  const profile = /** @type {{
   * id?: unknown;
   * name?: unknown;
   * createdAt?: unknown;
   * updatedAt?: unknown;
   * state?: unknown;
   * }} */ (profileInput);

  if (!profile.state || typeof profile.state !== 'object') {
    throw new Error('Invalid v2 profile state.');
  }

  const state = /** @type {{
   * cookies?: unknown;
   * storage?: unknown;
   * }} */ (profile.state);
  if (!state.storage || typeof state.storage !== 'object') {
    throw new Error('Invalid v2 profile storage state.');
  }

  const storage = /** @type {{
   * localStorage?: unknown;
   * sessionStorage?: unknown;
   * }} */ (state.storage);

  return createProfileRecord({
    id: typeof profile.id === 'string' ? profile.id : undefined,
    name: typeof profile.name === 'string' ? profile.name : '',
    createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : undefined,
    updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : undefined,
    cookies: Array.isArray(state.cookies)
      ? /** @type {chrome.cookies.Cookie[]} */ (state.cookies)
      : [],
    localStorageEntries: Array.isArray(storage.localStorage)
      ? /** @type {{ key: string; value: string }[]} */ (storage.localStorage)
      : [],
    sessionStorageEntries: Array.isArray(storage.sessionStorage)
      ? /** @type {{ key: string; value: string }[]} */ (storage.sessionStorage)
      : []
  });
}

/**
 * @param {unknown} legacyProfileInput
 */
function normalizeV1Profile(legacyProfileInput) {
  if (!legacyProfileInput || typeof legacyProfileInput !== 'object') {
    throw new Error('Invalid v1 profile payload.');
  }

  const legacy = /** @type {{
   * id?: unknown;
   * name?: unknown;
   * createdAt?: unknown;
   * updatedAt?: unknown;
   * cookies?: unknown;
   * localStorageEntries?: unknown;
   * sessionStorageEntries?: unknown;
   * }} */ (legacyProfileInput);

  return createProfileRecord({
    id: typeof legacy.id === 'string' ? legacy.id : undefined,
    name: typeof legacy.name === 'string' ? legacy.name : '',
    createdAt: typeof legacy.createdAt === 'string' ? legacy.createdAt : undefined,
    updatedAt: typeof legacy.updatedAt === 'string' ? legacy.updatedAt : undefined,
    cookies: Array.isArray(legacy.cookies)
      ? /** @type {chrome.cookies.Cookie[]} */ (legacy.cookies)
      : [],
    localStorageEntries: Array.isArray(legacy.localStorageEntries)
      ? /** @type {{ key: string; value: string }[]} */ (legacy.localStorageEntries)
      : [],
    sessionStorageEntries: Array.isArray(legacy.sessionStorageEntries)
      ? /** @type {{ key: string; value: string }[]} */ (legacy.sessionStorageEntries)
      : []
  });
}

