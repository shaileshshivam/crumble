// @ts-check

import {
  STORAGE_ACTION,
  STORAGE_AREA,
  createStorageRequest,
  isStorageResponse
} from './storage-contract.js';

/**
 * @param {number} tabId
 */
export async function ensureStorageBridgeReady(tabId) {
  try {
    await sendStorageRequest(tabId, STORAGE_ACTION.PING, null);
  } catch {
    await injectStorageBridge(tabId);
    await sendStorageRequest(tabId, STORAGE_ACTION.PING, null);
  }
}

/**
 * @param {number} tabId
 * @param {'localStorage' | 'sessionStorage'} storageArea
 */
export async function getStorageEntries(tabId, storageArea) {
  return sendStorageRequest(tabId, STORAGE_ACTION.GET_ALL, storageArea);
}

/**
 * @param {number} tabId
 * @param {'localStorage' | 'sessionStorage'} storageArea
 * @param {string} key
 * @param {string} value
 */
export async function setStorageEntry(tabId, storageArea, key, value) {
  return sendStorageRequest(tabId, STORAGE_ACTION.SET, storageArea, { key, value });
}

/**
 * @param {number} tabId
 * @param {'localStorage' | 'sessionStorage'} storageArea
 * @param {string} key
 */
export async function removeStorageEntry(tabId, storageArea, key) {
  return sendStorageRequest(tabId, STORAGE_ACTION.REMOVE, storageArea, { key });
}

/**
 * @param {number} tabId
 * @param {'localStorage' | 'sessionStorage'} storageArea
 */
export async function clearStorageEntries(tabId, storageArea) {
  return sendStorageRequest(tabId, STORAGE_ACTION.CLEAR, storageArea);
}

/**
 * @param {number} tabId
 */
async function injectStorageBridge(tabId) {
  const scriptPath = resolveStorageBridgeScriptPath();
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: [scriptPath]
      },
      () => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(undefined);
      }
    );
  });
}

function resolveStorageBridgeScriptPath() {
  const manifest = chrome.runtime && typeof chrome.runtime.getManifest === 'function'
    ? chrome.runtime.getManifest()
    : null;

  if (manifest && Array.isArray(manifest.content_scripts)) {
    const scriptEntries = manifest.content_scripts.flatMap((entry) => entry.js || []);
    const scriptPath = scriptEntries.find((path) => typeof path === 'string' && path.includes('content-script'));
    if (scriptPath) {
      return scriptPath;
    }
  }

  return 'content-script.js';
}

/**
 * @param {number} tabId
 * @param {typeof STORAGE_ACTION[keyof typeof STORAGE_ACTION]} action
 * @param {'localStorage' | 'sessionStorage' | null} storageArea
 * @param {Record<string, unknown>} [payload]
 */
function sendStorageRequest(tabId, action, storageArea, payload = {}) {
  const request = createStorageRequest(action, storageArea, payload);

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, request, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (!isStorageResponse(response)) {
        reject(new Error('Invalid storage bridge response.'));
        return;
      }

      if (!response.ok) {
        reject(new Error(response.error || 'Storage operation failed.'));
        return;
      }

      resolve(response.data);
    });
  });
}

export { STORAGE_AREA };
