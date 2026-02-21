import { describe, expect, it } from 'vitest';
import {
  deriveCookieUrl,
  filterCookiesForActiveView,
  getCookieStorageKey,
  groupCookiesByDomain,
  parseDateToUnixSeconds,
  sortCookiesByPinned
} from './cookie-data.js';

function makeCookie({ domain, name, value = '', path = '/', secure = false }) {
  return {
    domain,
    name,
    value,
    path,
    secure,
    httpOnly: false,
    sameSite: 'lax'
  };
}

describe('cookie-data', () => {
  it('builds stable cookie storage keys', () => {
    expect(getCookieStorageKey({ domain: '.example.com', name: 'sid' })).toBe('.example.com:sid');
  });

  it('sorts cookies by pinned status then domain then name without mutating source', () => {
    const source = [
      makeCookie({ domain: '.example.com', name: 'b' }),
      makeCookie({ domain: '.a.com', name: 'a' }),
      makeCookie({ domain: '.example.com', name: 'a' })
    ];

    const sorted = sortCookiesByPinned(source, { '.example.com:b': true });

    expect(sorted.map((cookie) => `${cookie.domain}:${cookie.name}`)).toEqual([
      '.example.com:b',
      '.a.com:a',
      '.example.com:a'
    ]);
    expect(source.map((cookie) => `${cookie.domain}:${cookie.name}`)).toEqual([
      '.example.com:b',
      '.a.com:a',
      '.example.com:a'
    ]);
  });

  it('filters current-view cookies using domain and name search', () => {
    const cookies = [
      makeCookie({ domain: '.example.com', name: 'session_token' }),
      makeCookie({ domain: '.other.com', name: 'session_token' }),
      makeCookie({ domain: '.example.com', name: 'prefs' })
    ];

    const filtered = filterCookiesForActiveView({
      cookies,
      activeTab: 'current',
      currentDomain: 'app.example.com',
      searchTerm: 'session'
    });

    expect(filtered.map((cookie) => cookie.name)).toEqual(['session_token']);
  });

  it('filters all-view cookies using name, value, and domain', () => {
    const cookies = [
      makeCookie({ domain: '.example.com', name: 'foo', value: 'abc-token' }),
      makeCookie({ domain: '.other.com', name: 'bar', value: 'zzz' })
    ];

    expect(
      filterCookiesForActiveView({
        cookies,
        activeTab: 'all',
        currentDomain: 'example.com',
        searchTerm: 'token'
      }).length
    ).toBe(1);

    expect(
      filterCookiesForActiveView({
        cookies,
        activeTab: 'all',
        currentDomain: 'example.com',
        searchTerm: 'other.com'
      }).length
    ).toBe(1);
  });

  it('groups cookies by domain', () => {
    const grouped = groupCookiesByDomain([
      makeCookie({ domain: '.example.com', name: 'a' }),
      makeCookie({ domain: '.example.com', name: 'b' }),
      makeCookie({ domain: '.other.com', name: 'c' })
    ]);

    expect(grouped['.example.com']).toHaveLength(2);
    expect(grouped['.other.com']).toHaveLength(1);
  });

  it('derives cookie URLs with protocol, domain, and path normalization', () => {
    expect(deriveCookieUrl({ domain: '.example.com', path: 'foo', secure: true })).toBe(
      'https://example.com/foo'
    );
    expect(() => deriveCookieUrl({ domain: 'http://example.com', path: '/' })).toThrow();
  });

  it('parses date strings to unix seconds', () => {
    expect(parseDateToUnixSeconds('')).toBeNull();
    expect(parseDateToUnixSeconds('not-a-date')).toBe('invalid');

    const ts = parseDateToUnixSeconds('2026-01-01T00:00');
    expect(typeof ts).toBe('number');
  });
});
