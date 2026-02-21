// @ts-check

export const REDACTION_STORAGE_KEY = 'cookieSnatcher.redactionEnabled';

/**
 * @param {string} value
 * @param {boolean} enabled
 */
export function redactValue(value, enabled) {
  if (!enabled) {
    return value;
  }

  const normalizedValue = typeof value === 'string' ? value : String(value ?? '');
  const maskLength = Math.min(24, Math.max(8, normalizedValue.length || 8));
  return '•'.repeat(maskLength);
}

/**
 * @param {{
 *   getItem: (key: string) => string | null;
 * }} storage
 * @param {string} [storageKey]
 */
export function loadRedactionMode(storage, storageKey = REDACTION_STORAGE_KEY) {
  return storage.getItem(storageKey) === 'true';
}

/**
 * @param {{
 *   setItem: (key: string, value: string) => void;
 * }} storage
 * @param {boolean} enabled
 * @param {string} [storageKey]
 */
export function saveRedactionMode(storage, enabled, storageKey = REDACTION_STORAGE_KEY) {
  storage.setItem(storageKey, enabled ? 'true' : 'false');
}

