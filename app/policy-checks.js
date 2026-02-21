// @ts-check

const SENSITIVE_COOKIE_PATTERN = /(token|session|auth|jwt|sid|secret)/i;

/**
 * @param {chrome.cookies.Cookie} cookie
 * @returns {Array<{ code: string; message: string }>}
 */
export function evaluateCookiePolicies(cookie) {
  /** @type {Array<{ code: string; message: string }>} */
  const warnings = [];

  if (!cookie.secure) {
    warnings.push({
      code: 'secure-missing',
      message: 'Secure flag is not set.'
    });
  }

  if (SENSITIVE_COOKIE_PATTERN.test(cookie.name) && !cookie.httpOnly) {
    warnings.push({
      code: 'httponly-missing',
      message: 'Sensitive cookie should set HttpOnly.'
    });
  }

  if (cookie.sameSite === 'no_restriction' && !cookie.secure) {
    warnings.push({
      code: 'samesite-none-insecure',
      message: 'SameSite=None requires Secure.'
    });
  }

  if (!cookie.sameSite) {
    warnings.push({
      code: 'samesite-missing',
      message: 'SameSite should be explicitly set.'
    });
  }

  return warnings;
}

/**
 * @param {chrome.cookies.Cookie[]} cookies
 */
export function countPolicyWarnings(cookies) {
  return cookies.reduce((count, cookie) => count + evaluateCookiePolicies(cookie).length, 0);
}

