export const STORAGE_MESSAGE_CHANNEL = 'cookie-snatcher-storage-v1';

export const STORAGE_AREA = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage'
} as const;

export const STORAGE_ACTION = {
  PING: 'storage.ping',
  GET_ALL: 'storage.getAll',
  SET: 'storage.set',
  REMOVE: 'storage.remove',
  CLEAR: 'storage.clear'
} as const;

const VALID_STORAGE_AREAS = new Set(Object.values(STORAGE_AREA));
const VALID_STORAGE_ACTIONS = new Set(Object.values(STORAGE_ACTION));

export type StorageArea = (typeof STORAGE_AREA)[keyof typeof STORAGE_AREA];
export type StorageAction = (typeof STORAGE_ACTION)[keyof typeof STORAGE_ACTION];

export type StorageRequest = {
  channel: string;
  action: StorageAction;
  storageArea: StorageArea | null;
  payload: Record<string, unknown>;
};

export type StorageResponse =
  | {
      channel: string;
      ok: true;
      data: unknown;
    }
  | {
      channel: string;
      ok: false;
      error: string;
    };

export function isStorageArea(value: unknown): value is StorageArea {
  return typeof value === 'string' && VALID_STORAGE_AREAS.has(value as StorageArea);
}

export function isStorageAction(value: unknown): value is StorageAction {
  return typeof value === 'string' && VALID_STORAGE_ACTIONS.has(value as StorageAction);
}

export function createStorageRequest(
  action: StorageAction,
  storageArea: StorageArea | null,
  payload: Record<string, unknown> = {}
): StorageRequest {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    action,
    storageArea,
    payload
  };
}

export function isStorageRequest(message: unknown): message is StorageRequest {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const candidate = message as {
    channel?: unknown;
    action?: unknown;
    storageArea?: unknown;
    payload?: unknown;
  };

  const channelValid = candidate.channel === STORAGE_MESSAGE_CHANNEL;
  const actionValid = isStorageAction(candidate.action);
  const areaValid = candidate.storageArea === null || isStorageArea(candidate.storageArea);
  const payloadValid = typeof candidate.payload === 'object' && candidate.payload !== null;

  return channelValid && actionValid && areaValid && payloadValid;
}

export function createStorageSuccess(data: unknown): StorageResponse {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    ok: true,
    data
  };
}

export function createStorageError(error: string): StorageResponse {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    ok: false,
    error
  };
}
