import { state } from './state.js';
import { esc, getFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from './utils.js';
import { GetSettings, ReloadConfig, GetDepartments } from '../wailsjs/go/main/App';

let _render, _refreshContent;

export function init(render, refreshContent) {
    _render = render;
    _refreshContent = refreshContent;
}

export function renderSettings() {
    const s = state.settings;
    const loading = state.configLoading;

    if (!s && loading) return '<div class="placeholder"><span class="spinner"></span></div>';
    if (!s) return '<div class="placeholder">Einstellungen werden geladen…</div>';

    const curFontSize = getFontSize();

    return `
        <div class="settings-grid">
            ${s.configError ? `<div class="error-box">${esc(s.configError)}</div>` : ''}

            <div class="card">
                <div class="card-header"><span class="card-title">Darstellung</span></div>
                <div style="padding:16px">
                    <div class="settings-field">
                        <label>Schriftgröße</label>
                        <div class="settings-value" style="gap:10px;align-items:center">
                            <button class="btn-ghost font-size-btn" data-delta="-1" style="font-size:1.14rem;padding:2px 10px;line-height:1" title="Kleiner">A−</button>
                            <input type="range" id="font-size-slider"
                                min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" value="${curFontSize}"
                                style="width:120px;cursor:pointer">
                            <button class="btn-ghost font-size-btn" data-delta="1" style="font-size:1.29rem;padding:2px 10px;line-height:1" title="Größer">A+</button>
                            <span id="font-size-label" style="min-width:32px;text-align:right;font-weight:600">${curFontSize}px</span>
                            <button class="btn-ghost" id="font-size-reset" style="font-size:0.79rem;padding:3px 8px">Zurücksetzen</button>
                        </div>
                    </div>
                </div>
            </div>

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
                            ${s.publicKey ? `<button class="btn-ghost" id="export-pubkey-btn" style="font-size:0.79rem;padding:3px 8px">Als Datei speichern</button>` : ''}
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

export function isModuleActive(key) {
    if (!state.activeModules || state.activeModules.length === 0) return true;
    return state.activeModules.includes(key);
}

export function applyActiveModules(settings) {
    if (settings && settings.activeModules && settings.activeModules.length > 0) {
        state.activeModules = settings.activeModules;
    } else {
        state.activeModules = null;
    }
    const mainModules = ['overview', 'members', 'finance', 'calendar'];
    if (mainModules.includes(state.activeTab) && !isModuleActive(state.activeTab)) {
        state.activeTab = mainModules.find(m => isModuleActive(m)) || 'settings';
    }
}

export async function loadSettings() {
    try {
        state.settings = await GetSettings();
        applyActiveModules(state.settings);
        _render();
    } catch (e) {
        state.settings = { configError: String(e), publicKey: '', baseURL: '', tokenMasked: '', configURL: '' };
        if (state.activeTab === 'settings') _refreshContent();
    }
}

export async function doReloadConfig() {
    state.configLoading = true;
    state.settings = null;
    state.overview = null;
    _refreshContent();
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
        _render();
    }
}

export async function doExportPublicKey() {
    const { ExportPublicKey } = await import('../wailsjs/go/main/App');
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
