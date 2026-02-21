import { describe, expect, it } from 'vitest';
import { diffProfileState } from './profile-diff.js';

function makeCookie(name, value, domain) {
  return /** @type {chrome.cookies.Cookie} */ ({
    name,
    value,
    domain,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    storeId: '0',
    session: true
  });
}

describe('profile-diff', () => {
  it('detects added, removed, and changed entries', () => {
    const profileState = {
      cookies: [
        { name: 'session', value: 'old', domain: '.example.com', path: '/', sameSite: 'lax' },
        { name: 'legacy', value: '1', domain: '.example.com', path: '/', sameSite: 'lax' }
      ],
      localStorageEntries: [
        { key: 'theme', value: 'light' },
        { key: 'stale', value: 'x' }
      ],
      sessionStorageEntries: [{ key: 'sid', value: 'abc' }]
    };

    const currentState = {
      cookies: [
        makeCookie('session', 'new', '.example.com'),
        makeCookie('added', '1', '.example.com')
      ],
      localStorageEntries: [
        { key: 'theme', value: 'dark' },
        { key: 'currentOnly', value: 'y' }
      ],
      sessionStorageEntries: []
    };

    const diff = diffProfileState(profileState, currentState);
    expect(diff.cookies.added).toContain('.example.com:added:/:0');
    expect(diff.cookies.removed).toContain('.example.com:legacy:/:0');
    expect(diff.cookies.changed.map((entry) => entry.key)).toContain('.example.com:session:/:0');

    expect(diff.localStorage.added).toEqual(['currentOnly']);
    expect(diff.localStorage.removed).toEqual(['stale']);
    expect(diff.localStorage.changed.map((entry) => entry.key)).toEqual(['theme']);

    expect(diff.sessionStorage.removed).toEqual(['sid']);
    expect(diff.summary.added).toBeGreaterThan(0);
    expect(diff.summary.removed).toBeGreaterThan(0);
    expect(diff.summary.changed).toBeGreaterThan(0);
  });

  it('returns zero summary when states are equal', () => {
    const profileState = {
      cookies: [{ name: 'session', value: 'same', domain: '.example.com', path: '/', sameSite: 'lax' }],
      localStorageEntries: [{ key: 'theme', value: 'dark' }],
      sessionStorageEntries: [{ key: 'sid', value: 'abc' }]
    };

    const currentState = {
      cookies: [makeCookie('session', 'same', '.example.com')],
      localStorageEntries: [{ key: 'theme', value: 'dark' }],
      sessionStorageEntries: [{ key: 'sid', value: 'abc' }]
    };

    const diff = diffProfileState(profileState, currentState);
    expect(diff.summary).toEqual({ added: 0, removed: 0, changed: 0 });
  });
});

