// @ts-check

/**
 * @typedef {{ type: 'set'; key: string; value: string } | { type: 'remove'; key: string }} StorageMutationOperation
 */

/**
 * Normalize and validate storage mutation input from UI forms.
 * @param {{ originalKey?: string | null; key: string; value: unknown }} input
 * @returns {{ originalKey: string | null; key: string; value: string }}
 */
export function normalizeStorageMutationInput(input) {
  const normalizedKey = typeof input.key === 'string' ? input.key.trim() : '';
  if (!normalizedKey) {
    throw new Error('Storage key is required.');
  }

  const normalizedOriginalKey =
    typeof input.originalKey === 'string' && input.originalKey.trim()
      ? input.originalKey.trim()
      : null;

  return {
    originalKey: normalizedOriginalKey,
    key: normalizedKey,
    value: typeof input.value === 'string' ? input.value : String(input.value ?? '')
  };
}

/**
 * Build a safe operation plan for create/update mutations.
 * @param {{ originalKey: string | null; key: string; value: string }} input
 * @returns {StorageMutationOperation[]}
 */
export function planStorageMutation(input) {
  /** @type {StorageMutationOperation[]} */
  const operations = [];

  if (input.originalKey && input.originalKey !== input.key) {
    operations.push({
      type: 'remove',
      key: input.originalKey
    });
  }

  operations.push({
    type: 'set',
    key: input.key,
    value: input.value
  });

  return operations;
}
