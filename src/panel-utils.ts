const TRANSIENT_STORAGE_ERROR_REGEX = /(Receiving end does not exist|Could not establish connection|No tab with id)/i;

export function isTransientStorageBridgeErrorMessage(message: string): boolean {
  return TRANSIENT_STORAGE_ERROR_REGEX.test(message);
}

export function parseJsonCandidate(value: unknown, redactionEnabled: boolean): unknown | null {
  if (redactionEnabled || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const firstChar = trimmed[0];
  if (firstChar !== '{' && firstChar !== '[') {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
