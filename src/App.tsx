import { useCallback, useEffect, useState } from 'react';
import { AllModals } from './components/AllModals';
import { CookieListPanel } from './components/CookieListPanel';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ScopeTabs } from './components/ScopeTabs';

// ── Theme logic ────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'cookie-snatcher-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'system';
}

function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// ── App component ──────────────────────────────────────────────

export function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  const themeIcon =
    theme === 'dark' ? 'fa-moon' : theme === 'light' ? 'fa-sun' : 'fa-circle-half-stroke';
  const themeLabel =
    theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto';

  return (
    <>
      <div className="container">
        <Header themeIcon={themeIcon} themeLabel={themeLabel} onCycleTheme={cycleTheme} />
        <ScopeTabs />
        <CookieListPanel />
        <Footer />
      </div>
      <AllModals />
    </>
  );
}
