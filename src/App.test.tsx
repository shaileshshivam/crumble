import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { REQUIRED_ELEMENT_IDS } from './panel-controller';

describe('App shell', () => {
  it('renders the side panel root structure with required IDs', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('id="search-input"');
    expect(html).toContain('id="current-domain-tab"');
    expect(html).toContain('id="all-domains-tab"');
    expect(html).toContain('id="cookie-edit-modal"');
    expect(html).toContain('id="command-palette-modal"');
    expect(html).toContain('id="json-view-modal"');
  });

  it('contains all scope controls needed by the legacy controller', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('id="scope-cookies-btn"');
    expect(html).toContain('id="scope-localstorage-btn"');
    expect(html).toContain('id="scope-sessionstorage-btn"');
  });

  it('renders all required controller element IDs', () => {
    const html = renderToStaticMarkup(<App />);

    for (const id of REQUIRED_ELEMENT_IDS) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
