// @ts-check

export const NON_EDITABLE_DOMAIN_LABELS = new Set([
  'chrome',
  'about',
  'Invalid URL',
  'Empty Tab',
  'N/A',
  'Local File'
]);

/**
 * @param {chrome.tabs.Tab | null} tab
 * @returns {{ domain: string; tabUrl: string }}
 */
export function parseCurrentDomainContext(tab) {
  if (!tab) {
    return {
      domain: 'N/A',
      tabUrl: ''
    };
  }

  if (typeof tab.url !== 'string') {
    return {
      domain: 'Empty Tab',
      tabUrl: ''
    };
  }

  return {
    domain: parseDomainLabelFromUrl(tab.url),
    tabUrl: tab.url
  };
}

/**
 * @param {string} tabUrl
 * @returns {string}
 */
export function parseDomainLabelFromUrl(tabUrl) {
  try {
    const url = new URL(tabUrl);
    if (url.protocol === 'chrome:' || url.protocol === 'about:') {
      return url.protocol.replace(':', '');
    }

    if (url.hostname) {
      return url.hostname;
    }

    return 'Local File';
  } catch {
    if (tabUrl.startsWith('file:')) {
      return 'Local File';
    }

    return 'Invalid URL';
  }
}

/**
 * @param {string} domain
 * @returns {boolean}
 */
export function canEditCurrentDomain(domain) {
  return Boolean(domain) && !NON_EDITABLE_DOMAIN_LABELS.has(domain);
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function suggestDomainForCookie(domain) {
  return domain.startsWith('.') ? domain : `.${domain}`;
}

/**
 * @param {chrome.cookies.Cookie} cookie
 * @param {string} currentDomain
 * @returns {boolean}
 */
export function isCookieInCurrentDomain(cookie, currentDomain) {
  if (!cookie || !cookie.domain || !canEditCurrentDomain(currentDomain)) {
    return false;
  }

  const normalizedHost = normalizeDomain(currentDomain);
  const normalizedCookieDomain = normalizeDomain(cookie.domain);

  return (
    normalizedHost === normalizedCookieDomain ||
    normalizedHost.endsWith(`.${normalizedCookieDomain}`)
  );
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeDomain(value) {
  return value.trim().replace(/^\./, '').toLowerCase();
}
