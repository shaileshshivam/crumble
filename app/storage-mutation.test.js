import { describe, expect, it } from 'vitest';
import { normalizeStorageMutationInput, planStorageMutation } from './storage-mutation.js';

describe('storage-mutation', () => {
  it('normalizes valid input', () => {
    const normalized = normalizeStorageMutationInput({
      originalKey: '  token  ',
      key: '  authToken  ',
      value: 42
    });

    expect(normalized).toEqual({
      originalKey: 'token',
      key: 'authToken',
      value: '42'
    });
  });

  it('throws when key is missing', () => {
    expect(() =>
      normalizeStorageMutationInput({
        key: '  ',
        value: 'x'
      })
    ).toThrow('Storage key is required.');
  });

  it('creates set-only plan for create or same-key edit', () => {
    const createPlan = planStorageMutation({
      originalKey: null,
      key: 'theme',
      value: 'dark'
    });

    expect(createPlan).toEqual([{ type: 'set', key: 'theme', value: 'dark' }]);

    const sameKeyEditPlan = planStorageMutation({
      originalKey: 'theme',
      key: 'theme',
      value: 'light'
    });

    expect(sameKeyEditPlan).toEqual([{ type: 'set', key: 'theme', value: 'light' }]);
  });

  it('adds remove before set when key is renamed', () => {
    const renamePlan = planStorageMutation({
      originalKey: 'oldKey',
      key: 'newKey',
      value: 'v'
    });

    expect(renamePlan).toEqual([
      { type: 'remove', key: 'oldKey' },
      { type: 'set', key: 'newKey', value: 'v' }
    ]);
  });
});
