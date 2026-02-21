import { describe, expect, it } from 'vitest';
import {
  filterStorageEntries,
  groupStorageEntriesByNamespace,
  normalizeStorageEntries,
  sortStorageEntriesByPinned,
  sortStorageEntries
} from './storage-view.js';

describe('storage-view helpers', () => {
  it('normalizes bridge response entries', () => {
    const normalized = normalizeStorageEntries({
      items: [
        { key: 'a', value: '1' },
        { key: 'b', value: 2 },
        { key: '', value: 'skip' }
      ]
    });

    expect(normalized).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' }
    ]);
  });

  it('filters entries by key and value', () => {
    const entries = [
      { key: 'auth.token', value: 'abc' },
      { key: 'prefs.theme', value: 'dark' }
    ];

    expect(filterStorageEntries(entries, 'token')).toHaveLength(1);
    expect(filterStorageEntries(entries, 'dark')).toHaveLength(1);
    expect(filterStorageEntries(entries, '')).toHaveLength(2);
  });

  it('sorts entries by key', () => {
    const sorted = sortStorageEntries([
      { key: 'z', value: '1' },
      { key: 'a', value: '2' }
    ]);

    expect(sorted.map((item) => item.key)).toEqual(['a', 'z']);
  });

  it('sorts entries by pinned status then key', () => {
    const sorted = sortStorageEntriesByPinned(
      [
        { key: 'z', value: '1' },
        { key: 'a', value: '2' },
        { key: 'm', value: '3' }
      ],
      {
        'local:https://example.com:m': true
      },
      (entry) => `local:https://example.com:${entry.key}`
    );

    expect(sorted.map((item) => item.key)).toEqual(['m', 'a', 'z']);
  });

  it('groups entries by namespace prefixes', () => {
    const grouped = groupStorageEntriesByNamespace([
      { key: 'auth.token', value: '1' },
      { key: 'auth.refresh', value: '2' },
      { key: 'app:theme', value: 'dark' },
      { key: 'plain', value: 'x' }
    ]);

    expect(grouped.auth).toHaveLength(2);
    expect(grouped.app).toHaveLength(1);
    expect(grouped.root).toHaveLength(1);
  });
});
