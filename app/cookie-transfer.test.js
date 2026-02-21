import { describe, expect, it } from 'vitest';
import { createCookieImportPlan, mapCookiesForExport } from './cookie-transfer.js';

describe('cookie-transfer', () => {
  it('maps cookies for export', () => {
    const payload = mapCookiesForExport([
      {
        name: 'session',
        value: 'abc',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        expirationDate: 1900000000,
        storeId: '0'
      }
    ]);

    expect(payload).toEqual([
      {
        name: 'session',
        value: 'abc',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        expirationDate: 1900000000,
        storeId: '0'
      }
    ]);
  });

  it('throws when import payload is not an array', () => {
    expect(() => createCookieImportPlan({ bad: true })).toThrow('Input must be a JSON array.');
  });

  it('normalizes valid cookies and counts invalid ones', () => {
    const now = 1700000000000;
    const plan = createCookieImportPlan(
      [
        {
          name: 'token',
          value: 'abc',
          domain: '.example.com',
          expirationDate: 1700000100,
          secure: 1,
          httpOnly: 0,
          sameSite: 'strict',
          path: '/auth'
        },
        {
          name: 'old',
          value: '1',
          domain: '.example.com',
          expirationDate: 1600000000
        },
        {
          name: 'broken',
          value: 1,
          domain: '.example.com'
        }
      ],
      now
    );

    expect(plan.total).toBe(3);
    expect(plan.invalidCount).toBe(1);
    expect(plan.validEntries).toEqual([
      {
        name: 'token',
        value: 'abc',
        domain: '.example.com',
        path: '/auth',
        secure: true,
        httpOnly: false,
        sameSite: 'strict',
        storeId: undefined,
        expirationDate: 1700000100
      },
      {
        name: 'old',
        value: '1',
        domain: '.example.com',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'lax',
        storeId: undefined,
        expirationDate: undefined
      }
    ]);
  });
});
