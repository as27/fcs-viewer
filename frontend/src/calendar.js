import { state } from './state.js';
import { esc } from './utils.js';
import { GetCalendars, GetCalendarEvents } from '../wailsjs/go/main/App';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const BIRTHDAY_CAL = { id: -1, name: 'Geburtstage', color: '#F5C400' };

let _refreshContent;

export function init(_render, refreshContent) {
    _refreshContent = refreshContent;
}

export function renderCalendar() {
    if (state.calLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.calError) {
        return `<div class="error-box">${esc(state.calError)}</div>`;
    }

    const { calYear: year, calMonth: month } = state;
    const allCals = [...state.calCalendars, BIRTHDAY_CAL];

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
            <button class="btn-ghost" id="cal-today" style="margin-left:8px;font-size:0.86rem">Heute</button>
            ${viewToggle}
            <button class="btn-ghost" id="cal-reload" style="margin-left:auto;font-size:0.86rem">Neu laden</button>
        </div>`;

    const mainContent = isMonth
        ? renderCalendarMonth(visibleEvents, year, month)
        : renderCalendarList(visibleEvents);

    return `
        <div class="cal-layout">
            <div class="cal-sidebar">
                <div class="cal-sidebar-title">Kalender</div>
                <div class="cal-filters">${calFilterHtml || '<span style="color:#aaa;font-size:0.86rem">Keine Kalender</span>'}</div>
            </div>
            <div class="cal-main">
                ${header}
                ${mainContent}
            </div>
        </div>
    `;
}

function renderCalendarMonth(visibleEvents, year, month) {
    const byDay = {};
    for (const ev of visibleEvents) {
        const day = ev.start.slice(0, 10);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(ev);
    }

    const firstDay = new Date(year, month - 1, 1).getDay();
    const startOffset = (firstDay + 6) % 7;
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

    const sorted = [...visibleEvents].sort((a, b) => a.start.localeCompare(b.start));

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

export async function loadCalendarData() {
    if (state.calCalendars.length === 0) {
        try {
            const cals = await GetCalendars();
            state.calCalendars = cals || [];
            for (const c of state.calCalendars) {
                if (!(c.id in state.calEnabled)) state.calEnabled[c.id] = true;
            }
            if (!(-1 in state.calEnabled)) state.calEnabled[-1] = true;
        } catch (e) {
            state.calError = String(e);
            state.calLoading = false;
            if (state.activeTab === 'calendar') _refreshContent();
            return;
        }
    }
    await loadCalendarEvents();
}

export async function loadCalendarEvents() {
    state.calLoading = true;
    state.calError = '';
    if (state.activeTab === 'calendar') _refreshContent();
    try {
        const evts = await GetCalendarEvents(state.selectedDept || '', state.calYear, state.calMonth);
        state.calEvents = evts || [];
    } catch (e) {
        state.calError = String(e);
        state.calEvents = [];
    } finally {
        state.calLoading = false;
        if (state.activeTab === 'calendar') _refreshContent();
    }
}
