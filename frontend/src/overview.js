import { state } from './state.js';
import { esc } from './utils.js';
import { GetDepartmentOverview } from '../wailsjs/go/main/App';

let _refreshContent;

export function init(_render, refreshContent) {
    _refreshContent = refreshContent;
}

export function renderOverview() {
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
        const expanded = state.overviewExpanded[dept.name] === true;
        const chevron = expanded
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        return `
        <div class="card">
            <div class="card-header overview-toggle" data-dept="${esc(dept.name)}" style="cursor:pointer">
                <span class="card-title">${esc(dept.name)}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:0.79rem;color:#aaa">${dept.groups.length} Gruppe${dept.groups.length !== 1 ? 'n' : ''}</span>
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
                            <td colspan="3" style="color:#d97706;font-size:0.79rem">Gruppe nicht in easyVerein gefunden</td>
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

export async function loadOverview() {
    state.overviewLoading = true;
    state.overviewError = '';
    if (state.activeTab === 'overview') _refreshContent();
    try {
        state.overview = await GetDepartmentOverview();
    } catch (e) {
        state.overviewError = String(e);
    } finally {
        state.overviewLoading = false;
        if (state.activeTab === 'overview') _refreshContent();
    }
}
