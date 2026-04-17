import './style.css';
import './app.css';
import { GetSettings, GetDepartments, GetMembers, ReloadMembers, ReloadConfig, GetDepartmentOverview, GetCalendars, GetCalendarEvents, ExportPublicKey, ExportMembersExcel, GetBankAccounts, GetBookings, GetOpenInvoices, ReloadOpenInvoices, GetFinanceOverview } from '../wailsjs/go/main/App';

// ── Icons (inline SVG) ─────────────────────────────────────────────────────────
const ICONS = {
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
    settings: `<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    search: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#aaa" stroke-width="1.5"/>
        <path d="M11 11l3 3" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
};

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
    activeTab: 'members',
    activeModules: null, // null = noch nicht geladen (alle sichtbar)
    departments: [],
    selectedDept: '',
    members: [],
    loading: false,
    configLoading: false,
    error: '',
    overview: null,        // DepartmentDetail[] | null
    overviewLoading: false,
    overviewError: '',
    overviewExpanded: {},  // { [deptName]: bool } – true = aufgeklappt
    search: '',
    sortCol: 'familyName',
    sortDir: 'asc',
    colMenuOpen: false,
    settings: null,
    // Calendar state
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1,
    calEvents: [],         // CalendarEvent[]
    calCalendars: [],      // CalendarInfo[] from API + birthday pseudo-calendar
    calEnabled: {},        // { [calendarId]: bool }
    calLoading: false,
    calError: '',
    calView: 'month',      // 'month' | 'list'
    // Finance state
    financeTab: 'overview',
    financeOverview: null,
    financeOverviewLoading: false,
    financeOverviewError: '',
    financeAccounts: [],       // BankAccountInfo[]
    financeAccountsLoading: false,
    financeAccountsError: '',
    financeSelectedAccountID: 0,
    financeBookings: [],       // BookingRow[]
    financeBookingsLoading: false,
    financeBookingsError: '',
    financeBookingSearch: '',
    financeBookingDateFrom: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; })(),
    financeBookingDateTo: new Date().toISOString().slice(0,10),
    // Finance invoices state
    financeInvoices: [],
    financeInvoicesLoading: false,
    financeInvoicesError: '',
    financeInvoiceSearch: '',
    columns: [
        { key: 'membershipNumber', label: 'Nr.',           visible: true  },
        { key: 'familyName',       label: 'Nachname',      visible: true  },
        { key: 'firstName',        label: 'Vorname',       visible: true  },
        { key: 'age',              label: 'Alter',         visible: true  },
        { key: 'dateOfBirth',      label: 'Geburtsdatum',  visible: true  },
        { key: 'email',            label: 'E-Mail',        visible: true  },
        { key: 'phone',            label: 'Telefon',       visible: false },
        { key: 'mobile',           label: 'Mobil',         visible: false },
        { key: 'street',           label: 'Straße',        visible: false },
        { key: 'zip',              label: 'PLZ',           visible: false },
        { key: 'city',             label: 'Stadt',         visible: false },
        { key: 'joinDate',         label: 'Eintritt',      visible: false },
        { key: 'resignationDate',  label: 'Austritt',      visible: false },
        { key: 'groups',           label: 'Gruppen',       visible: true  },
        { key: 'groupShorts',      label: 'Kürzel',        visible: true  },
    ],
};

const PAGE_TITLES = {
    overview: 'Abteilungen',
    members:  'Mitglieder',
    finance:  'Finanzen',
    calendar: 'Kalender',
    settings: 'Einstellungen',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function filterAndSort() {
    let rows = [...state.members];
    if (state.search) {
        const q = state.search.toLowerCase();
        rows = rows.filter(m => Object.values(m).some(v => String(v ?? '').toLowerCase().includes(q)));
    }
    const col = state.sortCol, dir = state.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
        const av = String(a[col] ?? '').toLowerCase();
        const bv = String(b[col] ?? '').toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });
    return rows;
}

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
    document.getElementById('app').innerHTML = `
        <div class="app-shell">
            ${renderSidebar()}
            <div class="main">
                ${renderTopbar()}
                <div class="content" id="content">
                    ${renderContent()}
                </div>
            </div>
        </div>
    `;
    attachListeners();
}

function isModuleActive(key) {
    // Wenn keine Liste konfiguriert ist, sind alle Module aktiv.
    if (!state.activeModules || state.activeModules.length === 0) return true;
    return state.activeModules.includes(key);
}

function renderSidebar() {
    const nav = (tab, icon, label) => `
        <div class="nav-item ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">
            ${icon} ${label}
        </div>`;

    return `
        <div class="sidebar">
            <div class="sidebar-logo">
                <div class="logo-crest">
                    <svg width="28" height="28" viewBox="0 0 28 28">
                        <rect width="28" height="28" fill="#F5C400" rx="5"/>
                        <text x="14" y="19" text-anchor="middle" font-size="11" font-weight="800" fill="#111" font-family="system-ui,sans-serif">FCS</text>
                    </svg>
                </div>
                <div>
                    <div class="logo-name">1. FC Spich</div>
                    <div class="logo-sub">Mitgliederverwaltung</div>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-label">Hauptmenü</div>
                ${isModuleActive('overview')  ? nav('overview', ICONS.overview, 'Abteilungen') : ''}
                ${isModuleActive('members')   ? nav('members',  ICONS.members,  'Mitglieder')  : ''}
                ${isModuleActive('finance')   ? nav('finance',  ICONS.finance,  'Finanzen')    : ''}
                ${isModuleActive('calendar')  ? nav('calendar', ICONS.calendar, 'Kalender')    : ''}
            </div>

            <div class="nav-section">
                <div class="nav-label">System</div>
                ${nav('settings', ICONS.settings, 'Einstellungen')}
            </div>

            <div class="sidebar-footer">
                <div class="dept-selector">
                    <label>Abteilung</label>
                    <select class="dept-select" id="dept-select" ${state.departments.length === 0 ? 'disabled' : ''}>
                        ${state.departments.length === 0
                            ? '<option>— keine —</option>'
                            : state.departments.map(d =>
                                `<option value="${esc(d)}" ${d === state.selectedDept ? 'selected' : ''}>${esc(d)}</option>`
                              ).join('')}
                    </select>
                </div>
                <div class="sync-bar">
                    <div class="sync-dot ${state.loading ? 'active' : ''}"></div>
                    ${state.loading ? 'Wird geladen…' : state.members.length > 0 ? `${state.members.length} Mitglieder` : 'Bereit'}
                </div>
            </div>
        </div>
    `;
}

function renderTopbar() {
    const title = PAGE_TITLES[state.activeTab] || '';
    const showSearch = state.activeTab === 'members';
    return `
        <div class="topbar">
            <span class="topbar-title">${esc(title)}</span>
            <div class="topbar-spacer"></div>
            ${showSearch ? `
                <div class="search-wrap">
                    ${ICONS.search}
                    <input id="search-input" placeholder="Suchen…" value="${esc(state.search)}">
                </div>` : ''}
        </div>
    `;
}

function renderContent() {
    if (state.activeTab === 'members')  return renderMembers();
    if (state.activeTab === 'calendar') return `<div class="cal-wrapper">${renderCalendar()}</div>`;
    return `<div class="content-scroll">${
        state.activeTab === 'overview'  ? renderOverview()  :
        state.activeTab === 'settings'  ? renderSettings()  :
        renderFinance()
    }</div>`;
}

// ── Members ────────────────────────────────────────────────────────────────────
function renderMembers() {
    const visibleCols = state.columns.filter(c => c.visible);
    const rows = filterAndSort();

    const colMenu = state.colMenuOpen ? `
        <div class="col-toggle-menu">
            ${state.columns.map((c, i) => `
                <label>
                    <input type="checkbox" data-col="${i}" ${c.visible ? 'checked' : ''}>
                    ${esc(c.label)}
                </label>`).join('')}
        </div>` : '';

    const tableHtml = rows.length === 0
        ? `<div class="placeholder">${state.selectedDept ? 'Keine Mitglieder gefunden.' : 'Bitte eine Abteilung wählen.'}</div>`
        : `<table class="data-table">
            <thead><tr>
                ${visibleCols.map(c => `
                    <th class="${state.sortCol === c.key ? 'sort-' + state.sortDir : ''}"
                        data-sort="${c.key}">${esc(c.label)}</th>
                `).join('')}
            </tr></thead>
            <tbody>
                ${rows.map(m => `<tr>
                    ${visibleCols.map(c => `<td title="${esc(m[c.key])}">${esc(m[c.key])}</td>`).join('')}
                </tr>`).join('')}
            </tbody>
        </table>`;

    return `
        <div class="members-layout">
            <div class="members-toolbar">
                <div class="col-toggle">
                    <button class="btn-ghost" id="col-toggle-btn">Spalten</button>
                    ${colMenu}
                </div>
                <button class="btn-primary" id="reload-btn" ${state.loading ? 'disabled' : ''}>
                    ${state.loading ? '<span class="spinner"></span> Laden…' : 'Neu laden'}
                </button>
                <button class="btn-ghost" id="excel-export-btn" ${state.loading || !state.selectedDept ? 'disabled' : ''} title="Als Excel exportieren">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:-2px">
                        <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M4 5l3 3-3 3M9 11h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>Excel
                </button>
                ${state.error ? `<span class="err-msg">${esc(state.error)}</span>` : `<span class="status-count">${rows.length} Einträge</span>`}
            </div>
            <div class="card">
                ${state.loading && state.members.length === 0
                    ? '<div class="placeholder"><span class="spinner"></span></div>'
                    : `<div class="table-scroll">${tableHtml}</div>`}
            </div>
        </div>
    `;
}

// ── Department overview ────────────────────────────────────────────────────────
function renderOverview() {
    if (state.overviewLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.overviewError) {
        return `<div class="error-box">${esc(state.overviewError)}</div>`;
    }
    if (!state.overview) {
        return '<div class="placeholder">Keine Daten verfügbar.</div>';
    }

    return state.overview.map(dept => {
        const expanded = state.overviewExpanded[dept.name] === true; // default: eingeklappt
        const chevron = expanded
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        return `
        <div class="card">
            <div class="card-header overview-toggle" data-dept="${esc(dept.name)}" style="cursor:pointer">
                <span class="card-title">${esc(dept.name)}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:11px;color:#aaa">${dept.groups.length} Gruppe${dept.groups.length !== 1 ? 'n' : ''}</span>
                    <span style="color:#aaa;display:flex;align-items:center">${chevron}</span>
                </div>
            </div>
            ${expanded ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Kürzel</th>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${dept.groups.map(g => g.notFound
                        ? `<tr>
                            <td><span class="badge badge-amber">${esc(g.short)}</span></td>
                            <td colspan="3" style="color:#d97706;font-size:11px">Gruppe nicht in easyVerein gefunden</td>
                        </tr>`
                        : `<tr>
                            <td><span class="badge badge-yellow">${esc(g.short)}</span></td>
                            <td style="font-weight:600;white-space:normal">${esc(g.name)}</td>
                        </tr>`
                    ).join('')}
                </tbody>
            </table>` : ''}
        </div>`;
    }).join('');
}

// ── Finance ────────────────────────────────────────────────────────────────────
const FINANCE_TABS = ['overview', 'accounts', 'invoices'];
const FINANCE_TAB_LABELS = { overview: 'Übersicht', accounts: 'Bankkonten', invoices: 'Offene Rechnungen' };

function renderFinance() {
    const tabs = FINANCE_TABS.map(t => `
        <button class="sub-tab${state.financeTab === t ? ' active' : ''}"
            onclick="setFinanceTab('${t}')">${FINANCE_TAB_LABELS[t]}</button>
    `).join('');

    let content = '';
    if (state.financeTab === 'overview') content = renderFinanceOverview();
    else if (state.financeTab === 'accounts') content = renderFinanceAccounts();
    else if (state.financeTab === 'invoices') content = renderFinanceInvoices();

    return `
        <div class="sub-tab-bar">${tabs}</div>
        ${content}
    `;
}

function renderFinanceOverview() {
    const ov = state.financeOverview;
    const loading = state.financeOverviewLoading;

    const fmt = (v) => v != null ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '—';

    const now = new Date();
    const monthLabel = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

    const card = (label, value, sub, cls) => `
        <div class="stat-card">
            <div class="stat-label">${label}</div>
            <div class="stat-value${cls ? ' ' + cls : ''}">${loading ? '<span class="spinner"></span>' : value}</div>
            <div class="stat-sub">${sub}</div>
        </div>`;

    const income  = ov ? fmt(ov.incomeMonth)   : '—';
    const expense = ov ? fmt(Math.abs(ov.expenseMonth)) : '—';
    const balance = ov ? fmt(ov.balanceMonth)  : '—';
    const open    = ov ? fmt(ov.openInvoices)  : '—';
    const invCount = ov ? `${ov.invoiceCount} offene Rechnung${ov.invoiceCount !== 1 ? 'en' : ''}` : 'Noch nicht geladen';
    const balClass = ov ? (ov.balanceMonth >= 0 ? 'amount-pos' : 'amount-neg') : '';

    return `
        <div class="stat-row">
            ${card('Einnahmen ' + monthLabel, income,  'Summe positive Buchungen', 'amount-pos')}
            ${card('Ausgaben '  + monthLabel, expense, 'Summe negative Buchungen', 'amount-neg')}
            ${card('Saldo '     + monthLabel, balance, 'Einnahmen – Ausgaben', balClass)}
            ${card('Offene Posten', open, invCount, 'amount-neg')}
        </div>
        ${state.financeOverviewError ? `<div class="error-msg">${state.financeOverviewError}</div>` : ''}
    `;
}

function renderFinanceAccounts() {
    if (state.financeAccountsLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.financeAccountsError) {
        return `<div class="error-msg">${state.financeAccountsError}</div>`;
    }
    if (!state.financeAccounts || state.financeAccounts.length === 0) {
        return `<div class="card"><div class="card-header"><span class="card-title">Bankkonten</span></div>
            <div class="placeholder" style="padding:40px">Keine Bankkonten für diese Abteilung konfiguriert.</div></div>`;
    }

    const accs = state.financeAccounts;
    const selID = state.financeSelectedAccountID || accs[0].id;
    const selAcc = accs.find(a => a.id === selID) || accs[0];

    const options = accs.map(a =>
        `<option value="${a.id}"${a.id === selID ? ' selected' : ''}>${a.name}</option>`
    ).join('');

    const balanceFormatted = selAcc.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    // Build bookings table
    let bookingsSection = '';
    if (state.financeBookingsLoading) {
        bookingsSection = '<div class="placeholder"><span class="spinner"></span></div>';
    } else if (state.financeBookingsError) {
        bookingsSection = `<div class="error-msg">${state.financeBookingsError}</div>`;
    } else {
        const search = (state.financeBookingSearch || '').toLowerCase();
        const filtered = (state.financeBookings || []).filter(b => {
            if (!search) return true;
            return (b.receiver || '').toLowerCase().includes(search) ||
                   (b.description || '').toLowerCase().includes(search);
        });

        const rows = filtered.map(b => {
            const amtClass = b.amount >= 0 ? 'amount-pos' : 'amount-neg';
            const amtStr = b.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
            return `<tr>
                <td>${formatDate(b.date)}</td>
                <td>${escHtml(b.receiver || '')}</td>
                <td>${escHtml(b.description || '')}</td>
                <td class="${amtClass}" style="text-align:right;font-variant-numeric:tabular-nums">${amtStr}</td>
            </tr>`;
        }).join('');

        const empty = filtered.length === 0
            ? '<tr><td colspan="4" style="text-align:center;padding:24px;color:#888">Keine Buchungen gefunden.</td></tr>'
            : '';

        bookingsSection = `
            <table class="data-table">
                <thead><tr>
                    <th>Datum</th><th>Empfänger</th><th>Beschreibung</th><th style="text-align:right">Betrag</th>
                </tr></thead>
                <tbody>${rows}${empty}</tbody>
            </table>`;
    }

    return `
        <div class="card">
            <div class="card-header">
                <span class="card-title">Bankkonten</span>
                <select class="dept-select" onchange="setFinanceAccount(parseInt(this.value))" style="margin-left:auto">
                    ${options}
                </select>
            </div>
            <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:12px">Kontostand</span><br><strong style="font-size:16px">${balanceFormatted}</strong></div>
                ${selAcc.iban ? `<div style="margin-left:16px"><span style="color:#888;font-size:12px">IBAN</span><br><span style="font-family:monospace;font-size:13px">${selAcc.iban}</span></div>` : ''}
            </div>
            <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <label style="font-size:12px;color:#666">Von</label>
                <input type="date" class="search-input" style="width:140px" value="${state.financeBookingDateFrom}"
                    onchange="setFinanceDateFrom(this.value)">
                <label style="font-size:12px;color:#666">Bis</label>
                <input type="date" class="search-input" style="width:140px" value="${state.financeBookingDateTo}"
                    onchange="setFinanceDateTo(this.value)">
                <button class="btn-primary" onclick="loadFinanceBookings()">Laden</button>
                <div style="margin-left:auto;position:relative">
                    <input id="finance-search-input" type="text" class="search-input"
                        placeholder="Suche Empfänger / Beschreibung…"
                        style="width:220px" value="${escHtml(state.financeBookingSearch || '')}">
                </div>
            </div>
            ${bookingsSection}
        </div>
    `;
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderFinanceInvoices() {
    if (state.financeInvoicesLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.financeInvoicesError) {
        return `<div class="error-msg">${state.financeInvoicesError}</div>`;
    }

    const search = (state.financeInvoiceSearch || '').toLowerCase();
    const filtered = (state.financeInvoices || []).filter(inv => {
        if (!search) return true;
        return (inv.receiver || '').toLowerCase().includes(search) ||
               (inv.invNumber || '').toLowerCase().includes(search) ||
               (inv.description || '').toLowerCase().includes(search);
    });

    // Summary totals
    const totalOpen = filtered.reduce((s, inv) => s + inv.paymentDifference, 0);
    const totalOpenFmt = totalOpen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    const rows = filtered.map(inv => {
        const diffFmt = inv.paymentDifference.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        const totalFmt = inv.totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        return `<tr>
            <td>${escHtml(inv.invNumber || '')}</td>
            <td>${formatDate(inv.date)}</td>
            <td>${escHtml(inv.receiver || '')}</td>
            <td>${escHtml(inv.description || '')}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${totalFmt}</td>
            <td class="amount-neg" style="text-align:right;font-variant-numeric:tabular-nums">${diffFmt}</td>
        </tr>`;
    }).join('');

    const empty = filtered.length === 0
        ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:#888">${state.financeInvoices.length === 0 ? 'Keine offenen Rechnungen.' : 'Keine Treffer.'}</td></tr>`
        : '';

    return `
        <div class="card">
            <div class="card-header">
                <span class="card-title">Offene Rechnungen</span>
                <button class="btn-primary" style="margin-left:auto" onclick="loadInvoices()">Neu laden</button>
            </div>
            <div style="display:flex;gap:16px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:12px">Offener Gesamtbetrag</span><br>
                    <strong class="amount-neg" style="font-size:16px">${totalOpenFmt}</strong>
                    <span style="color:#888;font-size:12px;margin-left:6px">(${filtered.length} Rechnung${filtered.length !== 1 ? 'en' : ''})</span>
                </div>
                <div style="margin-left:auto">
                    <input id="invoice-search-input" type="text" class="search-input"
                        placeholder="Suche Name / Nr. / Beschreibung…"
                        style="width:240px" value="${escHtml(state.financeInvoiceSearch || '')}">
                </div>
            </div>
            <table class="data-table">
                <thead><tr>
                    <th>Nr.</th><th>Datum</th><th>Empfänger</th><th>Beschreibung</th>
                    <th style="text-align:right">Gesamt</th><th style="text-align:right">Offen</th>
                </tr></thead>
                <tbody>${rows}${empty}</tbody>
            </table>
        </div>
    `;
}

window.setFinanceTab = function(tab) {
    state.financeTab = tab;
    if (tab === 'overview' && !state.financeOverview && !state.financeOverviewLoading) {
        loadFinanceOverview();
    } else if (tab === 'accounts' && state.financeAccounts.length === 0 && !state.financeAccountsLoading) {
        loadFinanceAccounts();
    } else if (tab === 'invoices' && state.financeInvoices.length === 0 && !state.financeInvoicesLoading) {
        loadInvoices();
    } else {
        render();
    }
};

function loadFinanceOverview() {
    if (!state.selectedDept) { render(); return; }
    state.financeOverviewLoading = true;
    state.financeOverviewError = '';
    render();
    GetFinanceOverview(state.selectedDept)
        .then(ov => {
            state.financeOverview = ov;
            state.financeOverviewLoading = false;
            // Also populate invoice cache in the invoices tab if already loaded
            render();
        })
        .catch(err => {
            state.financeOverviewError = String(err);
            state.financeOverviewLoading = false;
            render();
        });
}

window.setFinanceAccount = function(id) {
    state.financeSelectedAccountID = id;
    state.financeBookings = [];
    render();
    loadFinanceBookings();
};

window.setFinanceDateFrom = function(v) { state.financeBookingDateFrom = v; render(); };
window.setFinanceDateTo = function(v) { state.financeBookingDateTo = v; render(); };

function formatDate(iso) {
    if (!iso || iso.length < 10) return iso || '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
}

window.loadFinanceBookings = function() {
    const accs = state.financeAccounts;
    if (!accs || accs.length === 0) return;
    const id = state.financeSelectedAccountID || accs[0].id;
    state.financeBookingsLoading = true;
    state.financeBookingsError = '';
    render();
    GetBookings(id, state.financeBookingDateFrom, state.financeBookingDateTo)
        .then(rows => {
            state.financeBookings = rows || [];
            state.financeBookingsLoading = false;
            render();
        })
        .catch(err => {
            state.financeBookingsError = String(err);
            state.financeBookingsLoading = false;
            render();
        });
};

window.loadInvoices = function() { loadInvoices(true); };

function loadInvoices(forceReload) {
    if (!state.selectedDept) { render(); return; }
    state.financeInvoicesLoading = true;
    state.financeInvoicesError = '';
    render();
    const fn = forceReload ? ReloadOpenInvoices : GetOpenInvoices;
    fn(state.selectedDept)
        .then(rows => {
            state.financeInvoices = rows || [];
            state.financeInvoicesLoading = false;
            // Keep overview open-invoice count in sync after reload
            if (forceReload) state.financeOverview = null;
            render();
            if (forceReload) loadFinanceOverview();
        })
        .catch(err => {
            state.financeInvoicesError = String(err);
            state.financeInvoicesLoading = false;
            render();
        });
}

function loadFinanceAccounts() {
    if (!state.selectedDept) { render(); return; }
    state.financeAccountsLoading = true;
    state.financeAccountsError = '';
    render();
    GetBankAccounts(state.selectedDept)
        .then(accs => {
            state.financeAccounts = accs || [];
            state.financeAccountsLoading = false;
            if (accs && accs.length > 0) {
                state.financeSelectedAccountID = accs[0].id;
                loadFinanceBookings();
            } else {
                render();
            }
        })
        .catch(err => {
            state.financeAccountsError = String(err);
            state.financeAccountsLoading = false;
            render();
        });
}

// ── Calendar ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const BIRTHDAY_CAL = { id: -1, name: 'Geburtstage', color: '#F5C400' };


function renderCalendar() {
    if (state.calLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.calError) {
        return `<div class="error-box">${esc(state.calError)}</div>`;
    }

    const { calYear: year, calMonth: month } = state;
    const allCals = [...state.calCalendars, BIRTHDAY_CAL];

    // Filter events by enabled calendars
    const enabledIds = new Set(allCals.filter(c => state.calEnabled[c.id] !== false).map(c => c.id));
    const visibleEvents = state.calEvents.filter(e => enabledIds.has(e.calendarId));

    const calFilterHtml = allCals.map(c => {
        const checked = state.calEnabled[c.id] !== false;
        return `<label class="cal-filter-item">
            <input type="checkbox" class="cal-filter-cb" data-calid="${c.id}" ${checked ? 'checked' : ''}>
            <span class="cal-filter-dot" style="background:${esc(c.color)}"></span>
            ${esc(c.name)}
        </label>`;
    }).join('');

    const isMonth = state.calView === 'month';
    const viewToggle = `
        <div class="cal-view-toggle">
            <button class="cal-view-btn ${isMonth ? 'active' : ''}" id="cal-view-month" title="Monatsansicht">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="5.5" y="1" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="10" y="1" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="1" y="5.5" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="5.5" y="5.5" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="10" y="5.5" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="1" y="10" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="5.5" y="10" width="3" height="3" rx=".5" fill="currentColor"/>
                    <rect x="10" y="10" width="3" height="3" rx=".5" fill="currentColor"/>
                </svg>
            </button>
            <button class="cal-view-btn ${!isMonth ? 'active' : ''}" id="cal-view-list" title="Listenansicht">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="6" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="10" width="12" height="2" rx=".5" fill="currentColor"/>
                </svg>
            </button>
        </div>`;

    const header = `
        <div class="cal-header">
            <button class="btn-ghost cal-nav" id="cal-prev">&#8249;</button>
            <span class="cal-month-title">${MONTH_NAMES[month-1]} ${year}</span>
            <button class="btn-ghost cal-nav" id="cal-next">&#8250;</button>
            <button class="btn-ghost" id="cal-today" style="margin-left:8px;font-size:12px">Heute</button>
            ${viewToggle}
            <button class="btn-ghost" id="cal-reload" style="margin-left:auto;font-size:12px">Neu laden</button>
        </div>`;

    const mainContent = isMonth ? renderCalendarMonth(visibleEvents, year, month) : renderCalendarList(visibleEvents);

    return `
        <div class="cal-layout">
            <div class="cal-sidebar">
                <div class="cal-sidebar-title">Kalender</div>
                <div class="cal-filters">${calFilterHtml || '<span style="color:#aaa;font-size:12px">Keine Kalender</span>'}</div>
            </div>
            <div class="cal-main">
                ${header}
                ${mainContent}
            </div>
        </div>
    `;
}

function renderCalendarMonth(visibleEvents, year, month) {
    // Build a map: dateStr → events[]
    const byDay = {};
    for (const ev of visibleEvents) {
        const day = ev.start.slice(0, 10);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(ev);
    }

    const firstDay = new Date(year, month - 1, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Monday-based
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    let cells = '';
    for (let i = 0; i < startOffset; i++) {
        cells += `<div class="cal-cell cal-cell--empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = dateStr === today;
        const dayEvents = byDay[dateStr] || [];
        const pills = dayEvents.slice(0, 3).map(e =>
            `<div class="cal-pill" style="background:${esc(e.color)}" title="${esc(e.name)}">${esc(e.name)}</div>`
        ).join('');
        const more = dayEvents.length > 3
            ? `<div class="cal-pill cal-pill--more">+${dayEvents.length - 3}</div>` : '';
        cells += `
            <div class="cal-cell ${isToday ? 'cal-cell--today' : ''}">
                <span class="cal-day-num">${d}</span>
                <div class="cal-pills">${pills}${more}</div>
            </div>`;
    }

    return `
        <div class="cal-grid">
            <div class="cal-weekday">Mo</div>
            <div class="cal-weekday">Di</div>
            <div class="cal-weekday">Mi</div>
            <div class="cal-weekday">Do</div>
            <div class="cal-weekday">Fr</div>
            <div class="cal-weekday">Sa</div>
            <div class="cal-weekday">So</div>
            ${cells}
        </div>`;
}

function renderCalendarList(visibleEvents) {
    if (visibleEvents.length === 0) {
        return '<div class="placeholder" style="padding:40px">Keine Termine in diesem Monat.</div>';
    }

    // Sort by start date ascending
    const sorted = [...visibleEvents].sort((a, b) => a.start.localeCompare(b.start));

    // Group by date
    const groups = [];
    let currentDate = null;
    let currentItems = [];
    for (const ev of sorted) {
        const dateStr = ev.start.slice(0, 10);
        if (dateStr !== currentDate) {
            if (currentDate) groups.push({ date: currentDate, events: currentItems });
            currentDate = dateStr;
            currentItems = [];
        }
        currentItems.push(ev);
    }
    if (currentDate) groups.push({ date: currentDate, events: currentItems });

    const today = new Date().toISOString().slice(0, 10);

    const rows = groups.map(g => {
        const d = new Date(g.date + 'T00:00:00');
        const weekday = ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()];
        const dayNum = d.getDate();
        const isToday = g.date === today;

        const eventRows = g.events.map(ev => {
            const timeStr = ev.allDay ? 'Ganztägig' : ev.start.length > 10 ? ev.start.slice(11, 16) + ' Uhr' : '';
            const endStr  = !ev.allDay && ev.end && ev.end.length > 10 ? ' – ' + ev.end.slice(11, 16) + ' Uhr' : '';
            const badge = ev.type === 'birthday'
                ? `<span class="cal-list-badge cal-list-badge--birthday">🎂</span>`
                : '';
            return `
                <div class="cal-list-event">
                    <span class="cal-list-dot" style="background:${esc(ev.color)}"></span>
                    <div class="cal-list-event-body">
                        <span class="cal-list-name">${badge}${esc(ev.name)}</span>
                        <span class="cal-list-meta">${esc(ev.calendarName)}${timeStr ? ' · ' + timeStr + endStr : ''}</span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="cal-list-row ${isToday ? 'cal-list-row--today' : ''}">
                <div class="cal-list-date">
                    <span class="cal-list-weekday">${weekday}</span>
                    <span class="cal-list-daynum ${isToday ? 'cal-list-daynum--today' : ''}">${dayNum}</span>
                </div>
                <div class="cal-list-events">${eventRows}</div>
            </div>`;
    }).join('');

    return `<div class="cal-list">${rows}</div>`;
}

// ── Settings ───────────────────────────────────────────────────────────────────
function renderSettings() {
    const s = state.settings;
    const loading = state.configLoading;

    if (!s && loading) return '<div class="placeholder"><span class="spinner"></span></div>';
    if (!s) return '<div class="placeholder">Einstellungen werden geladen…</div>';

    return `
        <div class="settings-grid">
            ${s.configError ? `<div class="error-box">${esc(s.configError)}</div>` : ''}

            <div class="card">
                <div class="card-header"><span class="card-title">Version</span></div>
                <div style="padding:16px">
                    <div class="settings-field">
                        <label>App-Version</label>
                        <div class="settings-value"><span>${esc(s.version || '—')}</span></div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Schlüssel & Konfiguration</span></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
                    <div class="settings-field">
                        <label>Public Key (age)</label>
                        <div class="settings-value">
                            <span>${esc(s.publicKey || '—')}</span>
                            ${s.publicKey ? `<button class="copy-btn" data-copy="${esc(s.publicKey)}">Kopieren</button>` : ''}
                            ${s.publicKey ? `<button class="btn-ghost" id="export-pubkey-btn" style="font-size:11px;padding:3px 8px">Als Datei speichern</button>` : ''}
                        </div>
                    </div>
                    <div class="settings-field">
                        <label>Externe Konfiguration URL</label>
                        <div class="settings-value"><span>${esc(s.configURL)}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Base URL</label>
                        <div class="settings-value"><span>${esc(s.baseURL || '—')}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Token</label>
                        <div class="settings-value"><span>${esc(s.tokenMasked || '—')}</span></div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <button class="btn-primary" id="reload-config-btn" ${loading ? 'disabled' : ''}>
                            ${loading ? '<span class="spinner"></span> Wird geladen…' : 'Konfiguration neu laden'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ── Event listeners ────────────────────────────────────────────────────────────
function attachListeners() {
    // Sidebar nav
    document.querySelectorAll('[data-tab]').forEach(el => {
        el.addEventListener('click', () => {
            state.activeTab = el.dataset.tab;
            if (state.activeTab === 'settings' && !state.settings) loadSettings();
            if (state.activeTab === 'overview' && !state.overview && !state.overviewLoading) loadOverview();
            if (state.activeTab === 'calendar' && !state.calLoading) loadCalendarData();
            if (state.activeTab === 'finance' && !state.financeOverview && !state.financeOverviewLoading) loadFinanceOverview();
            render();
        });
    });

    // Department selector
    const deptSel = document.getElementById('dept-select');
    if (deptSel) {
        deptSel.addEventListener('change', () => {
            state.selectedDept = deptSel.value;
            state.members = [];
            state.error = '';
            state.financeAccounts = [];
            state.financeBookings = [];
            state.financeSelectedAccountID = 0;
            state.financeInvoices = [];
            state.financeOverview = null;
            render();
            loadMembers(false);
            // Reload calendar events so birthdays update for new department
            if (state.calCalendars.length > 0) loadCalendarEvents();
        });
    }

    // Member search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            state.search = e.target.value;
            refreshContent();
        });
        // Keep focus after re-render
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }

    // Finance booking search
    const finSearchInput = document.getElementById('finance-search-input');
    if (finSearchInput) {
        finSearchInput.addEventListener('input', e => {
            state.financeBookingSearch = e.target.value;
            refreshContent();
        });
        finSearchInput.focus();
        finSearchInput.setSelectionRange(finSearchInput.value.length, finSearchInput.value.length);
    }

    // Invoice search
    const invSearchInput = document.getElementById('invoice-search-input');
    if (invSearchInput) {
        invSearchInput.addEventListener('input', e => {
            state.financeInvoiceSearch = e.target.value;
            refreshContent();
        });
        invSearchInput.focus();
        invSearchInput.setSelectionRange(invSearchInput.value.length, invSearchInput.value.length);
    }

    // Reload members
    const reloadBtn = document.getElementById('reload-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadMembers(true));

    // Excel export
    const excelBtn = document.getElementById('excel-export-btn');
    if (excelBtn) excelBtn.addEventListener('click', doExportExcel);

    // Export public key as file
    const exportPubKeyBtn = document.getElementById('export-pubkey-btn');
    if (exportPubKeyBtn) exportPubKeyBtn.addEventListener('click', doExportPublicKey);

    // Column toggle
    const colBtn = document.getElementById('col-toggle-btn');
    if (colBtn) {
        colBtn.addEventListener('click', e => {
            e.stopPropagation();
            state.colMenuOpen = !state.colMenuOpen;
            refreshContent();
        });
    }

    document.querySelectorAll('[data-col]').forEach(el => {
        el.addEventListener('change', e => {
            state.columns[parseInt(e.target.dataset.col)].visible = e.target.checked;
            refreshContent();
        });
    });

    // Sort
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            state.sortDir = state.sortCol === col && state.sortDir === 'asc' ? 'desc' : 'asc';
            state.sortCol = col;
            refreshContent();
        });
    });

    // Copy buttons
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.copy).catch(() => {});
            const prev = btn.textContent;
            btn.textContent = 'Kopiert!';
            setTimeout(() => { btn.textContent = prev; }, 1500);
        });
    });

    // Overview collapse toggle
    document.querySelectorAll('.overview-toggle').forEach(el => {
        el.addEventListener('click', () => {
            const name = el.dataset.dept;
            state.overviewExpanded[name] = state.overviewExpanded[name] === false ? true : false;
            refreshContent();
        });
    });

    // Reload config
    const reloadConfigBtn = document.getElementById('reload-config-btn');
    if (reloadConfigBtn) reloadConfigBtn.addEventListener('click', doReloadConfig);

    // Calendar navigation
    const calPrev = document.getElementById('cal-prev');
    if (calPrev) calPrev.addEventListener('click', () => {
        state.calMonth--;
        if (state.calMonth < 1) { state.calMonth = 12; state.calYear--; }
        loadCalendarEvents();
    });
    const calNext = document.getElementById('cal-next');
    if (calNext) calNext.addEventListener('click', () => {
        state.calMonth++;
        if (state.calMonth > 12) { state.calMonth = 1; state.calYear++; }
        loadCalendarEvents();
    });
    const calToday = document.getElementById('cal-today');
    if (calToday) calToday.addEventListener('click', () => {
        const now = new Date();
        state.calYear = now.getFullYear();
        state.calMonth = now.getMonth() + 1;
        loadCalendarEvents();
    });
    const calReload = document.getElementById('cal-reload');
    if (calReload) calReload.addEventListener('click', () => loadCalendarEvents());

    const calViewMonth = document.getElementById('cal-view-month');
    if (calViewMonth) calViewMonth.addEventListener('click', () => { state.calView = 'month'; refreshContent(); });
    const calViewList = document.getElementById('cal-view-list');
    if (calViewList) calViewList.addEventListener('click', () => { state.calView = 'list'; refreshContent(); });

    // Calendar filter checkboxes
    document.querySelectorAll('.cal-filter-cb').forEach(cb => {
        cb.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.calid);
            state.calEnabled[id] = e.target.checked;
            refreshContent();
        });
    });

    // Close column menu on outside click
    if (state.colMenuOpen) {
        setTimeout(() => {
            document.addEventListener('click', e => {
                if (!e.target.closest('.col-toggle')) {
                    state.colMenuOpen = false;
                    refreshContent();
                }
            }, { once: true });
        }, 0);
    }
}

function refreshContent() {
    const el = document.getElementById('content');
    if (el) el.innerHTML = renderContent();
    // Re-attach only content-level listeners
    attachListeners();
}

// ── Export handlers ────────────────────────────────────────────────────────────
async function doExportExcel() {
    if (!state.selectedDept) return;
    try {
        const path = await ExportMembersExcel(state.selectedDept);
        if (path) {
            const btn = document.getElementById('excel-export-btn');
            if (btn) {
                const prev = btn.innerHTML;
                btn.textContent = 'Gespeichert!';
                setTimeout(() => { btn.innerHTML = prev; }, 2000);
            }
        }
    } catch (e) {
        alert('Excel-Export fehlgeschlagen: ' + String(e));
    }
}

async function doExportPublicKey() {
    try {
        const path = await ExportPublicKey();
        if (path) {
            const btn = document.getElementById('export-pubkey-btn');
            if (btn) {
                const prev = btn.textContent;
                btn.textContent = 'Gespeichert!';
                setTimeout(() => { btn.textContent = prev; }, 2000);
            }
        }
    } catch (e) {
        alert('Fehler beim Speichern des Public Keys: ' + String(e));
    }
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadDepartments() {
    try {
        const depts = await GetDepartments();
        state.departments = depts || [];
        if (state.departments.length > 0 && !state.selectedDept) {
            state.selectedDept = state.departments[0];
        }
        render();
        if (state.selectedDept) loadMembers(false);
    } catch (e) {
        state.error = String(e);
        render();
    }
}

async function loadMembers(force) {
    if (!state.selectedDept) return;
    state.loading = true;
    state.error = '';
    render();
    try {
        const rows = await (force ? ReloadMembers : GetMembers)(state.selectedDept);
        state.members = rows || [];
    } catch (e) {
        state.error = String(e);
        state.members = [];
    } finally {
        state.loading = false;
        render();
    }
}

async function loadOverview() {
    state.overviewLoading = true;
    state.overviewError = '';
    if (state.activeTab === 'overview') refreshContent();
    try {
        state.overview = await GetDepartmentOverview();
    } catch (e) {
        state.overviewError = String(e);
    } finally {
        state.overviewLoading = false;
        if (state.activeTab === 'overview') refreshContent();
    }
}

function applyActiveModules(settings) {
    if (settings && settings.activeModules && settings.activeModules.length > 0) {
        state.activeModules = settings.activeModules;
    } else {
        state.activeModules = null;
    }
    // Falls der aktive Tab deaktiviert wurde, zum ersten aktiven wechseln.
    const mainModules = ['overview', 'members', 'finance', 'calendar'];
    if (mainModules.includes(state.activeTab) && !isModuleActive(state.activeTab)) {
        state.activeTab = mainModules.find(m => isModuleActive(m)) || 'settings';
    }
}

async function loadSettings() {
    try {
        state.settings = await GetSettings();
        applyActiveModules(state.settings);
        render();
    } catch (e) {
        state.settings = { configError: String(e), publicKey: '', baseURL: '', tokenMasked: '', configURL: '' };
        if (state.activeTab === 'settings') refreshContent();
    }
}

async function doReloadConfig() {
    state.configLoading = true;
    state.settings = null;
    state.overview = null;
    refreshContent();
    try {
        state.settings = await ReloadConfig();
        applyActiveModules(state.settings);
        const depts = await GetDepartments();
        state.departments = depts || [];
        if (state.departments.length > 0 && !state.departments.includes(state.selectedDept)) {
            state.selectedDept = state.departments[0];
            state.members = [];
        }
    } catch (e) {
        state.settings = { configError: String(e), publicKey: '', baseURL: '', tokenMasked: '', configURL: '' };
    } finally {
        state.configLoading = false;
        render();
    }
}

async function loadCalendarData() {
    // Load calendars once, then load events
    if (state.calCalendars.length === 0) {
        try {
            const cals = await GetCalendars();
            state.calCalendars = cals || [];
            // Enable all by default
            for (const c of state.calCalendars) {
                if (!(c.id in state.calEnabled)) state.calEnabled[c.id] = true;
            }
            if (!(-1 in state.calEnabled)) state.calEnabled[-1] = true;
        } catch (e) {
            state.calError = String(e);
            state.calLoading = false;
            if (state.activeTab === 'calendar') refreshContent();
            return;
        }
    }
    await loadCalendarEvents();
}

async function loadCalendarEvents() {
    state.calLoading = true;
    state.calError = '';
    if (state.activeTab === 'calendar') refreshContent();
    try {
        const evts = await GetCalendarEvents(state.selectedDept || '', state.calYear, state.calMonth);
        state.calEvents = evts || [];
    } catch (e) {
        state.calError = String(e);
        state.calEvents = [];
    } finally {
        state.calLoading = false;
        if (state.activeTab === 'calendar') refreshContent();
    }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
render();
loadDepartments();
loadSettings();
