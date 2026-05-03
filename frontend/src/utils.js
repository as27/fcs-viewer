export const FONT_SIZE_KEY = 'fcs-font-size';
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 14;

export function getFontSize() {
    return parseInt(localStorage.getItem(FONT_SIZE_KEY) || FONT_SIZE_DEFAULT, 10);
}

export function applyFontSize(size) {
    document.documentElement.style.setProperty('--font-size-base', size + 'px');
    localStorage.setItem(FONT_SIZE_KEY, size);
}

export function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function formatDate(iso) {
    if (!iso || iso.length < 10) return iso || '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
}

export function formatTimestamp(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `Stand: ${dateStr} ${timeStr} Uhr`;
}

export const ICONS = {
    overview: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
    </svg>`,
    members: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 14c0-3 2.2-5 5-5s5 2 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="13" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/>
        <path d="M13 9c1.8.4 3 1.8 3 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
    finance: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
        <rect x="3" y="9.5" width="4" height="1.5" rx=".5" fill="currentColor"/>
    </svg>`,
    calendar: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="4" y="10" width="2" height="2" rx=".5" fill="currentColor"/>
        <rect x="7" y="10" width="2" height="2" rx=".5" fill="currentColor" opacity=".5"/>
        <rect x="10" y="10" width="2" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    </svg>`,
    inventory: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 7h12M6 3v10" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
    settings: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    search: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#aaa" stroke-width="1.5"/>
        <path d="M11 11l3 3" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
};
