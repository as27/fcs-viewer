(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))l(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const h of s.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&l(h)}).observe(document,{childList:!0,subtree:!0});function c(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerpolicy&&(s.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?s.credentials="include":n.crossorigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(n){if(n.ep)return;n.ep=!0;const s=c(n);fetch(n.href,s)}})();function L(t,a,c){return window.go.main.App.GetCalendarEvents(t,a,c)}function S(){return window.go.main.App.GetCalendars()}function D(){return window.go.main.App.GetDepartmentOverview()}function k(){return window.go.main.App.GetDepartments()}function T(t){return window.go.main.App.GetMembers(t)}function B(){return window.go.main.App.GetSettings()}function A(){return window.go.main.App.ReloadConfig()}function I(t){return window.go.main.App.ReloadMembers(t)}const m={overview:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
    </svg>`,members:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 14c0-3 2.2-5 5-5s5 2 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="13" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/>
        <path d="M13 9c1.8.4 3 1.8 3 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,finance:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
        <rect x="3" y="9.5" width="4" height="1.5" rx=".5" fill="currentColor"/>
    </svg>`,calendar:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="4" y="10" width="2" height="2" rx=".5" fill="currentColor"/>
        <rect x="7" y="10" width="2" height="2" rx=".5" fill="currentColor" opacity=".5"/>
        <rect x="10" y="10" width="2" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    </svg>`,settings:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,search:`<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#aaa" stroke-width="1.5"/>
        <path d="M11 11l3 3" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`},e={activeTab:"members",departments:[],selectedDept:"",members:[],loading:!1,configLoading:!1,error:"",overview:null,overviewLoading:!1,overviewError:"",overviewExpanded:{},search:"",sortCol:"familyName",sortDir:"asc",colMenuOpen:!1,settings:null,calYear:new Date().getFullYear(),calMonth:new Date().getMonth()+1,calEvents:[],calCalendars:[],calEnabled:{},calLoading:!1,calError:"",calView:"month",columns:[{key:"membershipNumber",label:"Nr.",visible:!0},{key:"familyName",label:"Nachname",visible:!0},{key:"firstName",label:"Vorname",visible:!0},{key:"dateOfBirth",label:"Geburtsdatum",visible:!0},{key:"email",label:"E-Mail",visible:!0},{key:"phone",label:"Telefon",visible:!1},{key:"mobile",label:"Mobil",visible:!1},{key:"street",label:"Stra\xDFe",visible:!1},{key:"zip",label:"PLZ",visible:!1},{key:"city",label:"Stadt",visible:!1},{key:"joinDate",label:"Eintritt",visible:!1},{key:"groups",label:"Gruppen",visible:!0}]},N={overview:"Abteilungen",members:"Mitglieder",finance:"Finanzen",calendar:"Kalender",settings:"Einstellungen"};function r(t){return String(t!=null?t:"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function O(){let t=[...e.members];if(e.search){const l=e.search.toLowerCase();t=t.filter(n=>Object.values(n).some(s=>String(s!=null?s:"").toLowerCase().includes(l)))}const a=e.sortCol,c=e.sortDir==="asc"?1:-1;return t.sort((l,n)=>{var u,d;const s=String((u=l[a])!=null?u:"").toLowerCase(),h=String((d=n[a])!=null?d:"").toLowerCase();return s<h?-c:s>h?c:0}),t}function b(){document.getElementById("app").innerHTML=`
        <div class="app-shell">
            ${K()}
            <div class="main">
                ${G()}
                <div class="content" id="content">
                    ${E()}
                </div>
            </div>
        </div>
    `,C()}function K(){const t=(a,c,l)=>`
        <div class="nav-item ${e.activeTab===a?"active":""}" data-tab="${a}">
            ${c} ${l}
        </div>`;return`
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
                <div class="nav-label">Hauptmen\xFC</div>
                ${t("overview",m.overview,"Abteilungen")}
                ${t("members",m.members,"Mitglieder")}
                ${t("finance",m.finance,"Finanzen")}
                ${t("calendar",m.calendar,"Kalender")}
            </div>

            <div class="nav-section">
                <div class="nav-label">System</div>
                ${t("settings",m.settings,"Einstellungen")}
            </div>

            <div class="sidebar-footer">
                <div class="dept-selector">
                    <label>Abteilung</label>
                    <select class="dept-select" id="dept-select" ${e.departments.length===0?"disabled":""}>
                        ${e.departments.length===0?"<option>\u2014 keine \u2014</option>":e.departments.map(a=>`<option value="${r(a)}" ${a===e.selectedDept?"selected":""}>${r(a)}</option>`).join("")}
                    </select>
                </div>
                <div class="sync-bar">
                    <div class="sync-dot ${e.loading?"active":""}"></div>
                    ${e.loading?"Wird geladen\u2026":e.members.length>0?`${e.members.length} Mitglieder`:"Bereit"}
                </div>
            </div>
        </div>
    `}function G(){const t=N[e.activeTab]||"",a=e.activeTab==="members";return`
        <div class="topbar">
            <span class="topbar-title">${r(t)}</span>
            <div class="topbar-spacer"></div>
            ${a?`
                <div class="search-wrap">
                    ${m.search}
                    <input id="search-input" placeholder="Suchen\u2026" value="${r(e.search)}">
                </div>`:""}
        </div>
    `}function E(){return e.activeTab==="members"?R():e.activeTab==="calendar"?`<div class="cal-wrapper">${U()}</div>`:`<div class="content-scroll">${e.activeTab==="overview"?F():e.activeTab==="settings"?H():j()}</div>`}function R(){const t=e.columns.filter(n=>n.visible),a=O(),c=e.colMenuOpen?`
        <div class="col-toggle-menu">
            ${e.columns.map((n,s)=>`
                <label>
                    <input type="checkbox" data-col="${s}" ${n.visible?"checked":""}>
                    ${r(n.label)}
                </label>`).join("")}
        </div>`:"",l=a.length===0?`<div class="placeholder">${e.selectedDept?"Keine Mitglieder gefunden.":"Bitte eine Abteilung w\xE4hlen."}</div>`:`<table class="data-table">
            <thead><tr>
                ${t.map(n=>`
                    <th class="${e.sortCol===n.key?"sort-"+e.sortDir:""}"
                        data-sort="${n.key}">${r(n.label)}</th>
                `).join("")}
            </tr></thead>
            <tbody>
                ${a.map(n=>`<tr>
                    ${t.map(s=>`<td title="${r(n[s.key])}">${r(n[s.key])}</td>`).join("")}
                </tr>`).join("")}
            </tbody>
        </table>`;return`
        <div class="members-layout">
            <div class="members-toolbar">
                <div class="col-toggle">
                    <button class="btn-ghost" id="col-toggle-btn">Spalten</button>
                    ${c}
                </div>
                <button class="btn-primary" id="reload-btn" ${e.loading?"disabled":""}>
                    ${e.loading?'<span class="spinner"></span> Laden\u2026':"Neu laden"}
                </button>
                ${e.error?`<span class="err-msg">${r(e.error)}</span>`:`<span class="status-count">${a.length} Eintr\xE4ge</span>`}
            </div>
            <div class="card">
                ${e.loading&&e.members.length===0?'<div class="placeholder"><span class="spinner"></span></div>':`<div class="table-scroll">${l}</div>`}
            </div>
        </div>
    `}function F(){return e.overviewLoading?'<div class="placeholder"><span class="spinner"></span></div>':e.overviewError?`<div class="error-box">${r(e.overviewError)}</div>`:e.overview?e.overview.map(t=>{const a=e.overviewExpanded[t.name]===!0,c=a?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';return`
        <div class="card">
            <div class="card-header overview-toggle" data-dept="${r(t.name)}" style="cursor:pointer">
                <span class="card-title">${r(t.name)}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:11px;color:#aaa">${t.groups.length} Gruppe${t.groups.length!==1?"n":""}</span>
                    <span style="color:#aaa;display:flex;align-items:center">${c}</span>
                </div>
            </div>
            ${a?`
            <table class="data-table">
                <thead>
                    <tr>
                        <th>K\xFCrzel</th>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${t.groups.map(l=>l.notFound?`<tr>
                            <td><span class="badge badge-amber">${r(l.short)}</span></td>
                            <td colspan="3" style="color:#d97706;font-size:11px">Gruppe nicht in easyVerein gefunden</td>
                        </tr>`:`<tr>
                            <td><span class="badge badge-yellow">${r(l.short)}</span></td>
                            <td style="font-weight:600;white-space:normal">${r(l.name)}</td>
                        </tr>`).join("")}
                </tbody>
            </table>`:""}
        </div>`}).join(""):'<div class="placeholder">Keine Daten verf\xFCgbar.</div>'}function j(){return`
        <div class="stat-row">
            <div class="stat-card">
                <div class="stat-label">Einnahmen (Monat)</div>
                <div class="stat-value">\u2014</div>
                <div class="stat-sub">Noch nicht verbunden</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ausgaben (Monat)</div>
                <div class="stat-value">\u2014</div>
                <div class="stat-sub">Noch nicht verbunden</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Saldo</div>
                <div class="stat-value">\u2014</div>
                <div class="stat-sub">Noch nicht verbunden</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Offene Posten</div>
                <div class="stat-value">\u2014</div>
                <div class="stat-sub">Noch nicht verbunden</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><span class="card-title">Finanzen</span></div>
            <div class="placeholder" style="padding:40px">Dieses Modul ist noch nicht implementiert.</div>
        </div>
    `}const z=["Januar","Februar","M\xE4rz","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],P={id:-1,name:"Geburtstage",color:"#F5C400"};function U(){if(e.calLoading)return'<div class="placeholder"><span class="spinner"></span></div>';if(e.calError)return`<div class="error-box">${r(e.calError)}</div>`;const{calYear:t,calMonth:a}=e,c=[...e.calCalendars,P],l=new Set(c.filter(o=>e.calEnabled[o.id]!==!1).map(o=>o.id)),n=e.calEvents.filter(o=>l.has(o.calendarId)),s=c.map(o=>{const i=e.calEnabled[o.id]!==!1;return`<label class="cal-filter-item">
            <input type="checkbox" class="cal-filter-cb" data-calid="${o.id}" ${i?"checked":""}>
            <span class="cal-filter-dot" style="background:${r(o.color)}"></span>
            ${r(o.name)}
        </label>`}).join(""),h=e.calView==="month",u=`
        <div class="cal-view-toggle">
            <button class="cal-view-btn ${h?"active":""}" id="cal-view-month" title="Monatsansicht">
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
            <button class="cal-view-btn ${h?"":"active"}" id="cal-view-list" title="Listenansicht">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="6" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="10" width="12" height="2" rx=".5" fill="currentColor"/>
                </svg>
            </button>
        </div>`,d=`
        <div class="cal-header">
            <button class="btn-ghost cal-nav" id="cal-prev">&#8249;</button>
            <span class="cal-month-title">${z[a-1]} ${t}</span>
            <button class="btn-ghost cal-nav" id="cal-next">&#8250;</button>
            <button class="btn-ghost" id="cal-today" style="margin-left:8px;font-size:12px">Heute</button>
            ${u}
            <button class="btn-ghost" id="cal-reload" style="margin-left:auto;font-size:12px">Neu laden</button>
        </div>`,p=h?q(n,t,a):Y(n);return`
        <div class="cal-layout">
            <div class="cal-sidebar">
                <div class="cal-sidebar-title">Kalender</div>
                <div class="cal-filters">${s||'<span style="color:#aaa;font-size:12px">Keine Kalender</span>'}</div>
            </div>
            <div class="cal-main">
                ${d}
                ${p}
            </div>
        </div>
    `}function q(t,a,c){const l={};for(const p of t){const o=p.start.slice(0,10);l[o]||(l[o]=[]),l[o].push(p)}const s=(new Date(a,c-1,1).getDay()+6)%7,h=new Date(a,c,0).getDate(),u=new Date().toISOString().slice(0,10);let d="";for(let p=0;p<s;p++)d+='<div class="cal-cell cal-cell--empty"></div>';for(let p=1;p<=h;p++){const o=`${a}-${String(c).padStart(2,"0")}-${String(p).padStart(2,"0")}`,i=o===u,v=l[o]||[],f=v.slice(0,3).map(w=>`<div class="cal-pill" style="background:${r(w.color)}" title="${r(w.name)}">${r(w.name)}</div>`).join(""),$=v.length>3?`<div class="cal-pill cal-pill--more">+${v.length-3}</div>`:"";d+=`
            <div class="cal-cell ${i?"cal-cell--today":""}">
                <span class="cal-day-num">${p}</span>
                <div class="cal-pills">${f}${$}</div>
            </div>`}return`
        <div class="cal-grid">
            <div class="cal-weekday">Mo</div>
            <div class="cal-weekday">Di</div>
            <div class="cal-weekday">Mi</div>
            <div class="cal-weekday">Do</div>
            <div class="cal-weekday">Fr</div>
            <div class="cal-weekday">Sa</div>
            <div class="cal-weekday">So</div>
            ${d}
        </div>`}function Y(t){if(t.length===0)return'<div class="placeholder" style="padding:40px">Keine Termine in diesem Monat.</div>';const a=[...t].sort((u,d)=>u.start.localeCompare(d.start)),c=[];let l=null,n=[];for(const u of a){const d=u.start.slice(0,10);d!==l&&(l&&c.push({date:l,events:n}),l=d,n=[]),n.push(u)}l&&c.push({date:l,events:n});const s=new Date().toISOString().slice(0,10);return`<div class="cal-list">${c.map(u=>{const d=new Date(u.date+"T00:00:00"),p=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()],o=d.getDate(),i=u.date===s,v=u.events.map(f=>{const $=f.allDay?"Ganzt\xE4gig":f.start.length>10?f.start.slice(11,16)+" Uhr":"",w=!f.allDay&&f.end&&f.end.length>10?" \u2013 "+f.end.slice(11,16)+" Uhr":"",M=f.type==="birthday"?'<span class="cal-list-badge cal-list-badge--birthday">\u{1F382}</span>':"";return`
                <div class="cal-list-event">
                    <span class="cal-list-dot" style="background:${r(f.color)}"></span>
                    <div class="cal-list-event-body">
                        <span class="cal-list-name">${M}${r(f.name)}</span>
                        <span class="cal-list-meta">${r(f.calendarName)}${$?" \xB7 "+$+w:""}</span>
                    </div>
                </div>`}).join("");return`
            <div class="cal-list-row ${i?"cal-list-row--today":""}">
                <div class="cal-list-date">
                    <span class="cal-list-weekday">${p}</span>
                    <span class="cal-list-daynum ${i?"cal-list-daynum--today":""}">${o}</span>
                </div>
                <div class="cal-list-events">${v}</div>
            </div>`}).join("")}</div>`}function H(){const t=e.settings,a=e.configLoading;return!t&&a?'<div class="placeholder"><span class="spinner"></span></div>':t?`
        <div class="settings-grid">
            ${t.configError?`<div class="error-box">${r(t.configError)}</div>`:""}

            <div class="card">
                <div class="card-header"><span class="card-title">Schl\xFCssel & Konfiguration</span></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
                    <div class="settings-field">
                        <label>Public Key (age)</label>
                        <div class="settings-value">
                            <span>${r(t.publicKey||"\u2014")}</span>
                            ${t.publicKey?`<button class="copy-btn" data-copy="${r(t.publicKey)}">Kopieren</button>`:""}
                        </div>
                    </div>
                    <div class="settings-field">
                        <label>Externe Konfiguration URL</label>
                        <div class="settings-value"><span>${r(t.configURL)}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Base URL</label>
                        <div class="settings-value"><span>${r(t.baseURL||"\u2014")}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Token</label>
                        <div class="settings-value"><span>${r(t.tokenMasked||"\u2014")}</span></div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <button class="btn-primary" id="reload-config-btn" ${a?"disabled":""}>
                            ${a?'<span class="spinner"></span> Wird geladen\u2026':"Konfiguration neu laden"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `:'<div class="placeholder">Einstellungen werden geladen\u2026</div>'}function C(){document.querySelectorAll("[data-tab]").forEach(i=>{i.addEventListener("click",()=>{e.activeTab=i.dataset.tab,e.activeTab==="settings"&&!e.settings&&_(),e.activeTab==="overview"&&!e.overview&&!e.overviewLoading&&J(),e.activeTab==="calendar"&&!e.calLoading&&Z(),b()})});const t=document.getElementById("dept-select");t&&t.addEventListener("change",()=>{e.selectedDept=t.value,e.members=[],e.error="",b(),x(!1),e.calCalendars.length>0&&y()});const a=document.getElementById("search-input");a&&(a.addEventListener("input",i=>{e.search=i.target.value,g()}),a.focus(),a.setSelectionRange(a.value.length,a.value.length));const c=document.getElementById("reload-btn");c&&c.addEventListener("click",()=>x(!0));const l=document.getElementById("col-toggle-btn");l&&l.addEventListener("click",i=>{i.stopPropagation(),e.colMenuOpen=!e.colMenuOpen,g()}),document.querySelectorAll("[data-col]").forEach(i=>{i.addEventListener("change",v=>{e.columns[parseInt(v.target.dataset.col)].visible=v.target.checked,g()})}),document.querySelectorAll("th[data-sort]").forEach(i=>{i.addEventListener("click",()=>{const v=i.dataset.sort;e.sortDir=e.sortCol===v&&e.sortDir==="asc"?"desc":"asc",e.sortCol=v,g()})}),document.querySelectorAll("[data-copy]").forEach(i=>{i.addEventListener("click",()=>{navigator.clipboard.writeText(i.dataset.copy).catch(()=>{});const v=i.textContent;i.textContent="Kopiert!",setTimeout(()=>{i.textContent=v},1500)})}),document.querySelectorAll(".overview-toggle").forEach(i=>{i.addEventListener("click",()=>{const v=i.dataset.dept;e.overviewExpanded[v]=e.overviewExpanded[v]===!1,g()})});const n=document.getElementById("reload-config-btn");n&&n.addEventListener("click",W);const s=document.getElementById("cal-prev");s&&s.addEventListener("click",()=>{e.calMonth--,e.calMonth<1&&(e.calMonth=12,e.calYear--),y()});const h=document.getElementById("cal-next");h&&h.addEventListener("click",()=>{e.calMonth++,e.calMonth>12&&(e.calMonth=1,e.calYear++),y()});const u=document.getElementById("cal-today");u&&u.addEventListener("click",()=>{const i=new Date;e.calYear=i.getFullYear(),e.calMonth=i.getMonth()+1,y()});const d=document.getElementById("cal-reload");d&&d.addEventListener("click",()=>y());const p=document.getElementById("cal-view-month");p&&p.addEventListener("click",()=>{e.calView="month",g()});const o=document.getElementById("cal-view-list");o&&o.addEventListener("click",()=>{e.calView="list",g()}),document.querySelectorAll(".cal-filter-cb").forEach(i=>{i.addEventListener("change",v=>{const f=parseInt(v.target.dataset.calid);e.calEnabled[f]=v.target.checked,g()})}),e.colMenuOpen&&setTimeout(()=>{document.addEventListener("click",i=>{i.target.closest(".col-toggle")||(e.colMenuOpen=!1,g())},{once:!0})},0)}function g(){const t=document.getElementById("content");t&&(t.innerHTML=E()),C()}async function V(){try{const t=await k();e.departments=t||[],e.departments.length>0&&!e.selectedDept&&(e.selectedDept=e.departments[0]),b(),e.selectedDept&&x(!1)}catch(t){e.error=String(t),b()}}async function x(t){if(!!e.selectedDept){e.loading=!0,e.error="",b();try{const a=await(t?I:T)(e.selectedDept);e.members=a||[]}catch(a){e.error=String(a),e.members=[]}finally{e.loading=!1,b()}}}async function J(){e.overviewLoading=!0,e.overviewError="",e.activeTab==="overview"&&g();try{e.overview=await D()}catch(t){e.overviewError=String(t)}finally{e.overviewLoading=!1,e.activeTab==="overview"&&g()}}async function _(){try{e.settings=await B(),e.activeTab==="settings"&&g()}catch(t){e.settings={configError:String(t),publicKey:"",baseURL:"",tokenMasked:"",configURL:""},e.activeTab==="settings"&&g()}}async function W(){e.configLoading=!0,e.settings=null,e.overview=null,g();try{e.settings=await A();const t=await k();e.departments=t||[],e.departments.length>0&&!e.departments.includes(e.selectedDept)&&(e.selectedDept=e.departments[0],e.members=[])}catch(t){e.settings={configError:String(t),publicKey:"",baseURL:"",tokenMasked:"",configURL:""}}finally{e.configLoading=!1,b()}}async function Z(){if(e.calCalendars.length===0)try{const t=await S();e.calCalendars=t||[];for(const a of e.calCalendars)a.id in e.calEnabled||(e.calEnabled[a.id]=!0);-1 in e.calEnabled||(e.calEnabled[-1]=!0)}catch(t){e.calError=String(t),e.calLoading=!1,e.activeTab==="calendar"&&g();return}await y()}async function y(){e.calLoading=!0,e.calError="",e.activeTab==="calendar"&&g();try{const t=await L(e.selectedDept||"",e.calYear,e.calMonth);e.calEvents=t||[]}catch(t){e.calError=String(t),e.calEvents=[]}finally{e.calLoading=!1,e.activeTab==="calendar"&&g()}}b();V();
