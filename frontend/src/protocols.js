import { state } from './state.js';
import { esc, ICONS, formatTimestamp } from './utils.js';
import { GetProtocolsOverview, ReloadProtocols } from '../wailsjs/go/main/App';

let renderApp, refreshContent;

export function init(r, rc) {
    renderApp = r;
    refreshContent = rc;
}

export function renderProtocols() {
    if (state.protocolsLoading && (!state.protocolsData || !state.protocolsData.protocols)) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.protocolsError) return `<div class="error-box">${esc(state.protocolsError)}</div>`;
    
    const protocols = (state.protocolsData && state.protocolsData.protocols) || [];
    const timestampHtml = state.protocolsUpdatedAt ? `<span class="timestamp">${esc(formatTimestamp(state.protocolsUpdatedAt))}</span>` : '';

    const tableHtml = protocols.length === 0
        ? `<div class="empty-state">
             <div class="empty-state-icon">📄</div>
             <div class="empty-state-title">Keine Protokolle</div>
             <div class="empty-state-text">Es wurden keine Sitzungsprotokolle gefunden.</div>
           </div>`
        : `<table class="data-table">
            <thead>
                <tr>
                    <th style="width:120px">Datum</th>
                    <th>Protokoll</th>
                    <th>Ort</th>
                    <th>Leitung / Schriftführer</th>
                </tr>
            </thead>
            <tbody>
                ${protocols.map(p => `
                    <tr>
                        <td class="nowrap">${esc(p.start)}</td>
                        <td>
                            <div style="font-weight:600;color:var(--text-primary)">${esc(p.name)}</div>
                            <div style="font-size:0.79rem;color:var(--text-secondary);margin-top:2px;white-space:normal">${esc(p.description.replace(/<[^>]*>?/gm, '').slice(0, 150))}...</div>
                        </td>
                        <td>${esc(p.locationName)}</td>
                        <td>
                            <div style="font-size:0.79rem">L: ${esc(p.meetingLeader)}</div>
                            <div style="font-size:0.79rem">S: ${esc(p.meetingSecretary)}</div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;

    return `
        <div class="members-layout">
            <div class="members-toolbar">
                <button class="btn-primary" id="protocols-reload-btn" ${state.protocolsLoading ? 'disabled' : ''}>
                    ${state.protocolsLoading ? '<span class="spinner"></span> Laden…' : 'Aktualisieren'}
                </button>
                ${timestampHtml}
                ${state.protocolsError ? `<span class="err-msg">${esc(state.protocolsError)}</span>` : `<span class="status-count">${protocols.length} Protokolle</span>`}
            </div>
            <div class="card">
                <div class="table-scroll">
                    ${tableHtml}
                </div>
            </div>
        </div>
    `;
}

export async function loadProtocolsOverview() {
    state.protocolsLoading = true;
    state.protocolsError = '';
    renderApp();

    try {
        const res = await GetProtocolsOverview();
        state.protocolsData = res.data;
        state.protocolsUpdatedAt = res.updatedAt;
    } catch (e) {
        state.protocolsError = String(e);
    } finally {
        state.protocolsLoading = false;
        renderApp();
    }
}

export async function doReloadProtocols() {
    state.protocolsLoading = true;
    state.protocolsError = '';
    renderApp();

    try {
        const res = await ReloadProtocols();
        state.protocolsData = res.data;
        state.protocolsUpdatedAt = res.updatedAt;
    } catch (e) {
        state.protocolsError = String(e);
    } finally {
        state.protocolsLoading = false;
        renderApp();
    }
}

export function attachProtocolsListeners() {
    const reloadBtn = document.getElementById('protocols-reload-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', doReloadProtocols);
}
