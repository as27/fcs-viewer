import './style.css';
import './app.css';
import { GetSettings, GetDepartments, GetMembers, ReloadMembers } from '../wailsjs/go/main/App';

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
    activeTab: 'members',   // 'members' | 'finance' | 'calendar' | 'settings'
    departments: [],
    selectedDept: '',
    members: [],
    loading: false,
    error: '',
    search: '',
    sortCol: 'familyName',
    sortDir: 'asc',
    colMenuOpen: false,
    settings: null,
    columns: [
        { key: 'membershipNumber', label: 'Mitglieds-Nr.', visible: true },
        { key: 'familyName',       label: 'Nachname',      visible: true },
        { key: 'firstName',        label: 'Vorname',       visible: true },
        { key: 'dateOfBirth',      label: 'Geburtsdatum',  visible: true },
        { key: 'email',            label: 'E-Mail',        visible: true },
        { key: 'phone',            label: 'Telefon',       visible: false },
        { key: 'mobile',           label: 'Mobil',         visible: false },
        { key: 'street',           label: 'Straße',        visible: false },
        { key: 'zip',              label: 'PLZ',           visible: false },
        { key: 'city',             label: 'Stadt',         visible: false },
        { key: 'joinDate',         label: 'Eintrittsdatum',visible: false },
        { key: 'groups',           label: 'Gruppen',       visible: true },
    ],
};

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
    document.getElementById('app').innerHTML = `
        <div class="topbar">
            <h1>FCS Viewer</h1>
            <select class="dept-select" id="dept-select" ${state.departments.length === 0 ? 'disabled' : ''}>
                ${state.departments.length === 0
                    ? '<option>— keine Abteilungen —</option>'
                    : state.departments.map(d =>
                        `<option value="${d}" ${d === state.selectedDept ? 'selected' : ''}>${d}</option>`
                    ).join('')}
            </select>
            <div class="spacer"></div>
            <button class="btn btn-secondary" id="settings-btn">Einstellungen</button>
        </div>

        <div class="tabs">
            <div class="tab ${state.activeTab === 'members'  ? 'active' : ''}" data-tab="members">Mitglieder</div>
            <div class="tab ${state.activeTab === 'finance'  ? 'active' : ''}" data-tab="finance">Finanzen</div>
            <div class="tab ${state.activeTab === 'calendar' ? 'active' : ''}" data-tab="calendar">Kalender</div>
        </div>

        <div class="content" id="content">
            ${renderContent()}
        </div>
    `;

    attachEventListeners();
}

function renderContent() {
    if (state.activeTab === 'settings') return renderSettings();
    if (state.activeTab === 'finance')  return renderPlaceholder('Finanzen', 'Noch nicht implementiert.');
    if (state.activeTab === 'calendar') return renderPlaceholder('Kalender', 'Noch nicht implementiert.');
    return renderMembers();
}

function renderPlaceholder(title, msg) {
    return `<div class="placeholder"><div><strong>${title}</strong></div><div>${msg}</div></div>`;
}

function renderMembers() {
    const visibleCols = state.columns.filter(c => c.visible);
    let rows = filterAndSort();

    const colMenuHtml = state.colMenuOpen ? `
        <div class="col-toggle-menu">
            ${state.columns.map((c, i) => `
                <label>
                    <input type="checkbox" data-col="${i}" ${c.visible ? 'checked' : ''}> ${c.label}
                </label>
            `).join('')}
        </div>` : '';

    return `
        <div class="members-toolbar">
            <input class="search-input" id="search-input" type="text"
                   placeholder="Suche..." value="${escHtml(state.search)}">
            <div class="col-toggle">
                <button class="btn btn-secondary" id="col-toggle-btn">Spalten</button>
                ${colMenuHtml}
            </div>
            <button class="btn btn-primary" id="reload-btn" ${state.loading ? 'disabled' : ''}>
                ${state.loading ? '<span class="spinner"></span>' : 'Neu laden'}
            </button>
            <span class="status-bar">
                ${state.error
                    ? `<span class="error-msg">${escHtml(state.error)}</span>`
                    : `${rows.length} Mitglieder`}
            </span>
        </div>
        <div class="table-wrapper">
            ${state.loading && state.members.length === 0
                ? '<div class="placeholder"><span class="spinner"></span></div>'
                : rows.length === 0 && !state.loading
                    ? `<div class="placeholder">${state.selectedDept ? 'Keine Mitglieder gefunden.' : 'Bitte eine Abteilung wählen.'}</div>`
                    : `<table>
                        <thead><tr>
                            ${visibleCols.map(c => `
                                <th class="${state.sortCol === c.key ? 'sort-' + state.sortDir : ''}"
                                    data-sort="${c.key}">${c.label}</th>
                            `).join('')}
                        </tr></thead>
                        <tbody>
                            ${rows.map(m => `<tr>
                                ${visibleCols.map(c => `<td title="${escHtml(String(m[c.key] ?? ''))}">${escHtml(String(m[c.key] ?? ''))}</td>`).join('')}
                            </tr>`).join('')}
                        </tbody>
                    </table>`
            }
        </div>
    `;
}

function renderSettings() {
    const s = state.settings;
    if (!s) return '<div class="placeholder"><span class="spinner"></span></div>';
    return `
        <div class="settings-panel">
            <h2>Einstellungen</h2>
            ${s.configError ? `<div class="error-box">${escHtml(s.configError)}</div>` : ''}
            <div class="settings-row">
                <label>Public Key (age)</label>
                <div class="settings-value">
                    <span>${escHtml(s.publicKey || '—')}</span>
                    ${s.publicKey ? `<button class="copy-btn" data-copy="${escHtml(s.publicKey)}">Kopieren</button>` : ''}
                </div>
            </div>
            <div class="settings-row">
                <label>Externe Konfiguration URL</label>
                <div class="settings-value"><span>${escHtml(s.configURL)}</span></div>
            </div>
            <div class="settings-row">
                <label>API Base URL</label>
                <div class="settings-value"><span>${escHtml(s.baseURL || '—')}</span></div>
            </div>
            <div class="settings-row">
                <label>API Token</label>
                <div class="settings-value"><span>${escHtml(s.tokenMasked || '—')}</span></div>
            </div>
        </div>
    `;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function filterAndSort() {
    let rows = [...state.members];
    if (state.search) {
        const q = state.search.toLowerCase();
        rows = rows.filter(m =>
            Object.values(m).some(v => String(v ?? '').toLowerCase().includes(q))
        );
    }
    const col = state.sortCol;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
        const av = String(a[col] ?? '').toLowerCase();
        const bv = String(b[col] ?? '').toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });
    return rows;
}

// ── Events ─────────────────────────────────────────────────────────────────────
function attachEventListeners() {
    document.querySelectorAll('.tab').forEach(el => {
        el.addEventListener('click', () => {
            state.activeTab = el.dataset.tab;
            if (state.activeTab === 'settings' && !state.settings) loadSettings();
            render();
        });
    });

    const deptSel = document.getElementById('dept-select');
    if (deptSel) {
        deptSel.addEventListener('change', () => {
            state.selectedDept = deptSel.value;
            state.members = [];
            state.error = '';
            render();
            loadMembers(false);
        });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            state.activeTab = 'settings';
            if (!state.settings) loadSettings();
            render();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            state.search = e.target.value;
            renderTableOnly();
        });
    }

    const reloadBtn = document.getElementById('reload-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => loadMembers(true));
    }

    const colToggleBtn = document.getElementById('col-toggle-btn');
    if (colToggleBtn) {
        colToggleBtn.addEventListener('click', e => {
            e.stopPropagation();
            state.colMenuOpen = !state.colMenuOpen;
            renderMembersSection();
        });
    }

    document.querySelectorAll('[data-col]').forEach(el => {
        el.addEventListener('change', e => {
            const idx = parseInt(e.target.dataset.col);
            state.columns[idx].visible = e.target.checked;
            renderTableOnly();
        });
    });

    document.querySelectorAll('thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.sortCol === col) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortCol = col;
                state.sortDir = 'asc';
            }
            renderTableOnly();
        });
    });

    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.copy).catch(() => {});
            btn.textContent = 'Kopiert!';
            setTimeout(() => { btn.textContent = 'Kopieren'; }, 1500);
        });
    });

    document.addEventListener('click', e => {
        if (state.colMenuOpen && !e.target.closest('.col-toggle')) {
            state.colMenuOpen = false;
            renderMembersSection();
        }
    }, { once: true });
}

function renderMembersSection() {
    const content = document.getElementById('content');
    if (content && state.activeTab === 'members') {
        content.innerHTML = renderMembers();
        attachEventListeners();
    }
}

function renderTableOnly() {
    renderMembersSection();
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
    renderMembersSection();

    try {
        const fn = force ? ReloadMembers : GetMembers;
        const rows = await fn(state.selectedDept);
        state.members = rows || [];
    } catch (e) {
        state.error = String(e);
        state.members = [];
    } finally {
        state.loading = false;
        renderMembersSection();
    }
}

async function loadSettings() {
    try {
        state.settings = await GetSettings();
        if (state.activeTab === 'settings') render();
    } catch (e) {
        state.settings = { configError: String(e), publicKey: '', baseURL: '', tokenMasked: '', configURL: '' };
        if (state.activeTab === 'settings') render();
    }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
render();
loadDepartments();
