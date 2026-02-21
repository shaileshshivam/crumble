// @ts-check

import { mapCookiesForExport } from './cookie-transfer.js';

export const PROFILE_STORAGE_KEY = 'cookieSnatcher.profiles.v1';
export const PROFILE_KIND = 'cookie-snatcher-profile';
export const PROFILE_VERSION = 1;

/**
 * @param {{
 *   id?: string;
 *   name: string;
 *   cookies: chrome.cookies.Cookie[];
 *   localStorageEntries: { key: string; value: string }[];
 *   sessionStorageEntries: { key: string; value: string }[];
 *   createdAt?: string;
 *   updatedAt?: string;
 * }} input
 */
export function createProfileRecord(input) {
  const now = new Date().toISOString();
  const id = input.id && input.id.trim() ? input.id : createProfileId();
  const name = input.name.trim();
  if (!name) {
    throw new Error('Profile name is required.');
  }

  return {
    kind: PROFILE_KIND,
    version: PROFILE_VERSION,
    id,
    name,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    cookies: mapCookiesForExport(input.cookies || []),
    localStorageEntries: normalizeStorageEntries(input.localStorageEntries || []),
    sessionStorageEntries: normalizeStorageEntries(input.sessionStorageEntries || [])
  };
}

/**
 * @param {{
 *   getItem: (key: string) => string | null;
 * }} storage
 * @param {string} [storageKey]
 */
export function loadProfileRecords(storage, storageKey = PROFILE_STORAGE_KEY) {
  const raw = storage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isProfileRecord);
  } catch {
    return [];
  }
}

/**
 * @param {{
 *   setItem: (key: string, value: string) => void;
 * }} storage
 * @param {ReturnType<typeof createProfileRecord>[]} records
 * @param {string} [storageKey]
 */
export function saveProfileRecords(storage, records, storageKey = PROFILE_STORAGE_KEY) {
  storage.setItem(storageKey, JSON.stringify(records));
}

/**
 * @param {{
 *   getItem: (key: string) => string | null;
 *   setItem: (key: string, value: string) => void;
 * }} storage
 * @param {ReturnType<typeof createProfileRecord>} profile
 * @param {string} [storageKey]
 */
export function upsertProfileRecord(storage, profile, storageKey = PROFILE_STORAGE_KEY) {
  const records = loadProfileRecords(storage, storageKey);
  const existingIndex = records.findIndex((record) => record.id === profile.id);

  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    records[existingIndex] = {
      ...profile,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
  } else {
    records.push(profile);
  }

  saveProfileRecords(storage, records, storageKey);
  return records;
}

/**
 * @param {{
 *   getItem: (key: string) => string | null;
 *   setItem: (key: string, value: string) => void;
 * }} storage
 * @param {string} profileId
 * @param {string} [storageKey]
 */
export function removeProfileRecord(storage, profileId, storageKey = PROFILE_STORAGE_KEY) {
  const records = loadProfileRecords(storage, storageKey);
  const nextRecords = records.filter((record) => record.id !== profileId);
  saveProfileRecords(storage, nextRecords, storageKey);
  return nextRecords;
}

/**
 * @param {unknown} value
 * @returns {value is ReturnType<typeof createProfileRecord>}
 */
export function isProfileRecord(value) {
  if (!value || typeof value !== 'object') return false;

  const candidate = /** @type {{
   *   kind?: unknown;
   *   version?: unknown;
   *   id?: unknown;
   *   name?: unknown;
   *   createdAt?: unknown;
   *   updatedAt?: unknown;
   *   cookies?: unknown;
   *   localStorageEntries?: unknown;
   *   sessionStorageEntries?: unknown;
   * }} */ (value);

  return (
    candidate.kind === PROFILE_KIND &&
    candidate.version === PROFILE_VERSION &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Array.isArray(candidate.cookies) &&
    Array.isArray(candidate.localStorageEntries) &&
    Array.isArray(candidate.sessionStorageEntries)
  );
}

/**
 * @param {{ key: string; value: string }[]} entries
 */
function normalizeStorageEntries(entries) {
  /** @type {Map<string, string>} */
  const deduped = new Map();

  entries.forEach((entry) => {
    if (!entry || typeof entry.key !== 'string' || !entry.key.trim()) {
      return;
    }

    deduped.set(entry.key, typeof entry.value === 'string' ? entry.value : String(entry.value ?? ''));
  });

  return [...deduped.entries()].map(([key, value]) => ({ key, value }));
}

function createProfileId() {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

