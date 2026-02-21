import { describe, expect, it } from 'vitest';
import {
  canEditCurrentDomain,
  isCookieInCurrentDomain,
  parseCurrentDomainContext,
  parseDomainLabelFromUrl,
  suggestDomainForCookie
} from './domain-context.js';

describe('domain-context', () => {
  it('parses a regular HTTPS tab domain', () => {
    const context = parseCurrentDomainContext({ url: 'https://sub.example.com/path?q=1' });
    expect(context).toEqual({
      domain: 'sub.example.com',
      tabUrl: 'https://sub.example.com/path?q=1'
    });
  });

  it('handles non-web and invalid URLs', () => {
    expect(parseDomainLabelFromUrl('chrome://settings')).toBe('chrome');
    expect(parseDomainLabelFromUrl('file:///tmp/test.txt')).toBe('Local File');
    expect(parseDomainLabelFromUrl('not-a-url')).toBe('Invalid URL');
  });

  it('detects empty or unavailable tabs', () => {
    expect(parseCurrentDomainContext(null)).toEqual({ domain: 'N/A', tabUrl: '' });
    expect(parseCurrentDomainContext({})).toEqual({ domain: 'Empty Tab', tabUrl: '' });
  });

  it('enforces editable domain labels', () => {
    expect(canEditCurrentDomain('example.com')).toBe(true);
    expect(canEditCurrentDomain('chrome')).toBe(false);
    expect(canEditCurrentDomain('Local File')).toBe(false);
  });

  it('matches cookies to current domain safely', () => {
    const cookie = { domain: '.example.com', name: 'sid' };
    expect(isCookieInCurrentDomain(cookie, 'example.com')).toBe(true);
    expect(isCookieInCurrentDomain(cookie, 'api.example.com')).toBe(true);
    expect(isCookieInCurrentDomain(cookie, 'malicious-example.com')).toBe(false);
  });

  it('suggests leading-dot cookie domain', () => {
    expect(suggestDomainForCookie('example.com')).toBe('.example.com');
    expect(suggestDomainForCookie('.example.com')).toBe('.example.com');
  });
});
