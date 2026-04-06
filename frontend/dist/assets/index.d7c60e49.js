(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function r(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerpolicy&&(n.referrerPolicy=s.referrerpolicy),s.crossorigin==="use-credentials"?n.credentials="include":s.crossorigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=r(s);fetch(s.href,n)}})();function h(){return window.go.main.App.GetDepartments()}function $(t){return window.go.main.App.GetMembers(t)}function k(){return window.go.main.App.GetSettings()}function E(t){return window.go.main.App.ReloadMembers(t)}const e={activeTab:"members",departments:[],selectedDept:"",members:[],loading:!1,error:"",search:"",sortCol:"familyName",sortDir:"asc",colMenuOpen:!1,settings:null,columns:[{key:"membershipNumber",label:"Mitglieds-Nr.",visible:!0},{key:"familyName",label:"Nachname",visible:!0},{key:"firstName",label:"Vorname",visible:!0},{key:"dateOfBirth",label:"Geburtsdatum",visible:!0},{key:"email",label:"E-Mail",visible:!0},{key:"phone",label:"Telefon",visible:!1},{key:"mobile",label:"Mobil",visible:!1},{key:"street",label:"Stra\xDFe",visible:!1},{key:"zip",label:"PLZ",visible:!1},{key:"city",label:"Stadt",visible:!1},{key:"joinDate",label:"Eintrittsdatum",visible:!1},{key:"groups",label:"Gruppen",visible:!0}]};function c(){document.getElementById("app").innerHTML=`
        <div class="topbar">
            <h1>FCS Viewer</h1>
            <select class="dept-select" id="dept-select" ${e.departments.length===0?"disabled":""}>
                ${e.departments.length===0?"<option>\u2014 keine Abteilungen \u2014</option>":e.departments.map(t=>`<option value="${t}" ${t===e.selectedDept?"selected":""}>${t}</option>`).join("")}
            </select>
            <div class="spacer"></div>
            <button class="btn btn-secondary" id="settings-btn">Einstellungen</button>
        </div>

        <div class="tabs">
            <div class="tab ${e.activeTab==="members"?"active":""}" data-tab="members">Mitglieder</div>
            <div class="tab ${e.activeTab==="finance"?"active":""}" data-tab="finance">Finanzen</div>
            <div class="tab ${e.activeTab==="calendar"?"active":""}" data-tab="calendar">Kalender</div>
        </div>

        <div class="content" id="content">
            ${L()}
        </div>
    `,y()}function L(){return e.activeTab==="settings"?w():e.activeTab==="finance"?m("Finanzen","Noch nicht implementiert."):e.activeTab==="calendar"?m("Kalender","Noch nicht implementiert."):f()}function m(t,a){return`<div class="placeholder"><div><strong>${t}</strong></div><div>${a}</div></div>`}function f(){const t=e.columns.filter(i=>i.visible);let a=M();const r=e.colMenuOpen?`
        <div class="col-toggle-menu">
            ${e.columns.map((i,s)=>`
                <label>
                    <input type="checkbox" data-col="${s}" ${i.visible?"checked":""}> ${i.label}
                </label>
            `).join("")}
        </div>`:"";return`
        <div class="members-toolbar">
            <input class="search-input" id="search-input" type="text"
                   placeholder="Suche..." value="${o(e.search)}">
            <div class="col-toggle">
                <button class="btn btn-secondary" id="col-toggle-btn">Spalten</button>
                ${r}
            </div>
            <button class="btn btn-primary" id="reload-btn" ${e.loading?"disabled":""}>
                ${e.loading?'<span class="spinner"></span>':"Neu laden"}
            </button>
            <span class="status-bar">
                ${e.error?`<span class="error-msg">${o(e.error)}</span>`:`${a.length} Mitglieder`}
            </span>
        </div>
        <div class="table-wrapper">
            ${e.loading&&e.members.length===0?'<div class="placeholder"><span class="spinner"></span></div>':a.length===0&&!e.loading?`<div class="placeholder">${e.selectedDept?"Keine Mitglieder gefunden.":"Bitte eine Abteilung w\xE4hlen."}</div>`:`<table>
                        <thead><tr>
                            ${t.map(i=>`
                                <th class="${e.sortCol===i.key?"sort-"+e.sortDir:""}"
                                    data-sort="${i.key}">${i.label}</th>
                            `).join("")}
                        </tr></thead>
                        <tbody>
                            ${a.map(i=>`<tr>
                                ${t.map(s=>{var n,l;return`<td title="${o(String((n=i[s.key])!=null?n:""))}">${o(String((l=i[s.key])!=null?l:""))}</td>`}).join("")}
                            </tr>`).join("")}
                        </tbody>
                    </table>`}
        </div>
    `}function w(){const t=e.settings;return t?`
        <div class="settings-panel">
            <h2>Einstellungen</h2>
            ${t.configError?`<div class="error-box">${o(t.configError)}</div>`:""}
            <div class="settings-row">
                <label>Public Key (age)</label>
                <div class="settings-value">
                    <span>${o(t.publicKey||"\u2014")}</span>
                    ${t.publicKey?`<button class="copy-btn" data-copy="${o(t.publicKey)}">Kopieren</button>`:""}
                </div>
            </div>
            <div class="settings-row">
                <label>Externe Konfiguration URL</label>
                <div class="settings-value"><span>${o(t.configURL)}</span></div>
            </div>
            <div class="settings-row">
                <label>API Base URL</label>
                <div class="settings-value"><span>${o(t.baseURL||"\u2014")}</span></div>
            </div>
            <div class="settings-row">
                <label>API Token</label>
                <div class="settings-value"><span>${o(t.tokenMasked||"\u2014")}</span></div>
            </div>
        </div>
    `:'<div class="placeholder"><span class="spinner"></span></div>'}function o(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function M(){let t=[...e.members];if(e.search){const i=e.search.toLowerCase();t=t.filter(s=>Object.values(s).some(n=>String(n!=null?n:"").toLowerCase().includes(i)))}const a=e.sortCol,r=e.sortDir==="asc"?1:-1;return t.sort((i,s)=>{var u,g;const n=String((u=i[a])!=null?u:"").toLowerCase(),l=String((g=s[a])!=null?g:"").toLowerCase();return n<l?-r:n>l?r:0}),t}function y(){document.querySelectorAll(".tab").forEach(n=>{n.addEventListener("click",()=>{e.activeTab=n.dataset.tab,e.activeTab==="settings"&&!e.settings&&v(),c()})});const t=document.getElementById("dept-select");t&&t.addEventListener("change",()=>{e.selectedDept=t.value,e.members=[],e.error="",c(),b(!1)});const a=document.getElementById("settings-btn");a&&a.addEventListener("click",()=>{e.activeTab="settings",e.settings||v(),c()});const r=document.getElementById("search-input");r&&r.addEventListener("input",n=>{e.search=n.target.value,p()});const i=document.getElementById("reload-btn");i&&i.addEventListener("click",()=>b(!0));const s=document.getElementById("col-toggle-btn");s&&s.addEventListener("click",n=>{n.stopPropagation(),e.colMenuOpen=!e.colMenuOpen,d()}),document.querySelectorAll("[data-col]").forEach(n=>{n.addEventListener("change",l=>{const u=parseInt(l.target.dataset.col);e.columns[u].visible=l.target.checked,p()})}),document.querySelectorAll("thead th[data-sort]").forEach(n=>{n.addEventListener("click",()=>{const l=n.dataset.sort;e.sortCol===l?e.sortDir=e.sortDir==="asc"?"desc":"asc":(e.sortCol=l,e.sortDir="asc"),p()})}),document.querySelectorAll("[data-copy]").forEach(n=>{n.addEventListener("click",()=>{navigator.clipboard.writeText(n.dataset.copy).catch(()=>{}),n.textContent="Kopiert!",setTimeout(()=>{n.textContent="Kopieren"},1500)})}),document.addEventListener("click",n=>{e.colMenuOpen&&!n.target.closest(".col-toggle")&&(e.colMenuOpen=!1,d())},{once:!0})}function d(){const t=document.getElementById("content");t&&e.activeTab==="members"&&(t.innerHTML=f(),y())}function p(){d()}async function S(){try{const t=await h();e.departments=t||[],e.departments.length>0&&!e.selectedDept&&(e.selectedDept=e.departments[0]),c(),e.selectedDept&&b(!1)}catch(t){e.error=String(t),c()}}async function b(t){if(!!e.selectedDept){e.loading=!0,e.error="",d();try{const r=await(t?E:$)(e.selectedDept);e.members=r||[]}catch(a){e.error=String(a),e.members=[]}finally{e.loading=!1,d()}}}async function v(){try{e.settings=await k(),e.activeTab==="settings"&&c()}catch(t){e.settings={configError:String(t),publicKey:"",baseURL:"",tokenMasked:"",configURL:""},e.activeTab==="settings"&&c()}}c();S();
