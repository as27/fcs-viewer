import { state } from './state.js';
import { esc, ICONS, formatTimestamp } from './utils.js';
import { GetTasksOverview, ReloadTasks, GetTaskMetadata, SaveTask, DeleteTask, ConfirmDeletion } from '../wailsjs/go/main/App';

let renderApp, refreshContent;

export function init(r, rc) {
    renderApp = r;
    refreshContent = rc;
}

export function renderTasks() {
    if (state.tasksLoading && (!state.tasksData || !state.tasksData.tasks)) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.tasksError) return `<div class="error-box">${esc(state.tasksError)}</div>`;
    
    const allTasks = (state.tasksData && state.tasksData.tasks) || [];
    
    // Get unique statuses for the filter
    const uniqueStatuses = [...new Set(allTasks.map(t => t.state))].sort();
    
    let tasks = allTasks;
    // Apply Filter
    if (state.tasksStatusFilter === 'hide_completed') {
        tasks = tasks.filter(t => t.state !== 'erledigt');
    } else if (state.tasksStatusFilter !== 'alle') {
        tasks = tasks.filter(t => t.state === state.tasksStatusFilter);
    }

    // Apply Sorting
    const col = state.tasksSortCol;
    const dir = state.tasksSortDir === 'asc' ? 1 : -1;
    tasks.sort((a, b) => {
        const av = String(a[col] ?? '').toLowerCase();
        const bv = String(b[col] ?? '').toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    const timestampHtml = state.tasksUpdatedAt ? `<span class="timestamp">${esc(formatTimestamp(state.tasksUpdatedAt))}</span>` : '';

    let statusFilterText = '';
    if (state.tasksStatusFilter === 'alle') {
        statusFilterText = 'gefunden';
    } else if (state.tasksStatusFilter === 'hide_completed') {
        statusFilterText = 'gefunden, die nicht erledigt sind';
    } else {
        statusFilterText = `mit dem Status "${state.tasksStatusFilter}" gefunden`;
    }

    const tableHtml = tasks.length === 0
        ? `<div class="empty-state">
             <div class="empty-state-icon">📋</div>
             <div class="empty-state-title">Keine Aufgaben</div>
             <div class="empty-state-text">Es wurden keine Aufgaben ${esc(statusFilterText)}.</div>
           </div>`
        : `<table class="data-table">
            <thead>
                <tr>
                    <th style="width:110px" class="${state.tasksSortCol === 'due' ? 'sort-' + state.tasksSortDir : ''}" data-sort="due">Termin</th>
                    <th class="${state.tasksSortCol === 'name' ? 'sort-' + state.tasksSortDir : ''}" data-sort="name">Aufgabe</th>
                    <th style="width:140px" class="${state.tasksSortCol === 'state' ? 'sort-' + state.tasksSortDir : ''}" data-sort="state">Status</th>
                    <th style="width:110px" class="${state.tasksSortCol === 'public' ? 'sort-' + state.tasksSortDir : ''}" data-sort="public">Sichtbarkeit</th>
                    <th style="width:80px"></th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(t => `
                    <tr>
                        <td class="nowrap">${esc(t.due)}</td>
                        <td>
                            <div style="font-weight:600;color:#111">${esc(t.name)}</div>
                            <div style="font-size:0.79rem;color:#666;margin-top:2px;white-space:normal">${esc(t.description)}</div>
                            ${t.taskGroup ? `<div style="font-size:0.71rem;color:#999;margin-top:2px">Gruppe: ${esc(t.taskGroup)}</div>` : ''}
                            ${t.parentEvent ? `<div style="font-size:0.71rem;color:#999">Vkn. Kalender-Termin: ${esc(t.parentEvent)}</div>` : ''}
                        </td>
                        <td>
                            <span class="badge ${t.state === 'erledigt' ? 'badge-green' : (t.state === 'läuft' ? 'badge-yellow' : 'badge-amber')}">
                                ${esc(t.state)}
                            </span>
                        </td>
                        <td>${t.public ? 'Öffentlich' : 'Intern'}</td>
                        <td style="text-align:right;white-space:nowrap">
                            <button class="btn-ghost task-edit-btn" data-id="${t.id}" title="Bearbeiten">
                                ${ICONS.edit}
                            </button>
                            <button class="btn-ghost task-delete-btn" data-id="${t.id}" title="Löschen" style="color:#dc2626;margin-left:4px">
                                ${ICONS.trash}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;

    return `
        <div class="members-layout">
            <div class="members-toolbar">
                <div style="display:flex;align-items:center;gap:12px">
                    <button class="btn-primary" id="tasks-reload-btn" ${state.tasksLoading ? 'disabled' : ''}>
                        ${state.tasksLoading ? '<span class="spinner"></span>' : ''} Aktualisieren
                    </button>
                    
                    <button class="btn-ghost" id="task-add-btn">
                        ${ICONS.plus} Aufgabe anlegen
                    </button>

                    <div style="display:flex;align-items:center;gap:8px;margin-left:12px">
                        <label for="tasks-status-filter" style="font-size:0.79rem;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.03em">Status:</label>
                        <select class="dept-select" id="tasks-status-filter" style="width:180px; border-color:rgba(0,0,0,0.3); background-color:#fff; color:#111">
                            <option value="alle" ${state.tasksStatusFilter === 'alle' ? 'selected' : ''}>Alle</option>
                            <option value="hide_completed" ${state.tasksStatusFilter === 'hide_completed' ? 'selected' : ''}>Erledigt ausblenden</option>
                            ${uniqueStatuses.map(s => `
                                <option value="${esc(s)}" ${state.tasksStatusFilter === s ? 'selected' : ''}>${esc(s)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:12px">
                    ${timestampHtml}
                    ${state.tasksError ? `<span class="err-msg">${esc(state.tasksError)}</span>` : `<span class="status-count">${tasks.length} Aufgaben</span>`}
                </div>
            </div>
            <div class="card">
                <div class="table-scroll">
                    ${tableHtml}
                </div>
            </div>
        </div>
        ${renderTaskModal()}
    `;
}

function renderTaskModal() {
    if (!state.taskModalOpen) return '';

    const t = state.taskModalTask || {};
    const isNew = !t.id;

    let content = '';

    if (state.taskModalPreview) {
        content = `
            <div class="modal-confirm-intro">Vorschau der Aufgabe:</div>
            <div class="modal-confirm-table">
                <div class="modal-confirm-row"><span class="modal-label">Name:</span> <strong>${esc(t.name)}</strong></div>
                <div class="modal-confirm-row"><span class="modal-label">Beschreibung:</span> <div style="white-space:pre-wrap">${esc(t.description)}</div></div>
                <div class="modal-confirm-row"><span class="modal-label">Termin:</span> ${esc(t.due || '-')}</div>
                <div class="modal-confirm-row"><span class="modal-label">Status:</span> ${esc(t.state)}</div>
                <div class="modal-confirm-row"><span class="modal-label">Sichtbarkeit:</span> ${t.public ? 'Öffentlich' : 'Intern'}</div>
                <div class="modal-confirm-row"><span class="modal-label">Gruppe:</span> ${state.taskGroups.find(g => g.id == t.taskGroupID)?.name || '-'}</div>
                <div class="modal-confirm-row"><span class="modal-label">Kalender-Termin:</span> ${state.taskEvents.find(e => e.id == t.parentEventID)?.name || '-'}</div>
            </div>
        `;
    } else {
        content = `
            <div class="modal-fields">
                <label class="modal-field-label">
                    <span>Name</span>
                    <input type="text" class="modal-input" id="task-form-name" value="${esc(t.name)}">
                </label>
                <label class="modal-field-label">
                    <span>Beschreibung</span>
                    <textarea class="modal-input" id="task-form-description" style="min-height:80px">${esc(t.description)}</textarea>
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <label class="modal-field-label">
                        <span>Termin (Datum)</span>
                        <input type="date" class="modal-input" id="task-form-due" value="${esc(t.due)}">
                    </label>
                    <label class="modal-field-label">
                        <span>Status</span>
                        <select class="modal-input" id="task-form-state">
                            <option value="offen" ${t.state === 'offen' ? 'selected' : ''}>Offen</option>
                            <option value="läuft" ${t.state === 'läuft' ? 'selected' : ''}>Läuft</option>
                            <option value="erledigt" ${t.state === 'erledigt' ? 'selected' : ''}>Erledigt</option>
                        </select>
                    </label>
                </div>
                <label class="modal-field-label">
                    <span>Aufgabengruppe</span>
                    <select class="modal-input" id="task-form-group">
                        <option value="0">-- Keine Gruppe --</option>
                        ${state.taskGroups.map(g => `<option value="${g.id}" ${t.taskGroupID == g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
                    </select>
                </label>
                <label class="modal-field-label">
                    <span>Verknüpfter Kalender-Termin</span>
                    <select class="modal-input" id="task-form-event" title="Wähle einen Termin aus dem Kalender, falls diese Aufgabe direkt damit verknüpft ist.">
                        <option value="0">-- Kein Kalender-Termin --</option>
                        ${state.taskEvents.map(e => `<option value="${e.id}" ${t.parentEventID == e.id ? 'selected' : ''}>${e.date ? esc(e.date) + ': ' : ''}${esc(e.name)}</option>`).join('')}
                    </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.93rem;cursor:pointer;margin-top:4px">
                    <input type="checkbox" id="task-form-public" ${t.public ? 'checked' : ''}>
                    Öffentlich sichtbar
                </label>
            </div>
        `;
    }

    const footer = state.taskModalPreview
        ? `<button class="btn-ghost" id="task-modal-back">Zurück</button>
           <button class="btn-primary" id="task-modal-save" ${state.taskModalLoading ? 'disabled' : ''}>
             ${state.taskModalLoading ? '<span class="spinner"></span>' : ''} Speichern
           </button>`
        : `<button class="btn-ghost" id="task-modal-cancel">Abbrechen</button>
           <button class="btn-primary" id="task-modal-preview">Vorschau</button>`;

    return `
        <div class="modal-backdrop">
            <div class="modal" style="width:500px">
                <div class="modal-header">
                    <div class="modal-title">${isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}</div>
                    <button class="modal-close" id="task-modal-close-x">&times;</button>
                </div>
                <div class="modal-body">
                    ${state.taskModalError ? `<div class="modal-error">${esc(state.taskModalError)}</div>` : ''}
                    ${content}
                </div>
                <div class="modal-footer">
                    ${footer}
                </div>
            </div>
        </div>
    `;
}

export async function openTaskModal(taskId = 0) {
    state.taskModalOpen = true;
    state.taskModalPreview = false;
    state.taskModalError = '';
    state.taskModalLoading = false;

    if (taskId === 0) {
        state.taskModalTask = {
            id: 0,
            name: '',
            description: '',
            due: '',
            state: 'offen',
            public: false,
            taskGroupID: 0,
            parentEventID: 0
        };
    } else {
        const t = state.tasksData.tasks.find(x => x.id === taskId);
        state.taskModalTask = JSON.parse(JSON.stringify(t));
    }

    renderApp();

    // Load metadata if empty
    if (state.taskGroups.length === 0 || state.taskEvents.length === 0) {
        try {
            const meta = await GetTaskMetadata();
            state.taskGroups = meta.taskGroups || [];
            state.taskEvents = meta.events || [];
            renderApp();
        } catch (e) {
            console.error("Meta loading error", e);
        }
    }
}

export function closeTaskModal() {
    state.taskModalOpen = false;
    state.taskModalTask = null;
    state.taskModalPreview = false;
    state.taskModalError = '';
    renderApp();
}

async function doSaveTask() {
    state.taskModalLoading = true;
    state.taskModalError = '';
    renderApp();

    try {
        const res = await SaveTask(state.taskModalTask);
        state.tasksData = res.data;
        state.tasksUpdatedAt = res.updatedAt;
        closeTaskModal();
    } catch (e) {
        state.taskModalError = String(e);
        state.taskModalLoading = false;
        renderApp();
    }
}

export function attachTasksListeners() {
    const reloadBtn = document.getElementById('tasks-reload-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', doReloadTasks);
    
    const addBtn = document.getElementById('task-add-btn');
    if (addBtn) addBtn.addEventListener('click', () => openTaskModal(0));

    document.querySelectorAll('.task-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openTaskModal(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll('.task-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => doDeleteTask(parseInt(btn.dataset.id)));
    });

    const statusFilter = document.getElementById('tasks-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            state.tasksStatusFilter = e.target.value;
            renderApp();
        });
    }

    // Modal listeners
    const closeX = document.getElementById('task-modal-close-x');
    if (closeX) closeX.addEventListener('click', closeTaskModal);

    const cancelBtn = document.getElementById('task-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeTaskModal);

    const previewBtn = document.getElementById('task-modal-preview');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            // Update state with form values
            state.taskModalTask.name = document.getElementById('task-form-name').value;
            state.taskModalTask.description = document.getElementById('task-form-description').value;
            state.taskModalTask.due = document.getElementById('task-form-due').value;
            state.taskModalTask.state = document.getElementById('task-form-state').value;
            state.taskModalTask.public = document.getElementById('task-form-public').checked;
            state.taskModalTask.taskGroupID = parseInt(document.getElementById('task-form-group').value);
            state.taskModalTask.parentEventID = parseInt(document.getElementById('task-form-event').value);
            
            state.taskModalPreview = true;
            renderApp();
        });
    }

    const backBtn = document.getElementById('task-modal-back');
    if (backBtn) backBtn.addEventListener('click', () => {
        state.taskModalPreview = false;
        renderApp();
    });

    const saveBtn = document.getElementById('task-modal-save');
    if (saveBtn) saveBtn.addEventListener('click', doSaveTask);

    // Sort Listeners
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.tasksSortCol === col) {
                state.tasksSortDir = state.tasksSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.tasksSortCol = col;
                state.tasksSortDir = 'asc';
            }
            renderApp();
        });
    });
}

export async function loadTasksOverview() {
    state.tasksLoading = true;
    state.tasksError = '';
    renderApp();

    try {
        const res = await GetTasksOverview();
        state.tasksData = res.data;
        state.tasksUpdatedAt = res.updatedAt;
    } catch (e) {
        state.tasksError = String(e);
    } finally {
        state.tasksLoading = false;
        renderApp();
    }
}

export async function doReloadTasks() {
    state.tasksLoading = true;
    state.tasksError = '';
    renderApp();

    try {
        const res = await ReloadTasks();
        state.tasksData = res.data;
        state.tasksUpdatedAt = res.updatedAt;
    } catch (e) {
        state.tasksError = String(e);
    } finally {
        state.tasksLoading = false;
        renderApp();
    }
}

async function doDeleteTask(taskId) {
    const task = state.tasksData.tasks.find(x => x.id === taskId);
    const taskName = task ? task.name : '';

    try {
        const confirmed = await ConfirmDeletion('Aufgabe löschen', `Möchtest du die Aufgabe "${taskName}" wirklich löschen?`);
        if (!confirmed) {
            return;
        }
    } catch (e) {
        console.error("ConfirmDeletion error", e);
        if (!confirm(`Möchtest du die Aufgabe "${taskName}" wirklich löschen?`)) {
            return;
        }
    }

    state.tasksLoading = true;
    state.tasksError = '';
    renderApp();

    try {
        const res = await DeleteTask(taskId);
        state.tasksData = res.data;
        state.tasksUpdatedAt = res.updatedAt;
    } catch (e) {
        state.tasksError = String(e);
    } finally {
        state.tasksLoading = false;
        renderApp();
    }
}
