import {
  STORAGE_ACTION,
  createStorageError,
  createStorageSuccess,
  isStorageArea,
  isStorageRequest
} from './storage-contract';
import type { StorageRequest } from './storage-contract';

export type StorageArea = 'localStorage' | 'sessionStorage';

type StorageMessage = Pick<StorageRequest, 'action' | 'storageArea' | 'payload'>;

export interface RuntimeApi {
  onMessage: {
    addListener(
      callback: (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean
    ): void;
  };
}

function getStorageByArea(storageArea: StorageArea): Storage {
  if (storageArea === 'localStorage') {
    return window.localStorage;
  }

  return window.sessionStorage;
}

function readAllEntries(storageArea: StorageArea): { key: string; value: string }[] {
  const storage = getStorageByArea(storageArea);
  const items: { key: string; value: string }[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    items.push({ key, value: storage.getItem(key) ?? '' });
  }

  return items;
}

export function handleStorageRequest(request: StorageMessage) {
  if (request.action === STORAGE_ACTION.PING) {
    return createStorageSuccess({
      ready: true,
      origin: location.origin
    });
  }

  if (!isStorageArea(request.storageArea)) {
    return createStorageError('Invalid storage area.');
  }

  try {
    const storageArea: StorageArea = request.storageArea;
    const storage = getStorageByArea(storageArea);

    switch (request.action) {
      case STORAGE_ACTION.GET_ALL:
        return createStorageSuccess({
          origin: location.origin,
          storageArea,
          items: readAllEntries(storageArea)
        });

      case STORAGE_ACTION.SET: {
        const key = typeof request.payload.key === 'string' ? request.payload.key : '';
        const value = typeof request.payload.value === 'string' ? request.payload.value : '';
        if (!key) {
          return createStorageError('Storage key is required.');
        }

        storage.setItem(key, value);
        return createStorageSuccess({
          origin: location.origin,
          storageArea,
          key,
          value
        });
      }

      case STORAGE_ACTION.REMOVE: {
        const key = typeof request.payload.key === 'string' ? request.payload.key : '';
        if (!key) {
          return createStorageError('Storage key is required.');
        }

        storage.removeItem(key);
        return createStorageSuccess({
          origin: location.origin,
          storageArea,
          key
        });
      }

      case STORAGE_ACTION.CLEAR:
        storage.clear();
        return createStorageSuccess({
          origin: location.origin,
          storageArea,
          cleared: true
        });

      default:
        return createStorageError('Unsupported storage action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage operation failed.';
    return createStorageError(message);
  }
}

export function registerStorageListener(
  runtimeApi: RuntimeApi
): void {
  runtimeApi.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isStorageRequest(message)) {
      return false;
    }

    sendResponse(handleStorageRequest(message));
    return true;
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  registerStorageListener(chrome.runtime as unknown as RuntimeApi);
}
