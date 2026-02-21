import { describe, expect, it } from 'vitest';
import { countPolicyWarnings, evaluateCookiePolicies } from './policy-checks.js';

function makeCookie(overrides = {}) {
  return /** @type {chrome.cookies.Cookie} */ ({
    name: 'session',
    value: 'abc',
    domain: '.example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    storeId: '0',
    session: true,
    ...overrides
  });
}

describe('policy-checks', () => {
  it('returns no warnings for compliant cookie', () => {
    expect(evaluateCookiePolicies(makeCookie())).toEqual([]);
  });

  it('flags insecure sensitive cookie and samesite issues', () => {
    const warnings = evaluateCookiePolicies(
      makeCookie({
        name: 'authToken',
        secure: false,
        httpOnly: false,
        sameSite: 'no_restriction'
      })
    );

    expect(warnings.map((warning) => warning.code)).toEqual([
      'secure-missing',
      'httponly-missing',
      'samesite-none-insecure'
    ]);
  });

  it('flags missing samesite', () => {
    const warnings = evaluateCookiePolicies(
      makeCookie({
        sameSite: undefined
      })
    );

    expect(warnings.map((warning) => warning.code)).toContain('samesite-missing');
  });

  it('counts warnings across cookie list', () => {
    const warningCount = countPolicyWarnings([
      makeCookie(),
      makeCookie({
        secure: false,
        httpOnly: false,
        sameSite: 'no_restriction'
      })
    ]);

    expect(warningCount).toBe(3);
  });
});

