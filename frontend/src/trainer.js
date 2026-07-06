import { state } from './state.js';
import { esc, escHtml, formatTimestamp, ICONS } from './utils.js';
import {
    GetTrainers,
    ReloadTrainers,
    SaveTrainer,
    DeleteTrainer,
    SelectTrainerFile,
    DownloadTrainerFile,
    ConfirmDeletion
} from '../wailsjs/go/main/App';

let _render, _refreshContent;

export function init(render, refreshContent) {
    _render = render;
    _refreshContent = refreshContent;
}

export function filterAndSortTrainers() {
    let rows = [...state.trainers];
    if (state.search) {
        const q = state.search.toLowerCase();
        rows = rows.filter(t =>
            String(t.membershipNumber || '').toLowerCase().includes(q) ||
            String(t.firstName || '').toLowerCase().includes(q) ||
            String(t.familyName || '').toLowerCase().includes(q) ||
            String(t.uebungsleiterDesc || '').toLowerCase().includes(q)
        );
    }
    return rows;
}

export function renderTrainer() {
    const rows = filterAndSortTrainers();

    const tableHtml = rows.length === 0
        ? `<div class="empty-state">
             <div class="empty-state-icon">👟</div>
             <div class="empty-state-title">${state.selectedDept ? (state.search ? 'Keine Treffer' : 'Keine Übungsleiter') : 'Abteilung wählen'}</div>
             <div class="empty-state-text">${state.selectedDept ? (state.search ? 'Die Suche ergab keine Treffer.' : 'In dieser Abteilung sind noch keine Übungsleiter hinterlegt.') : 'Bitte eine Abteilung in der Seitenleiste wählen.'}</div>
           </div>`
        : `<table class="data-table">
            <thead>
                <tr>
                    <th style="width:70px">Nr.</th>
                    <th>Name</th>
                    <th>Telefon / E-Mail</th>
                    <th>Lizenz B</th>
                    <th>Lizenz C</th>
                    <th>Sporthelfer</th>
                    <th>Beschreibung</th>
                    <th style="width:80px"></th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(t => {
                    const downloadBtn = (url, label) => {
                        if (!url || !url.startsWith('http')) return '<span class="text-muted">—</span>';
                        const ext = url.split('.').pop().split('?')[0] || 'pdf';
                        const filename = `${t.familyName}_${t.firstName}_${label}.${ext}`;
                        return `
                            <button class="btn-ghost file-download-btn" data-url="${esc(url)}" data-filename="${esc(filename)}" title="Herunterladen">
                                ${ICONS.download || '⬇️'} Nachweis
                            </button>
                        `;
                    };

                    return `
                        <tr>
                            <td>${esc(t.membershipNumber)}</td>
                            <td><strong>${esc(t.familyName)}, ${esc(t.firstName)}</strong></td>
                            <td>
                                <div style="font-size:0.85rem">${esc(t.phone || '—')}</div>
                                <div style="font-size:0.8rem;color:#555">${esc(t.email || '—')}</div>
                            </td>
                            <td>
                                <div>${esc(t.lizenzBGueltigBis || '—')}</div>
                                <div style="margin-top:4px">${downloadBtn(t.lizenzBNachweis, 'Lizenz_B')}</div>
                            </td>
                            <td>
                                <div>${esc(t.lizenzCGueltigBis || '—')}</div>
                                <div style="margin-top:4px">${downloadBtn(t.lizenzCNachweis, 'Lizenz_C')}</div>
                            </td>
                            <td>
                                <div>${esc(t.sporthelferGueltigAb ? 'Ab ' + t.sporthelferGueltigAb : '—')}</div>
                                <div style="margin-top:4px">${downloadBtn(t.sporthelfer, 'Sporthelfer')}</div>
                            </td>
                            <td title="${esc(t.uebungsleiterDesc)}" style="white-space:normal;max-width:200px;font-size:0.85rem">
                                ${esc(t.uebungsleiterDesc || '—')}
                            </td>
                            <td style="text-align:right;white-space:nowrap">
                                <button class="btn-ghost trainer-edit-btn" data-id="${t.memberId}" title="Bearbeiten">
                                    ${ICONS.edit}
                                </button>
                                <button class="btn-ghost trainer-delete-btn" data-id="${t.memberId}" title="Löschen" style="color:#dc2626;margin-left:4px">
                                    ${ICONS.trash}
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;

    const timestampHtml = state.trainersUpdatedAt ? `<span class="timestamp">${esc(formatTimestamp(state.trainersUpdatedAt))}</span>` : '';

    return `
        <div class="members-layout">
            <div class="members-toolbar">
                <button class="btn-primary" id="trainer-add-btn" ${!state.selectedDept ? 'disabled' : ''}>
                    Übungsleiter hinzufügen
                </button>
                <button class="btn-ghost" id="trainer-reload-btn" ${state.trainerLoading ? 'disabled' : ''}>
                    ${state.trainerLoading ? '<span class="spinner"></span> Laden…' : 'Neu laden'}
                </button>
                ${timestampHtml}
                ${state.trainerError ? `<span class="err-msg">${esc(state.trainerError)}</span>` : `<span class="status-count">${rows.length} Übungsleiter</span>`}
            </div>
            <div class="card">
                ${state.trainerLoading && state.trainers.length === 0
                    ? '<div class="placeholder"><span class="spinner"></span></div>'
                    : `<div class="table-scroll">${tableHtml}</div>`}
            </div>
        </div>
        ${state.trainerSearchMemberOpen ? renderSearchMemberModal() : ''}
        ${state.trainerModalOpen ? renderTrainerModal() : ''}
    `;
}

function renderSearchMemberModal() {
    const members = state.members || [];
    
    const sortedMembers = [...members].sort((a, b) => {
        const nameA = `${a.familyName}, ${a.firstName}`.toLowerCase();
        const nameB = `${b.familyName}, ${b.firstName}`.toLowerCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    });

    return `
        <div class="modal-backdrop">
            <div class="modal" style="width:500px">
                <div class="modal-header">
                    <div class="modal-title">Mitglied für Übungsleiter auswählen</div>
                    <button class="modal-close" id="trainer-search-modal-close-x">&times;</button>
                </div>
                <div class="modal-body" style="padding-bottom:12px">
                    <div class="search-wrap" style="width:100%;margin-bottom:12px;background:#fff;border:1.5px solid var(--accent)">
                        ${ICONS.search}
                        <input id="trainer-search-member-input" placeholder="Nach Name oder Mitgliedsnummer suchen…" style="width:100%">
                    </div>
                    <div class="trainer-member-list" style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:6px;background:#fff">
                        ${sortedMembers.map(m => {
                            const isAlreadyTrainer = state.trainers.some(t => t.memberId === m.id);
                            return `
                                <div class="trainer-member-item" 
                                     data-id="${m.id}" 
                                     data-num="${esc(m.membershipNumber)}"
                                     data-fn="${esc(m.firstName)}"
                                     data-ln="${esc(m.familyName)}"
                                     data-search="${esc(m.familyName + ' ' + m.firstName + ' ' + m.membershipNumber).toLowerCase()}"
                                     style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;transition:background 0.12s"
                                >
                                    <div>
                                        <strong>${esc(m.familyName)}, ${esc(m.firstName)}</strong>
                                        <div style="font-size:0.79rem;color:#666">Mitglieds-Nr: ${esc(m.membershipNumber)}</div>
                                    </div>
                                    ${isAlreadyTrainer ? `<span class="badge badge-yellow" style="font-size:0.65rem">Bereits Übungsleiter</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" id="trainer-search-modal-cancel">Abbrechen</button>
                </div>
            </div>
        </div>
    `;
}

function renderTrainerModal() {
    const t = state.trainerModalData || {};
    
    const fileFieldHtml = (fieldDefId, label, currentUrl, valId) => {
        const localPath = state.trainerSelectedFilePaths[fieldDefId] || '';
        const hasLocal = !!localPath;
        const hasRemote = currentUrl && currentUrl.startsWith('http');
        
        let fileStatus = '<span class="text-muted">Keine Datei ausgewählt</span>';
        if (hasLocal) {
            fileStatus = `<span style="color:#059669;font-weight:600">Bereit zum Upload: ${esc(localPath.split('/').pop())}</span>`;
        } else if (hasRemote) {
            const ext = currentUrl.split('.').pop().split('?')[0] || 'pdf';
            const fn = `${t.familyName}_${t.firstName}_${label}.${ext}`;
            fileStatus = `
                <div style="display:flex;align-items:center;gap:6px">
                    <span style="color:#2563eb">Datei vorhanden</span>
                    <button type="button" class="btn-ghost file-download-btn" data-url="${esc(currentUrl)}" data-filename="${esc(fn)}" style="padding:2px 6px;font-size:0.75rem">
                        Herunterladen
                    </button>
                    <button type="button" class="btn-ghost file-clear-btn" data-field-id="${fieldDefId}" style="padding:2px 6px;font-size:0.75rem;color:#dc2626">
                        Löschen
                    </button>
                </div>
            `;
        }

        return `
            <div class="file-upload-row" style="margin-top:6px;display:flex;align-items:center;gap:12px">
                <button type="button" class="btn-ghost file-select-btn" data-field-id="${fieldDefId}" style="font-size:0.85rem">
                    Datei wählen…
                </button>
                <div style="font-size:0.85rem">${fileStatus}</div>
            </div>
        `;
    };

    const memberSelectSection = `
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">
            <label class="modal-field-label">
                <span>Mitgliedsnummer</span>
                <input type="text" class="modal-input" id="trainer-form-member-num" readOnly disabled value="${esc(t.membershipNumber || '')}">
            </label>
            <label class="modal-field-label">
                <span>Name</span>
                <input type="text" class="modal-input" id="trainer-form-name" readOnly disabled value="${esc(t.familyName)}, ${esc(t.firstName)}">
            </label>
        </div>
    `;

    return `
        <div class="modal-backdrop">
            <div class="modal" style="width:550px">
                <div class="modal-header">
                    <div class="modal-title">${!t.lizenzBGueltigBisValId && !t.lizenzCGueltigBisValId && !t.sporthelferGueltigAbValId && !t.uebungsleiterDescValId ? 'Übungsleiter hinzufügen' : 'Übungsleiter bearbeiten'}</div>
                    <button class="modal-close" id="trainer-modal-close-x">&times;</button>
                </div>
                <div class="modal-body">
                    ${state.trainerModalError ? `<div class="modal-error">${esc(state.trainerModalError)}</div>` : ''}
                    <div class="modal-fields">
                        ${memberSelectSection}
                        
                        <div style="border-top:1px solid #eee;margin:16px 0"></div>
                        
                        <div style="display:grid;grid-template-columns:1fr;gap:12px">
                            <div>
                                <label class="modal-field-label">
                                    <span>Lizenz B gültig bis</span>
                                    <input type="date" class="modal-input" id="trainer-form-lizenz-b-date" value="${esc(t.lizenzBGueltigBis || '')}">
                                </label>
                                ${fileFieldHtml('523236117', 'Lizenz_B', t.lizenzBNachweis, t.lizenzBNachweisValId)}
                            </div>
                            
                            <div style="margin-top:8px">
                                <label class="modal-field-label">
                                    <span>Lizenz C gültig bis</span>
                                    <input type="date" class="modal-input" id="trainer-form-lizenz-c-date" value="${esc(t.lizenzCGueltigBis || '')}">
                                </label>
                                ${fileFieldHtml('523236273', 'Lizenz_C', t.lizenzCNachweis, t.lizenzCNachweisValId)}
                            </div>
                            
                            <div style="margin-top:8px">
                                <label class="modal-field-label">
                                    <span>Sporthelfer-Bescheinigung gültig ab</span>
                                    <input type="date" class="modal-input" id="trainer-form-sporthelfer-date" value="${esc(t.sporthelferGueltigAb || '')}">
                                </label>
                                ${fileFieldHtml('523236528', 'Sporthelfer', t.sporthelfer, t.sporthelferValId)}
                            </div>
                        </div>

                        <label class="modal-field-label" style="margin-top:12px">
                            <span>Übungsleiter Beschreibung</span>
                            <textarea class="modal-input" id="trainer-form-desc" style="min-height:80px">${esc(t.uebungsleiterDesc || '')}</textarea>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" id="trainer-modal-cancel">Abbrechen</button>
                    <button class="btn-primary" id="trainer-modal-save" ${state.trainerModalLoading ? 'disabled' : ''}>
                        ${state.trainerModalLoading ? '<span class="spinner"></span>' : ''} Speichern
                    </button>
                </div>
            </div>
        </div>
    `;
}

export async function loadTrainers(force = false) {
    if (!state.selectedDept) return;
    state.trainerLoading = true;
    state.trainerError = '';
    _render();
    try {
        const resp = await (force ? ReloadTrainers : GetTrainers)(state.selectedDept);
        state.trainers = resp.data || [];
        state.trainersUpdatedAt = resp.updatedAt || '';
    } catch (e) {
        state.trainerError = String(e);
        state.trainers = [];
    } finally {
        state.trainerLoading = false;
        _render();
    }
}

export function attachTrainerListeners() {
    // Reload Button
    const reloadBtn = document.getElementById('trainer-reload-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => loadTrainers(true));
    }

    // Add Trainer Button (Opens member selector modal)
    const addBtn = document.getElementById('trainer-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            state.trainerSearchMemberOpen = true;
            state.trainerModalOpen = false;
            state.trainerModalLoading = false;
            state.trainerModalData = null;
            state.trainerSelectedFilePaths = {};
            _render();
        });
    }

    // Edit Button
    document.querySelectorAll('.trainer-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const memberId = parseInt(btn.dataset.id, 10);
            const trainer = state.trainers.find(t => t.memberId === memberId);
            if (trainer) {
                state.trainerModalOpen = true;
                state.trainerSearchMemberOpen = false;
                state.trainerModalLoading = false;
                state.trainerModalData = JSON.parse(JSON.stringify(trainer)); // Deep clone
                state.trainerSelectedFilePaths = {};
                _render();
            }
        });
    });

    // Delete Button
    document.querySelectorAll('.trainer-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const memberId = parseInt(btn.dataset.id, 10);
            const trainer = state.trainers.find(t => t.memberId === memberId);
            if (!trainer) return;

            const confirmed = await ConfirmDeletion(
                'Übungsleiter löschen',
                `Möchten Sie den Übungsleiter-Status für "${trainer.firstName} ${trainer.familyName}" wirklich aufheben? Alle hinterlegten Lizenzen und Nachweise werden gelöscht.`
            );
            if (!confirmed) return;

            state.trainerLoading = true;
            _render();

            try {
                const resp = await DeleteTrainer(state.selectedDept, memberId);
                state.trainers = resp.data || [];
                state.trainersUpdatedAt = resp.updatedAt || '';
            } catch (e) {
                alert('Fehler beim Löschen: ' + String(e));
            } finally {
                state.trainerLoading = false;
                _render();
            }
        });
    });

    // File Download Button
    document.querySelectorAll('.file-download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const filename = btn.dataset.filename;
            try {
                const path = await DownloadTrainerFile(url, filename);
                if (path) {
                    const originalText = btn.textContent;
                    btn.textContent = 'Heruntergeladen!';
                    setTimeout(() => { btn.textContent = originalText; }, 2000);
                }
            } catch (err) {
                alert('Download fehlgeschlagen: ' + String(err));
            }
        });
    });

    // Trainer Form Modal Close
    const closeX = document.getElementById('trainer-modal-close-x');
    if (closeX) closeX.addEventListener('click', closeModal);
    const cancelBtn = document.getElementById('trainer-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Member Selector Modal Close
    const searchCloseX = document.getElementById('trainer-search-modal-close-x');
    if (searchCloseX) searchCloseX.addEventListener('click', closeSearchModal);
    const searchCancelBtn = document.getElementById('trainer-search-modal-cancel');
    if (searchCancelBtn) searchCancelBtn.addEventListener('click', closeSearchModal);

    // Member Selection Search Filter
    const searchInput = document.getElementById('trainer-search-member-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.trainer-member-item').forEach(item => {
                const text = item.dataset.search;
                if (text.includes(q)) {
                    item.style.setProperty('display', 'flex', 'important');
                } else {
                    item.style.setProperty('display', 'none', 'important');
                }
            });
        });
        searchInput.focus();
    }

    // Select Member in selector modal
    document.querySelectorAll('.trainer-member-item').forEach(item => {
        item.addEventListener('click', () => {
            const memberId = parseInt(item.dataset.id, 10);
            const num = item.dataset.num;
            const fn = item.dataset.fn;
            const ln = item.dataset.ln;

            // Check if already trainer
            const existing = state.trainers.find(t => t.memberId === memberId);
            if (existing) {
                // Open edit instead
                state.trainerModalData = JSON.parse(JSON.stringify(existing));
                state.trainerModalOpen = true;
                state.trainerSearchMemberOpen = false;
                _render();
                return;
            }

            state.trainerModalData = {
                memberId: memberId,
                membershipNumber: num,
                firstName: fn,
                familyName: ln,
                lizenzBGueltigBis: '',
                lizenzBNachweis: '',
                lizenzCGueltigBis: '',
                lizenzCNachweis: '',
                sporthelferGueltigAb: '',
                sporthelfer: '',
                uebungsleiterDesc: ''
            };
            state.trainerModalOpen = true;
            state.trainerSearchMemberOpen = false;
            _render();
        });
    });

    // Save Trainer
    const saveBtn = document.getElementById('trainer-modal-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveCurrentModalInputs();
            state.trainerModalLoading = true;
            state.trainerModalError = '';
            _render();

            try {
                const t = state.trainerModalData;
                const row = {
                    memberId: t.memberId,
                    membershipNumber: t.membershipNumber,
                    firstName: t.firstName,
                    familyName: t.familyName,
                    lizenzBGueltigBis: t.lizenzBGueltigBis || "",
                    lizenzBGueltigBisValId: t.lizenzBGueltigBisValId || 0,
                    lizenzBNachweis: t.lizenzBNachweis || "",
                    lizenzBNachweisValId: t.lizenzBNachweisValId || 0,
                    lizenzCGueltigBis: t.lizenzCGueltigBis || "",
                    lizenzCGueltigBisValId: t.lizenzCGueltigBisValId || 0,
                    lizenzCNachweis: t.lizenzCNachweis || "",
                    lizenzCNachweisValId: t.lizenzCNachweisValId || 0,
                    sporthelferGueltigAb: t.sporthelferGueltigAb || "",
                    sporthelferGueltigAbValId: t.sporthelferGueltigAbValId || 0,
                    sporthelfer: t.sporthelfer || "",
                    sporthelferValId: t.sporthelferValId || 0,
                    uebungsleiterDesc: t.uebungsleiterDesc || "",
                    uebungsleiterDescValId: t.uebungsleiterDescValId || 0
                };

                const resp = await SaveTrainer(state.selectedDept, row, state.trainerSelectedFilePaths);
                state.trainers = resp.data || [];
                state.trainersUpdatedAt = resp.updatedAt || '';
                closeModal();
            } catch (err) {
                state.trainerModalError = String(err);
                state.trainerModalLoading = false;
                _render();
            }
        });
    }

    // File Selection
    document.querySelectorAll('.file-select-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fieldId = btn.dataset.fieldId;
            try {
                saveCurrentModalInputs();
                const path = await SelectTrainerFile();
                if (path) {
                    state.trainerSelectedFilePaths[fieldId] = path;
                    
                    if (fieldId === '523236117') state.trainerModalData.lizenzBNachweis = path;
                    if (fieldId === '523236273') state.trainerModalData.lizenzCNachweis = path;
                    if (fieldId === '523236528') state.trainerModalData.sporthelfer = path;

                    _refreshContent();
                }
            } catch (err) {
                alert('Fehler bei der Dateiauswahl: ' + String(err));
            }
        });
    });

    // File Clear
    document.querySelectorAll('.file-clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldId = btn.dataset.fieldId;
            saveCurrentModalInputs();
            delete state.trainerSelectedFilePaths[fieldId];
            
            if (fieldId === '523236117') state.trainerModalData.lizenzBNachweis = "";
            if (fieldId === '523236273') state.trainerModalData.lizenzCNachweis = "";
            if (fieldId === '523236528') state.trainerModalData.sporthelfer = "";

            _refreshContent();
        });
    });
}

function saveCurrentModalInputs() {
    if (!state.trainerModalData) return;
    state.trainerModalData.lizenzBGueltigBis = document.getElementById('trainer-form-lizenz-b-date')?.value || "";
    state.trainerModalData.lizenzCGueltigBis = document.getElementById('trainer-form-lizenz-c-date')?.value || "";
    state.trainerModalData.sporthelferGueltigAb = document.getElementById('trainer-form-sporthelfer-date')?.value || "";
    state.trainerModalData.uebungsleiterDesc = document.getElementById('trainer-form-desc')?.value || "";
}

function closeModal() {
    state.trainerModalOpen = false;
    state.trainerModalLoading = false;
    state.trainerModalData = null;
    state.trainerSelectedFilePaths = {};
    _render();
}

function closeSearchModal() {
    state.trainerSearchMemberOpen = false;
    _render();
}
