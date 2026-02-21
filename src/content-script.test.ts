import { describe, expect, it, beforeEach, vi } from 'vitest';
import { STORAGE_ACTION, createStorageRequest } from './storage-contract';
import { handleStorageRequest, registerStorageListener } from './content-script';

type MockStorage = Storage & {
  _entries: Map<string, string>;
};

function createMockStorage(initial: Record<string, string> = {}): MockStorage {
  const entries = new Map(Object.entries(initial));

  return {
    _entries: entries,
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.has(key) ? entries.get(key)! : null;
    },
    key(index: number) {
      return [...entries.keys()][index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    }
  };
}

describe('content script storage bridge', () => {
  beforeEach(() => {
    const localStorage = createMockStorage({ token: 'abc' });
    const sessionStorage = createMockStorage({ session: '123' });

    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage,
        sessionStorage
      },
      configurable: true
    });

    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://example.com' },
      configurable: true
    });
  });

  it('returns all storage entries for GET_ALL', () => {
    const response = handleStorageRequest(
      createStorageRequest(STORAGE_ACTION.GET_ALL, 'localStorage')
    );

    expect(response.ok).toBe(true);
    const data = (response as { ok: true; data: { items: { key: string; value: string }[] } }).data;
    expect(data.items).toEqual([{ key: 'token', value: 'abc' }]);
  });

  it('returns an error for invalid storage area', () => {
    const response = handleStorageRequest({
      action: STORAGE_ACTION.GET_ALL,
      storageArea: null,
      payload: {}
    });

    expect(response.ok).toBe(false);
    expect((response as { ok: false; error: string }).error).toBe('Invalid storage area.');
  });

  it('wires runtime message listener and responds to valid storage requests', () => {
    let listener:
      | ((
          message: unknown,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean)
      | undefined;

    registerStorageListener({
      onMessage: {
        addListener(callback) {
          listener = callback;
        }
      }
    });

    expect(listener).toBeDefined();

    const sendResponse = vi.fn();
    const handled = listener?.(
      createStorageRequest(STORAGE_ACTION.PING, null),
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(handled).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, data: expect.objectContaining({ ready: true }) })
    );
  });
});
