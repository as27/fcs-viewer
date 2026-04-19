import { state } from './state.js';
import { esc, escHtml } from './utils.js';
import { GetMembers, ReloadMembers, ExportMembersExcel } from '../wailsjs/go/main/App';

let _render, _refreshContent;

export function init(render, refreshContent) {
    _render = render;
    _refreshContent = refreshContent;
}

export function filterAndSort() {
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

export function renderMembers() {
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
                    ${visibleCols.map(c => `<td title="${esc(m[c.key])}"${c.key === 'groups' ? ' style="white-space:normal;min-width:120px;max-width:220px"' : ''}>${esc(m[c.key])}</td>`).join('')}
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

export async function loadMembers(force) {
    if (!state.selectedDept) return;
    state.loading = true;
    state.error = '';
    _render();
    try {
        const rows = await (force ? ReloadMembers : GetMembers)(state.selectedDept);
        state.members = rows || [];
    } catch (e) {
        state.error = String(e);
        state.members = [];
    } finally {
        state.loading = false;
        _render();
    }
}

export async function doExportExcel() {
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
