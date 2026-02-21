// FOUC prevention: apply saved theme before first paint.
// Extracted to external file to comply with Chrome Extension CSP (no inline scripts).
try {
    const t = localStorage.getItem('cookie-snatcher-theme');
    if (t === 'dark' || t === 'light') {
        document.documentElement.setAttribute('data-theme', t);
    }
} catch {
    /* ignore */
}
