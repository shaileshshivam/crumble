import { describe, expect, it } from 'vitest';
import { loadRedactionMode, redactValue, saveRedactionMode } from './redaction.js';

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

describe('redaction', () => {
  it('returns original value when redaction is disabled', () => {
    expect(redactValue('secret', false)).toBe('secret');
  });

  it('returns masked value when redaction is enabled', () => {
    const masked = redactValue('secret', true);
    expect(masked).toMatch(/^•+$/);
    expect(masked.length).toBeGreaterThanOrEqual(8);
  });

  it('persists and loads redaction mode', () => {
    const storage = createMemoryStorage();
    saveRedactionMode(storage, true);
    expect(loadRedactionMode(storage)).toBe(true);
    saveRedactionMode(storage, false);
    expect(loadRedactionMode(storage)).toBe(false);
  });
});

