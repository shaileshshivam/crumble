import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_AREA,
  clearStorageEntries,
  ensureStorageBridgeReady,
  getStorageEntries,
  removeStorageEntry,
  setStorageEntry
} from './storage-bridge.js';

function setupChromeMock({
  sendMessageImpl,
  manifestContentScripts = [{ js: ['content-script.js'] }],
  executeScriptImpl = (_options, callback) => {
    globalThis.chrome.runtime.lastError = null;
    callback();
  }
}) {
  globalThis.chrome = {
    runtime: {
      lastError: null,
      getManifest: vi.fn(() => ({
        content_scripts: manifestContentScripts
      }))
    },
    tabs: {
      sendMessage: vi.fn((tabId, message, callback) => {
        globalThis.chrome.runtime.lastError = null;
        sendMessageImpl(tabId, message, callback);
      })
    },
    scripting: {
      executeScript: vi.fn((options, callback) => executeScriptImpl(options, callback))
    }
  };
}

describe('storage-bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a GET_ALL request and resolves data', async () => {
    setupChromeMock({
      sendMessageImpl: (_tabId, _message, callback) => {
        callback({ channel: 'cookie-snatcher-storage-v1', ok: true, data: { items: [] } });
      }
    });

    const data = await getStorageEntries(123, STORAGE_AREA.LOCAL);
    expect(data).toEqual({ items: [] });
  });

  it('rejects when runtime error is present', async () => {
    setupChromeMock({
      sendMessageImpl: (_tabId, _message, callback) => {
        globalThis.chrome.runtime.lastError = { message: 'No receiver' };
        callback(undefined);
      }
    });

    await expect(getStorageEntries(123, STORAGE_AREA.LOCAL)).rejects.toThrow('No receiver');
  });

  it('injects bridge if ping fails and retries', async () => {
    let pingCount = 0;

    setupChromeMock({
      sendMessageImpl: (_tabId, message, callback) => {
        if (message.action === 'storage.ping') {
          pingCount += 1;
          if (pingCount === 1) {
            globalThis.chrome.runtime.lastError = { message: 'No listener' };
            callback(undefined);
            return;
          }
        }

        globalThis.chrome.runtime.lastError = null;
        callback({ channel: 'cookie-snatcher-storage-v1', ok: true, data: { ready: true } });
      }
    });

    await ensureStorageBridgeReady(123);

    expect(globalThis.chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(globalThis.chrome.scripting.executeScript.mock.calls[0][0]).toEqual({
      target: { tabId: 123 },
      files: ['content-script.js']
    });
  });

  it('injects built content-script loader path when present in manifest', async () => {
    let pingCount = 0;

    setupChromeMock({
      manifestContentScripts: [{ js: ['assets/content-script.js-loader-abc.js'] }],
      sendMessageImpl: (_tabId, message, callback) => {
        if (message.action === 'storage.ping') {
          pingCount += 1;
          if (pingCount === 1) {
            globalThis.chrome.runtime.lastError = { message: 'No listener' };
            callback(undefined);
            return;
          }
        }

        globalThis.chrome.runtime.lastError = null;
        callback({ channel: 'cookie-snatcher-storage-v1', ok: true, data: { ready: true } });
      }
    });

    await ensureStorageBridgeReady(123);

    expect(globalThis.chrome.scripting.executeScript.mock.calls[0][0]).toEqual({
      target: { tabId: 123 },
      files: ['assets/content-script.js-loader-abc.js']
    });
  });

  it('supports set/remove/clear helpers', async () => {
    setupChromeMock({
      sendMessageImpl: (_tabId, _message, callback) => {
        callback({ channel: 'cookie-snatcher-storage-v1', ok: true, data: { done: true } });
      }
    });

    await expect(setStorageEntry(1, STORAGE_AREA.SESSION, 'k', 'v')).resolves.toEqual({ done: true });
    await expect(removeStorageEntry(1, STORAGE_AREA.SESSION, 'k')).resolves.toEqual({ done: true });
    await expect(clearStorageEntries(1, STORAGE_AREA.SESSION)).resolves.toEqual({ done: true });
  });
});
