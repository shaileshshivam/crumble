import { describe, expect, it } from 'vitest';
import { routePaletteCommand } from './command-routing.js';

describe('command-routing', () => {
  it('routes add-entry according to active scope', () => {
    expect(routePaletteCommand('add-entry', { cookieScope: true })).toEqual({
      blocked: false,
      action: 'add-cookie'
    });
    expect(routePaletteCommand('add-entry', { cookieScope: false })).toEqual({
      blocked: false,
      action: 'add-storage'
    });
  });

  it('blocks cookie-only commands outside cookie scope', () => {
    const result = routePaletteCommand('bulk-delete-filtered', { cookieScope: false });
    expect(result.blocked).toBe(true);
    expect(result.message).toContain('Cookies scope');
  });

  it('routes supported commands and rejects unknown ids', () => {
    expect(routePaletteCommand('toggle-redaction', { cookieScope: true })).toEqual({
      blocked: false,
      action: 'toggle-redaction'
    });

    const unknown = routePaletteCommand('unknown-command', { cookieScope: true });
    expect(unknown.blocked).toBe(true);
    expect(unknown.action).toBe('unknown');
  });
});

