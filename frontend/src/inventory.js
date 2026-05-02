import { state } from './state.js';
import { esc, formatDate, formatTimestamp } from './utils.js';
import { GetInventoryOverview, ReloadInventory } from '../wailsjs/go/main/App.js';

let appRender = null;
let appRefresh = null;

export function init(renderFn, refreshFn) {
    appRender = renderFn;
    appRefresh = refreshFn;
}

export function renderInventory() {
    const tabs = ['items', 'groups', 'locations'].map(t => `
        <button class="sub-tab${state.inventoryTab === t ? ' active' : ''}"
            data-invtab="${t}">${t === 'items' ? 'Alle Items' : t === 'groups' ? 'Inventargruppen' : 'Orte'}</button>
    `).join('');

    return `
        <div class="sub-tab-bar">${tabs}</div>
        <div class="members-toolbar">
            <button class="btn-primary" id="inv-reload-btn" ${state.inventoryLoading ? 'disabled' : ''}>
                ${state.inventoryLoading ? '<span class="spinner"></span> Laden…' : 'Neu laden'}
            </button>
            ${state.inventoryUpdatedAt ? `<span class="timestamp" style="margin-left:auto">${esc(formatTimestamp(state.inventoryUpdatedAt))}</span>` : ''}
        </div>
        ${renderInventoryContent()}
    `;
}

function renderInventoryContent() {
    if (state.inventoryLoading) {
        return `<div class="state-msg">Inventar wird geladen...</div>`;
    }
    if (state.inventoryError) {
        return `<div class="state-msg error-msg">${esc(state.inventoryError)}</div>`;
    }
    if (!state.inventoryData) {
        return `<div class="state-msg">Keine Daten vorhanden.</div>`;
    }

    if (state.inventoryTab === 'items') {
        return renderItemsTable(state.inventoryData.items || []);
    }
    if (state.inventoryTab === 'groups') {
        return renderGroupsTable(state.inventoryData.groups || []);
    }
    if (state.inventoryTab === 'locations') {
        return renderLocationsTable(state.inventoryData.locations || []);
    }
    return '';
}

function renderItemsTable(items) {
    if (items.length === 0) return `
        <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">Keine Items</div>
            <div class="empty-state-text">Es wurden keine Inventar-Items gefunden.</div>
        </div>`;
    
    const rows = items.map(item => `
        <tr>
            <td>${esc(item.name)}</td>
            <td>${esc(item.identifier)}</td>
            <td>${item.pieces}</td>
            <td class="num">${formatMoney(item.price)}</td>
            <td>${esc(item.locationName)}</td>
            <td>${formatDate(item.purchaseDate)}</td>
        </tr>
    `).join('');

    return `
        <div class="card" style="display:flex; flex-direction:column; flex:1; min-height:0;">
            <div class="table-scroll">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Kennung</th>
                        <th>Anzahl</th>
                        <th class="num">Preis</th>
                        <th>Ort</th>
                        <th>Kaufdatum</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>
        </div>
    `;
}

function renderGroupsTable(groups) {
    if (groups.length === 0) return `
        <div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <div class="empty-state-title">Keine Gruppen</div>
            <div class="empty-state-text">Es wurden keine Inventargruppen gefunden.</div>
        </div>`;
    
    const rows = groups.map(group => `
        <tr>
            <td>${esc(group.name)}</td>
            <td class="col-desc">${esc(group.description)}</td>
            <td class="num">${group.itemCount}</td>
        </tr>
    `).join('');

    return `
        <div class="card" style="display:flex; flex-direction:column; flex:1; min-height:0;">
            <div class="table-scroll">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th class="col-desc">Beschreibung</th>
                        <th class="num">Items</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>
        </div>
    `;
}

function renderLocationsTable(locations) {
    if (locations.length === 0) return `
        <div class="empty-state">
            <div class="empty-state-icon">📍</div>
            <div class="empty-state-title">Keine Orte</div>
            <div class="empty-state-text">Es wurden keine Inventar-Orte gefunden.</div>
        </div>`;
    
    const rows = locations.map(loc => `
        <tr>
            <td>${esc(loc.name)}</td>
            <td>${esc(loc.street)}</td>
            <td>${esc(loc.zip)} ${esc(loc.city)}</td>
            <td class="col-desc">${esc(loc.description)}</td>
        </tr>
    `).join('');

    return `
        <div class="card" style="display:flex; flex-direction:column; flex:1; min-height:0;">
            <div class="table-scroll">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Straße</th>
                        <th>Ort</th>
                        <th class="col-desc">Beschreibung</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>
        </div>
    `;
}

function formatMoney(amount) {
    if (typeof amount !== 'number') return '0,00 €';
    return amount.toFixed(2).replace('.', ',') + ' €';
}

export async function loadInventoryOverview(forceReload = false) {
    state.inventoryLoading = true;
    state.inventoryError = '';
    appRender();

    try {
        let resp;
        if (forceReload) {
            resp = await ReloadInventory();
        } else {
            resp = await GetInventoryOverview();
        }
        state.inventoryData = resp.data || null;
        state.inventoryUpdatedAt = resp.updatedAt || '';
    } catch (err) {
        state.inventoryError = String(err);
    } finally {
        state.inventoryLoading = false;
        appRender();
    }
}

export function attachInventoryListeners() {
    document.querySelectorAll('[data-invtab]').forEach(btn => {
        btn.addEventListener('click', e => {
            state.inventoryTab = e.target.dataset.invtab;
            appRefresh();
        });
    });
    
    const reloadBtn = document.getElementById('inv-reload-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadInventoryOverview(true));
}
