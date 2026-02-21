// @ts-check

/**
 * @typedef {{
 *   name: string;
 *   value: string;
 *   domain: string;
 *   path: string;
 *   secure: boolean;
 *   httpOnly: boolean;
 *   sameSite: string;
 *   storeId?: string;
 *   expirationDate?: number;
 * }} CookieImportDetails
 */

/**
 * @param {chrome.cookies.Cookie[]} cookies
 * @returns {{
 *   name: string;
 *   value: string;
 *   domain: string;
 *   path: string;
 *   secure: boolean;
 *   httpOnly: boolean;
 *   sameSite: string | null | undefined;
 *   expirationDate: number | undefined;
 *   storeId: string | undefined;
 * }[]}
 */
export function mapCookiesForExport(cookies) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate,
    storeId: cookie.storeId
  }));
}

/**
 * @param {unknown} payload
 * @param {number} [nowMs]
 * @returns {{ total: number; invalidCount: number; validEntries: CookieImportDetails[] }}
 */
export function createCookieImportPlan(payload, nowMs = Date.now()) {
  if (!Array.isArray(payload)) {
    throw new Error('Input must be a JSON array.');
  }

  /** @type {CookieImportDetails[]} */
  const validEntries = [];
  let invalidCount = 0;

  payload.forEach((cookie) => {
    if (!cookie || typeof cookie !== 'object') {
      invalidCount += 1;
      return;
    }

    const candidate = /** @type {{
     *  name?: unknown;
     *  value?: unknown;
     *  domain?: unknown;
     *  path?: unknown;
     *  secure?: unknown;
     *  httpOnly?: unknown;
     *  sameSite?: unknown;
     *  storeId?: unknown;
     *  expirationDate?: unknown;
     * }} */ (cookie);

    if (
      typeof candidate.name !== 'string' ||
      typeof candidate.value !== 'string' ||
      typeof candidate.domain !== 'string'
    ) {
      invalidCount += 1;
      return;
    }

    const hasFutureExpiration =
      typeof candidate.expirationDate === 'number' && candidate.expirationDate * 1000 > nowMs;

    validEntries.push({
      name: candidate.name,
      value: candidate.value,
      domain: candidate.domain,
      path: typeof candidate.path === 'string' && candidate.path ? candidate.path : '/',
      secure: Boolean(candidate.secure),
      httpOnly: Boolean(candidate.httpOnly),
      sameSite: typeof candidate.sameSite === 'string' && candidate.sameSite ? candidate.sameSite : 'lax',
      storeId: typeof candidate.storeId === 'string' ? candidate.storeId : undefined,
      expirationDate: hasFutureExpiration ? candidate.expirationDate : undefined
    });
  });

  return {
    total: payload.length,
    invalidCount,
    validEntries
  };
}
