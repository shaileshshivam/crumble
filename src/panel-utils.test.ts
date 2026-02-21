import { describe, expect, it } from 'vitest';
import { isTransientStorageBridgeErrorMessage, parseJsonCandidate } from './panel-utils';

describe('panel utilities', () => {
  it('detects transient storage bridge transport errors', () => {
    expect(
      isTransientStorageBridgeErrorMessage('Could not establish connection. Receiving end does not exist.')
    ).toBe(true);
    expect(isTransientStorageBridgeErrorMessage('No tab with id: 1234')).toBe(true);
    expect(isTransientStorageBridgeErrorMessage('Storage operation failed.')).toBe(false);
  });

  it('parses JSON object/array strings when unredacted', () => {
    expect(parseJsonCandidate('{"a":1}', false)).toEqual({ a: 1 });
    expect(parseJsonCandidate('[1,2,3]', false)).toEqual([1, 2, 3]);
  });

  it('returns null when value is not parseable or redacted', () => {
    expect(parseJsonCandidate('token=abc', false)).toBeNull();
    expect(parseJsonCandidate('{"a":', false)).toBeNull();
    expect(parseJsonCandidate('{"a":1}', true)).toBeNull();
  });
});
