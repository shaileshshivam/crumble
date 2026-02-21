import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('design system integration', () => {
  it('keeps styles.css wired to token source of truth', () => {
    const styles = read('styles.css');
    expect(styles.includes("@import url('./design-system/tokens.css');")).toBe(true);
  });

  it('avoids hardcoded hex colors in styles.css', () => {
    const styles = read('styles.css');
    const hexColorPattern = /#[0-9a-fA-F]{3,8}/g;
    expect(styles.match(hexColorPattern)).toBeNull();
  });

  it('preserves legacy variable aliases in token file', () => {
    const tokens = read('design-system/tokens.css');

    const requiredAliases = [
      '--primary-color',
      '--secondary-color',
      '--accent-color',
      '--background-color',
      '--card-background',
      '--text-color',
      '--text-color-light',
      '--border-color',
      '--header-color',
      '--hover-color',
      '--pinned-background',
      '--button-hover',
      '--shadow',
      '--shadow-hover',
      '--border-radius',
      '--transition'
    ];

    requiredAliases.forEach((alias) => {
      expect(tokens.includes(`${alias}:`)).toBe(true);
    });
  });
});
