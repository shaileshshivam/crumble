import { describe, expect, it } from 'vitest';
import {
  STORAGE_ACTION,
  STORAGE_AREA,
  STORAGE_MESSAGE_CHANNEL,
  createStorageError,
  createStorageRequest,
  createStorageSuccess,
  isStorageAction,
  isStorageArea,
  isStorageRequest,
  isStorageResponse
} from './storage-contract.js';

describe('storage-contract', () => {
  it('validates areas and actions', () => {
    expect(isStorageArea(STORAGE_AREA.LOCAL)).toBe(true);
    expect(isStorageArea(STORAGE_AREA.SESSION)).toBe(true);
    expect(isStorageArea('invalid')).toBe(false);

    expect(isStorageAction(STORAGE_ACTION.GET_ALL)).toBe(true);
    expect(isStorageAction('wrong')).toBe(false);
  });

  it('builds and validates request envelopes', () => {
    const request = createStorageRequest(STORAGE_ACTION.SET, STORAGE_AREA.LOCAL, {
      key: 'k',
      value: 'v'
    });

    expect(request.channel).toBe(STORAGE_MESSAGE_CHANNEL);
    expect(isStorageRequest(request)).toBe(true);
    expect(isStorageRequest({ channel: STORAGE_MESSAGE_CHANNEL, action: 'x', payload: {} })).toBe(false);
  });

  it('builds and validates response envelopes', () => {
    const success = createStorageSuccess({ ok: true });
    const failure = createStorageError('failed');

    expect(isStorageResponse(success)).toBe(true);
    expect(isStorageResponse(failure)).toBe(true);
    expect(isStorageResponse({ ok: true })).toBe(false);
  });
});
