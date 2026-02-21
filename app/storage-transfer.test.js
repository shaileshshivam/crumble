import { describe, expect, it } from 'vitest';
import {
  createStorageExportPayload,
  parseStorageAreaFromImportPayload,
  parseStorageImportPayload
} from './storage-transfer.js';

describe('storage-transfer', () => {
  it('creates a stable export payload', () => {
    const payload = createStorageExportPayload(
      [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' }
      ],
      {
        storageArea: 'localStorage',
        origin: 'https://example.com'
      }
    );

    expect(payload.kind).toBe('cookie-snatcher-storage-export');
    expect(payload.version).toBe(1);
    expect(payload.storageArea).toBe('localStorage');
    expect(payload.origin).toBe('https://example.com');
    expect(payload.entries).toHaveLength(2);
    expect(typeof payload.exportedAt).toBe('string');
  });

  it('sanitizes export entries and keeps last value on duplicates', () => {
    const payload = createStorageExportPayload(
      [
        { key: 'theme', value: 'light' },
        { key: '', value: 'bad' },
        { key: 'theme', value: 'dark' },
        { key: 'count', value: 7 }
      ],
      {
        storageArea: 'sessionStorage',
        origin: 'https://example.com'
      }
    );

    expect(payload.entries).toEqual([
      { key: 'theme', value: 'dark' },
      { key: 'count', value: '7' }
    ]);
  });

  it('parses array and object import payloads', () => {
    const fromArray = parseStorageImportPayload([{ key: 'a', value: '1' }]);
    expect(fromArray).toEqual([{ key: 'a', value: '1' }]);

    const fromObject = parseStorageImportPayload({
      entries: [{ key: 'b', value: '2' }],
      storageArea: 'sessionStorage'
    });
    expect(fromObject).toEqual([{ key: 'b', value: '2' }]);
  });

  it('deduplicates keys using last write wins', () => {
    const parsed = parseStorageImportPayload([
      { key: 'a', value: '1' },
      { key: 'a', value: '2' }
    ]);

    expect(parsed).toEqual([{ key: 'a', value: '2' }]);
  });

  it('drops invalid entries and coerces values to strings', () => {
    const parsed = parseStorageImportPayload({
      entries: [
        { key: 'enabled', value: true },
        { key: null, value: 'nope' },
        null,
        { key: 'count', value: 10 }
      ]
    });

    expect(parsed).toEqual([
      { key: 'enabled', value: 'true' },
      { key: 'count', value: '10' }
    ]);
  });

  it('extracts storageArea when present and valid', () => {
    expect(parseStorageAreaFromImportPayload({ storageArea: 'localStorage' })).toBe('localStorage');
    expect(parseStorageAreaFromImportPayload({ storageArea: 'invalid' })).toBeNull();
    expect(parseStorageAreaFromImportPayload(null)).toBeNull();
  });

  it('throws when payload has no valid entries', () => {
    expect(() => parseStorageImportPayload({ entries: [] })).toThrow();
    expect(() => parseStorageImportPayload('bad')).toThrow();
  });
});
