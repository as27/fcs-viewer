import './style.css';
import './app.css';
import { GetDepartments, GetMembers } from '../wailsjs/go/main/App';

import { state, PAGE_TITLES } from './state.js';
import { esc, ICONS, getFontSize, applyFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from './utils.js';
import { renderMembers, loadMembers, doExportExcel, init as initMembers } from './members.js';
import { renderOverview, loadOverview, init as initOverview } from './overview.js';
import { renderCalendar, loadCalendarData, loadCalendarEvents, init as initCalendar } from './calendar.js';
import { renderFinance, renderCashPaymentModal, attachCashPaymentListeners, loadFinanceOverview, loadFinanceAccounts, init as initFinance } from './finance.js';
import { renderSettings, isModuleActive, loadSettings, doReloadConfig, doExportPublicKey, applyActiveModules, init as initSettings } from './settings.js';

applyFontSize(getFontSize());

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
        ${state.cashPaymentModal ? renderCashPaymentModal() : ''}
    `;
    attachListeners();
    attachCashPaymentListeners();
}

function refreshContent() {
    const el = document.getElementById('content');
    if (el) el.innerHTML = renderContent();
    attachListeners();
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

// ── Event listeners ────────────────────────────────────────────────────────────
function attachListeners() {
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
            state.expandedInvoiceID = null;
            state.invoiceItems = {};
            state.invoiceItemsLoading = {};
            render();
            loadMembers(false);
            if (state.calCalendars.length > 0) loadCalendarEvents();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => { state.search = e.target.value; refreshContent(); });
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }

    const finSearchInput = document.getElementById('finance-search-input');
    if (finSearchInput) {
        finSearchInput.addEventListener('input', e => { state.financeBookingSearch = e.target.value; refreshContent(); });
        finSearchInput.focus();
        finSearchInput.setSelectionRange(finSearchInput.value.length, finSearchInput.value.length);
    }

    const invSearchInput = document.getElementById('invoice-search-input');
    if (invSearchInput) {
        invSearchInput.addEventListener('input', e => { state.financeInvoiceSearch = e.target.value; refreshContent(); });
        invSearchInput.focus();
        invSearchInput.setSelectionRange(invSearchInput.value.length, invSearchInput.value.length);
    }

    const reloadBtn = document.getElementById('reload-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadMembers(true));

    const excelBtn = document.getElementById('excel-export-btn');
    if (excelBtn) excelBtn.addEventListener('click', doExportExcel);

    const exportPubKeyBtn = document.getElementById('export-pubkey-btn');
    if (exportPubKeyBtn) exportPubKeyBtn.addEventListener('click', doExportPublicKey);

    const fontSlider = document.getElementById('font-size-slider');
    if (fontSlider) {
        fontSlider.addEventListener('input', e => {
            const size = parseInt(e.target.value, 10);
            applyFontSize(size);
            const lbl = document.getElementById('font-size-label');
            if (lbl) lbl.textContent = size + 'px';
        });
    }
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.delta, 10);
            const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, getFontSize() + delta));
            applyFontSize(next);
            if (fontSlider) fontSlider.value = next;
            const lbl = document.getElementById('font-size-label');
            if (lbl) lbl.textContent = next + 'px';
        });
    });
    const fontReset = document.getElementById('font-size-reset');
    if (fontReset) {
        fontReset.addEventListener('click', () => {
            applyFontSize(FONT_SIZE_DEFAULT);
            if (fontSlider) fontSlider.value = FONT_SIZE_DEFAULT;
            const lbl = document.getElementById('font-size-label');
            if (lbl) lbl.textContent = FONT_SIZE_DEFAULT + 'px';
        });
    }

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

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            state.sortDir = state.sortCol === col && state.sortDir === 'asc' ? 'desc' : 'asc';
            state.sortCol = col;
            refreshContent();
        });
    });

    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.copy).catch(() => {});
            const prev = btn.textContent;
            btn.textContent = 'Kopiert!';
            setTimeout(() => { btn.textContent = prev; }, 1500);
        });
    });

    document.querySelectorAll('.overview-toggle').forEach(el => {
        el.addEventListener('click', () => {
            const name = el.dataset.dept;
            state.overviewExpanded[name] = !state.overviewExpanded[name];
            refreshContent();
        });
    });

    const reloadConfigBtn = document.getElementById('reload-config-btn');
    if (reloadConfigBtn) reloadConfigBtn.addEventListener('click', doReloadConfig);

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

    document.querySelectorAll('.cal-filter-cb').forEach(cb => {
        cb.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.calid);
            state.calEnabled[id] = e.target.checked;
            refreshContent();
        });
    });

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

// ── Bootstrap ──────────────────────────────────────────────────────────────────
initMembers(render, refreshContent);
initOverview(render, refreshContent);
initCalendar(render, refreshContent);
initFinance(render, refreshContent);
initSettings(render, refreshContent);

render();
loadDepartments();
loadSettings();
