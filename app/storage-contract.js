// @ts-check

export const STORAGE_MESSAGE_CHANNEL = 'cookie-snatcher-storage-v1';

export const STORAGE_AREA = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage'
};

export const STORAGE_ACTION = {
  PING: 'storage.ping',
  GET_ALL: 'storage.getAll',
  SET: 'storage.set',
  REMOVE: 'storage.remove',
  CLEAR: 'storage.clear'
};

const VALID_STORAGE_AREAS = new Set(Object.values(STORAGE_AREA));
const VALID_STORAGE_ACTIONS = new Set(Object.values(STORAGE_ACTION));

/**
 * @param {unknown} value
 * @returns {value is 'localStorage' | 'sessionStorage'}
 */
export function isStorageArea(value) {
  return typeof value === 'string' && VALID_STORAGE_AREAS.has(value);
}

/**
 * @param {unknown} value
 * @returns {value is typeof STORAGE_ACTION[keyof typeof STORAGE_ACTION]}
 */
export function isStorageAction(value) {
  return typeof value === 'string' && VALID_STORAGE_ACTIONS.has(value);
}

/**
 * @param {typeof STORAGE_ACTION[keyof typeof STORAGE_ACTION]} action
 * @param {'localStorage' | 'sessionStorage' | null} storageArea
 * @param {Record<string, unknown>} [payload]
 */
export function createStorageRequest(action, storageArea, payload = {}) {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    action,
    storageArea,
    payload
  };
}

/**
 * @param {unknown} message
 * @returns {message is { channel: string; action: string; storageArea: 'localStorage' | 'sessionStorage' | null; payload: Record<string, unknown> }}
 */
export function isStorageRequest(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const candidate = /** @type {{ channel?: unknown; action?: unknown; storageArea?: unknown; payload?: unknown }} */ (message);
  const channelValid = candidate.channel === STORAGE_MESSAGE_CHANNEL;
  const actionValid = isStorageAction(candidate.action);
  const areaValid = candidate.storageArea === null || isStorageArea(candidate.storageArea);
  const payloadValid = typeof candidate.payload === 'object' && candidate.payload !== null;

  return channelValid && actionValid && areaValid && payloadValid;
}

/**
 * @param {unknown} data
 */
export function createStorageSuccess(data) {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    ok: true,
    data
  };
}

/**
 * @param {string} error
 */
export function createStorageError(error) {
  return {
    channel: STORAGE_MESSAGE_CHANNEL,
    ok: false,
    error
  };
}

/**
 * @param {unknown} response
 * @returns {response is { channel: string; ok: boolean; data?: unknown; error?: string }}
 */
export function isStorageResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const candidate = /** @type {{ channel?: unknown; ok?: unknown; error?: unknown }} */ (response);
  if (candidate.channel !== STORAGE_MESSAGE_CHANNEL) {
    return false;
  }

  if (typeof candidate.ok !== 'boolean') {
    return false;
  }

  if (!candidate.ok && typeof candidate.error !== 'string') {
    return false;
  }

  return true;
}
