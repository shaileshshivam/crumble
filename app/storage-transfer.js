// @ts-check

import { isStorageArea } from './storage-contract.js';

/**
 * @param {{ key: string; value: string }[]} entries
 * @param {{ storageArea: 'localStorage' | 'sessionStorage'; origin: string }} options
 */
export function createStorageExportPayload(entries, options) {
  return {
    kind: 'cookie-snatcher-storage-export',
    version: 1,
    storageArea: options.storageArea,
    origin: options.origin,
    exportedAt: new Date().toISOString(),
    entries: sanitizeStorageEntries(entries)
  };
}

/**
 * @param {unknown} input
 * @returns {{ key: string; value: string }[]}
 */
export function parseStorageImportPayload(input) {
  const payload = normalizePayload(input);
  return sanitizeStorageEntries(payload);
}

/**
 * @param {unknown} input
 * @returns {'localStorage' | 'sessionStorage' | null}
 */
export function parseStorageAreaFromImportPayload(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = /** @type {{ storageArea?: unknown }} */ (input);
  return isStorageArea(candidate.storageArea) ? candidate.storageArea : null;
}

/**
 * @param {unknown} input
 * @returns {unknown[]}
 */
function normalizePayload(input) {
  if (Array.isArray(input)) {
    return input;
  }

  if (!input || typeof input !== 'object') {
    throw new Error('Import payload must be an array or an export object.');
  }

  const candidate = /** @type {{ entries?: unknown }} */ (input);
  if (!Array.isArray(candidate.entries)) {
    throw new Error('Import payload must contain an entries array.');
  }

  return candidate.entries;
}

/**
 * @param {unknown[]} entries
 * @returns {{ key: string; value: string }[]}
 */
function sanitizeStorageEntries(entries) {
  /** @type {Map<string, string>} */
  const deduped = new Map();

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const candidate = /** @type {{ key?: unknown; value?: unknown }} */ (entry);
    if (typeof candidate.key !== 'string' || !candidate.key.trim()) {
      return;
    }

    const value = typeof candidate.value === 'string' ? candidate.value : String(candidate.value ?? '');
    deduped.set(candidate.key, value);
  });

  const result = [...deduped.entries()].map(([key, value]) => ({ key, value }));
  if (result.length === 0) {
    throw new Error('No valid storage entries found in import payload.');
  }

  return result;
}
