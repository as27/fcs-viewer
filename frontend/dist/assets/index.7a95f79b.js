(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))o(c);new MutationObserver(c=>{for(const i of c)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function a(c){const i={};return c.integrity&&(i.integrity=c.integrity),c.referrerpolicy&&(i.referrerPolicy=c.referrerpolicy),c.crossorigin==="use-credentials"?i.credentials="include":c.crossorigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(c){if(c.ep)return;c.ep=!0;const i=a(c);fetch(c.href,i)}})();function Z(t,n,a,o,c,i){return window.go.main.App.CreateCashPayment(t,n,a,o,c,i)}function W(t){return window.go.main.App.ExportMembersExcel(t)}function J(){return window.go.main.App.ExportPublicKey()}function X(t){return window.go.main.App.GetBankAccounts(t)}function Q(t,n,a){return window.go.main.App.GetBookings(t,n,a)}function ee(t,n,a){return window.go.main.App.GetCalendarEvents(t,n,a)}function te(){return window.go.main.App.GetCalendars()}function ne(){return window.go.main.App.GetDepartmentOverview()}function R(){return window.go.main.App.GetDepartments()}function ae(t){return window.go.main.App.GetFinanceOverview(t)}function ie(t){return window.go.main.App.GetInvoiceItems(t)}function se(t){return window.go.main.App.GetMembers(t)}function ce(t){return window.go.main.App.GetOpenInvoices(t)}function oe(){return window.go.main.App.GetSettings()}function le(){return window.go.main.App.ReloadConfig()}function re(t){return window.go.main.App.ReloadMembers(t)}function de(t){return window.go.main.App.ReloadOpenInvoices(t)}const N="fcs-font-size",K=12,G=22,C=14;function T(){return parseInt(localStorage.getItem(N)||C,10)}function D(t){document.documentElement.style.setProperty("--font-size-base",t+"px"),localStorage.setItem(N,t)}D(T());const L={overview:`<svg class="nav-icon" viewBox="0 0 16 16" fill="none">
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
    </svg>`},e={activeTab:"members",activeModules:null,departments:[],selectedDept:"",members:[],loading:!1,configLoading:!1,error:"",overview:null,overviewLoading:!1,overviewError:"",overviewExpanded:{},search:"",sortCol:"familyName",sortDir:"asc",colMenuOpen:!1,settings:null,calYear:new Date().getFullYear(),calMonth:new Date().getMonth()+1,calEvents:[],calCalendars:[],calEnabled:{},calLoading:!1,calError:"",calView:"month",financeTab:"overview",financeOverview:null,financeOverviewLoading:!1,financeOverviewError:"",financeAccounts:[],financeAccountsLoading:!1,financeAccountsError:"",financeSelectedAccountID:0,financeBookings:[],financeBookingsLoading:!1,financeBookingsError:"",financeBookingSearch:"",financeBookingDateFrom:(()=>{const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-01`})(),financeBookingDateTo:new Date().toISOString().slice(0,10),financeInvoices:[],financeInvoicesLoading:!1,financeInvoicesError:"",financeInvoiceSearch:"",expandedInvoiceID:null,invoiceItems:{},invoiceItemsLoading:{},cashPaymentModal:null,cashPaymentLoading:!1,cashPaymentError:"",columns:[{key:"membershipNumber",label:"Nr.",visible:!0},{key:"familyName",label:"Nachname",visible:!0},{key:"firstName",label:"Vorname",visible:!0},{key:"age",label:"Alter",visible:!0},{key:"dateOfBirth",label:"Geburtsdatum",visible:!0},{key:"email",label:"E-Mail",visible:!0},{key:"phone",label:"Telefon",visible:!1},{key:"mobile",label:"Mobil",visible:!1},{key:"street",label:"Stra\xDFe",visible:!1},{key:"zip",label:"PLZ",visible:!1},{key:"city",label:"Stadt",visible:!1},{key:"joinDate",label:"Eintritt",visible:!1},{key:"resignationDate",label:"Austritt",visible:!1},{key:"groups",label:"Gruppen",visible:!0},{key:"groupShorts",label:"K\xFCrzel",visible:!0}]},ve={overview:"Abteilungen",members:"Mitglieder",finance:"Finanzen",calendar:"Kalender",settings:"Einstellungen"};function u(t){return String(t!=null?t:"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ue(){let t=[...e.members];if(e.search){const o=e.search.toLowerCase();t=t.filter(c=>Object.values(c).some(i=>String(i!=null?i:"").toLowerCase().includes(o)))}const n=e.sortCol,a=e.sortDir==="asc"?1:-1;return t.sort((o,c)=>{var d,p;const i=String((d=o[n])!=null?d:"").toLowerCase(),s=String((p=c[n])!=null?p:"").toLowerCase();return i<s?-a:i>s?a:0}),t}function r(){document.getElementById("app").innerHTML=`
        <div class="app-shell">
            ${pe()}
            <div class="main">
                ${ge()}
                <div class="content" id="content">
                    ${j()}
                </div>
            </div>
        </div>
        ${e.cashPaymentModal?Se():""}
    `,q(),Ce()}function M(t){return!e.activeModules||e.activeModules.length===0?!0:e.activeModules.includes(t)}function pe(){const t=(n,a,o)=>`
        <div class="nav-item ${e.activeTab===n?"active":""}" data-tab="${n}">
            ${a} ${o}
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
                ${M("overview")?t("overview",L.overview,"Abteilungen"):""}
                ${M("members")?t("members",L.members,"Mitglieder"):""}
                ${M("finance")?t("finance",L.finance,"Finanzen"):""}
                ${M("calendar")?t("calendar",L.calendar,"Kalender"):""}
            </div>

            <div class="nav-section">
                <div class="nav-label">System</div>
                ${t("settings",L.settings,"Einstellungen")}
            </div>

            <div class="sidebar-footer">
                <div class="dept-selector">
                    <label>Abteilung</label>
                    <select class="dept-select" id="dept-select" ${e.departments.length===0?"disabled":""}>
                        ${e.departments.length===0?"<option>\u2014 keine \u2014</option>":e.departments.map(n=>`<option value="${u(n)}" ${n===e.selectedDept?"selected":""}>${u(n)}</option>`).join("")}
                    </select>
                </div>
                <div class="sync-bar">
                    <div class="sync-dot ${e.loading?"active":""}"></div>
                    ${e.loading?"Wird geladen\u2026":e.members.length>0?`${e.members.length} Mitglieder`:"Bereit"}
                </div>
            </div>
        </div>
    `}function ge(){const t=ve[e.activeTab]||"",n=e.activeTab==="members";return`
        <div class="topbar">
            <span class="topbar-title">${u(t)}</span>
            <div class="topbar-spacer"></div>
            ${n?`
                <div class="search-wrap">
                    ${L.search}
                    <input id="search-input" placeholder="Suchen\u2026" value="${u(e.search)}">
                </div>`:""}
        </div>
    `}function j(){return e.activeTab==="members"?fe():e.activeTab==="calendar"?`<div class="cal-wrapper">${Ie()}</div>`:`<div class="content-scroll">${e.activeTab==="overview"?me():e.activeTab==="settings"?Me():ye()}</div>`}function fe(){const t=e.columns.filter(c=>c.visible),n=ue(),a=e.colMenuOpen?`
        <div class="col-toggle-menu">
            ${e.columns.map((c,i)=>`
                <label>
                    <input type="checkbox" data-col="${i}" ${c.visible?"checked":""}>
                    ${u(c.label)}
                </label>`).join("")}
        </div>`:"",o=n.length===0?`<div class="placeholder">${e.selectedDept?"Keine Mitglieder gefunden.":"Bitte eine Abteilung w\xE4hlen."}</div>`:`<table class="data-table">
            <thead><tr>
                ${t.map(c=>`
                    <th class="${e.sortCol===c.key?"sort-"+e.sortDir:""}"
                        data-sort="${c.key}">${u(c.label)}</th>
                `).join("")}
            </tr></thead>
            <tbody>
                ${n.map(c=>`<tr>
                    ${t.map(i=>`<td title="${u(c[i.key])}"${i.key==="groups"?' style="white-space:normal;min-width:120px;max-width:220px"':""}>${u(c[i.key])}</td>`).join("")}
                </tr>`).join("")}
            </tbody>
        </table>`;return`
        <div class="members-layout">
            <div class="members-toolbar">
                <div class="col-toggle">
                    <button class="btn-ghost" id="col-toggle-btn">Spalten</button>
                    ${a}
                </div>
                <button class="btn-primary" id="reload-btn" ${e.loading?"disabled":""}>
                    ${e.loading?'<span class="spinner"></span> Laden\u2026':"Neu laden"}
                </button>
                <button class="btn-ghost" id="excel-export-btn" ${e.loading||!e.selectedDept?"disabled":""} title="Als Excel exportieren">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:-2px">
                        <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M4 5l3 3-3 3M9 11h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>Excel
                </button>
                ${e.error?`<span class="err-msg">${u(e.error)}</span>`:`<span class="status-count">${n.length} Eintr\xE4ge</span>`}
            </div>
            <div class="card">
                ${e.loading&&e.members.length===0?'<div class="placeholder"><span class="spinner"></span></div>':`<div class="table-scroll">${o}</div>`}
            </div>
        </div>
    `}function me(){return e.overviewLoading?'<div class="placeholder"><span class="spinner"></span></div>':e.overviewError?`<div class="error-box">${u(e.overviewError)}</div>`:e.overview?e.overview.map(t=>{const n=e.overviewExpanded[t.name]===!0,a=n?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';return`
        <div class="card">
            <div class="card-header overview-toggle" data-dept="${u(t.name)}" style="cursor:pointer">
                <span class="card-title">${u(t.name)}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:0.79rem;color:#aaa">${t.groups.length} Gruppe${t.groups.length!==1?"n":""}</span>
                    <span style="color:#aaa;display:flex;align-items:center">${a}</span>
                </div>
            </div>
            ${n?`
            <table class="data-table">
                <thead>
                    <tr>
                        <th>K\xFCrzel</th>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${t.groups.map(o=>o.notFound?`<tr>
                            <td><span class="badge badge-amber">${u(o.short)}</span></td>
                            <td colspan="3" style="color:#d97706;font-size:0.79rem">Gruppe nicht in easyVerein gefunden</td>
                        </tr>`:`<tr>
                            <td><span class="badge badge-yellow">${u(o.short)}</span></td>
                            <td style="font-weight:600;white-space:normal">${u(o.name)}</td>
                        </tr>`).join("")}
                </tbody>
            </table>`:""}
        </div>`}).join(""):'<div class="placeholder">Keine Daten verf\xFCgbar.</div>'}const he=["overview","accounts","invoices"],be={overview:"\xDCbersicht",accounts:"Bankkonten",invoices:"Offene Rechnungen"};function ye(){const t=he.map(a=>`
        <button class="sub-tab${e.financeTab===a?" active":""}"
            onclick="setFinanceTab('${a}')">${be[a]}</button>
    `).join("");let n="";return e.financeTab==="overview"?n=we():e.financeTab==="accounts"?n=$e():e.financeTab==="invoices"&&(n=xe()),`
        <div class="sub-tab-bar">${t}</div>
        ${n}
    `}function we(){const t=e.financeOverview,n=e.financeOverviewLoading,a=w=>w!=null?w.toLocaleString("de-DE",{style:"currency",currency:"EUR"}):"\u2014",c=new Date().toLocaleString("de-DE",{month:"long",year:"numeric"}),i=(w,m,$,x)=>`
        <div class="stat-card">
            <div class="stat-label">${w}</div>
            <div class="stat-value${x?" "+x:""}">${n?'<span class="spinner"></span>':m}</div>
            <div class="stat-sub">${$}</div>
        </div>`,s=t?a(t.incomeMonth):"\u2014",d=t?a(Math.abs(t.expenseMonth)):"\u2014",p=t?a(t.balanceMonth):"\u2014",g=t?a(t.openInvoices):"\u2014",v=t?`${t.invoiceCount} offene Rechnung${t.invoiceCount!==1?"en":""}`:"Noch nicht geladen",f=t?t.balanceMonth>=0?"amount-pos":"amount-neg":"";return`
        <div class="stat-row">
            ${i("Einnahmen "+c,s,"Summe positive Buchungen","amount-pos")}
            ${i("Ausgaben "+c,d,"Summe negative Buchungen","amount-neg")}
            ${i("Saldo "+c,p,"Einnahmen \u2013 Ausgaben",f)}
            ${i("Offene Posten",g,v,"amount-neg")}
        </div>
        ${e.financeOverviewError?`<div class="error-msg">${e.financeOverviewError}</div>`:""}
    `}function $e(){if(e.financeAccountsLoading)return'<div class="placeholder"><span class="spinner"></span></div>';if(e.financeAccountsError)return`<div class="error-msg">${e.financeAccountsError}</div>`;if(!e.financeAccounts||e.financeAccounts.length===0)return`<div class="card"><div class="card-header"><span class="card-title">Bankkonten</span></div>
            <div class="placeholder" style="padding:40px">Keine Bankkonten f\xFCr diese Abteilung konfiguriert.</div></div>`;const t=e.financeAccounts,n=e.financeSelectedAccountID||t[0].id,a=t.find(s=>s.id===n)||t[0],o=t.map(s=>`<option value="${s.id}"${s.id===n?" selected":""}>${s.name}</option>`).join(""),c=a.balance.toLocaleString("de-DE",{style:"currency",currency:"EUR"});let i="";if(e.financeBookingsLoading)i='<div class="placeholder"><span class="spinner"></span></div>';else if(e.financeBookingsError)i=`<div class="error-msg">${e.financeBookingsError}</div>`;else{const s=(e.financeBookingSearch||"").toLowerCase(),d=(e.financeBookings||[]).filter(v=>s?(v.receiver||"").toLowerCase().includes(s)||(v.description||"").toLowerCase().includes(s):!0),p=d.map(v=>{const f=v.amount>=0?"amount-pos":"amount-neg",w=v.amount.toLocaleString("de-DE",{style:"currency",currency:"EUR"});return`<tr>
                <td>${F(v.date)}</td>
                <td class="col-receiver">${b(v.receiver||"")}</td>
                <td class="col-desc">${b(v.description||"")}</td>
                <td class="${f}" style="text-align:right;font-variant-numeric:tabular-nums">${w}</td>
            </tr>`}).join(""),g=d.length===0?'<tr><td colspan="4" style="text-align:center;padding:24px;color:#888">Keine Buchungen gefunden.</td></tr>':"";i=`
            <div class="table-scroll">
            <table class="data-table">
                <thead><tr>
                    <th>Datum</th><th class="col-receiver">Empf\xE4nger</th><th class="col-desc">Beschreibung</th><th style="text-align:right">Betrag</th>
                </tr></thead>
                <tbody>${p}${g}</tbody>
            </table>
            </div>`}return`
        <div class="card">
            <div class="card-header">
                <span class="card-title">Bankkonten</span>
                <select class="dept-select" onchange="setFinanceAccount(parseInt(this.value))" style="margin-left:auto">
                    ${o}
                </select>
            </div>
            <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:0.86rem">Kontostand</span><br><strong style="font-size:1.14rem">${c}</strong></div>
                ${a.iban?`<div style="margin-left:16px"><span style="color:#888;font-size:0.86rem">IBAN</span><br><span style="font-family:monospace;font-size:0.93rem">${a.iban}</span></div>`:""}
            </div>
            <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <label style="font-size:0.86rem;color:#666">Von</label>
                <input type="date" class="search-input" style="width:140px" value="${e.financeBookingDateFrom}"
                    onchange="setFinanceDateFrom(this.value)">
                <label style="font-size:0.86rem;color:#666">Bis</label>
                <input type="date" class="search-input" style="width:140px" value="${e.financeBookingDateTo}"
                    onchange="setFinanceDateTo(this.value)">
                <button class="btn-primary" onclick="loadFinanceBookings()">Laden</button>
                <div style="margin-left:auto;position:relative">
                    <input id="finance-search-input" type="text" class="search-input"
                        placeholder="Suche Empf\xE4nger / Beschreibung\u2026"
                        style="width:220px" value="${b(e.financeBookingSearch||"")}">
                </div>
            </div>
            ${i}
        </div>
    `}function b(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function xe(){if(e.financeInvoicesLoading)return'<div class="placeholder"><span class="spinner"></span></div>';if(e.financeInvoicesError)return`<div class="error-msg">${e.financeInvoicesError}</div>`;const t=(e.financeInvoiceSearch||"").toLowerCase(),n=(e.financeInvoices||[]).filter(s=>t?(s.receiver||"").toLowerCase().includes(t)||(s.invNumber||"").toLowerCase().includes(t)||(s.description||"").toLowerCase().includes(t):!0),o=n.reduce((s,d)=>s+d.paymentDifference,0).toLocaleString("de-DE",{style:"currency",currency:"EUR"}),c=n.flatMap(s=>{const d=s.paymentDifference.toLocaleString("de-DE",{style:"currency",currency:"EUR"}),p=s.totalPrice.toLocaleString("de-DE",{style:"currency",currency:"EUR"}),g=e.expandedInvoiceID===s.id,v=e.invoiceItemsLoading[s.id],f=g?"\u25BE":"\u25B8",w=`<button class="btn-cash-pay" title="Barzahlung erfassen" onclick="event.stopPropagation();openCashPaymentModal(${s.id})">\u{1F4B5}</button>`,m=`<tr class="invoice-row${g?" invoice-row-expanded":""}" onclick="toggleInvoiceItems(${s.id})" style="cursor:pointer">
            <td><span style="margin-right:6px;color:#888">${f}</span>${b(s.invNumber||"")}</td>
            <td>${F(s.date)}</td>
            <td class="col-receiver">${b(s.receiver||"")}</td>
            <td class="col-desc">${b(s.description||"")}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${p}</td>
            <td class="amount-neg" style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${d}${w}</td>
        </tr>`;if(!g)return[m];let $;if(v)$='<div class="invoice-detail-loading"><span class="spinner"></span> Lade Positionen\u2026</div>';else{const I=e.invoiceItems[s.id]||[],l=k=>k.toLocaleString("de-DE",{style:"currency",currency:"EUR"}),h=I.map(k=>{const V=k.quantity*k.unitPrice,Y=k.taxRate>0?`<span class="invoice-item-tax">${k.taxRate}% ${b(k.taxName||"MwSt.")}</span>`:"";return`<div class="invoice-item-row">
                    <div class="invoice-item-title">
                        ${b(k.title||"")}
                        ${k.description?`<div class="invoice-item-desc">${b(k.description)}</div>`:""}
                    </div>
                    <div class="invoice-item-qty">${k.quantity}&thinsp;\xD7&thinsp;${l(k.unitPrice)}${Y}</div>
                    <div class="invoice-item-total">${l(V)}</div>
                </div>`}).join(""),E=s.charge>0?`<div class="invoice-item-row invoice-item-charge">
                <div class="invoice-item-title">Mahngeb\xFChr</div>
                <div class="invoice-item-qty"></div>
                <div class="invoice-item-total">${l(s.charge)}</div>
            </div>`:"",S=s.chargeback>0?`<div class="invoice-item-row invoice-item-charge">
                <div class="invoice-item-title">Bankgeb\xFChr (R\xFCcklastschrift)</div>
                <div class="invoice-item-qty"></div>
                <div class="invoice-item-total">${l(s.chargeback)}</div>
            </div>`:"";$=I.length>0||s.charge>0||s.chargeback>0?`<div class="invoice-items-panel">${h}${E}${S}</div>`:'<div class="invoice-detail-loading" style="color:#888">Keine Positionen gefunden.</div>'}const x=`<tr class="invoice-detail-row"><td colspan="6" class="invoice-detail-cell">${$}</td></tr>`;return[m,x]}).join(""),i=n.length===0?`<tr><td colspan="6" style="text-align:center;padding:24px;color:#888">${e.financeInvoices.length===0?"Keine offenen Rechnungen.":"Keine Treffer."}</td></tr>`:"";return`
        <div class="card">
            <div class="card-header">
                <span class="card-title">Offene Rechnungen</span>
                <button class="btn-primary" style="margin-left:auto" onclick="loadInvoices()">Neu laden</button>
            </div>
            <div style="display:flex;gap:16px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:0.86rem">Offener Gesamtbetrag</span><br>
                    <strong class="amount-neg" style="font-size:1.14rem">${o}</strong>
                    <span style="color:#888;font-size:0.86rem;margin-left:6px">(${n.length} Rechnung${n.length!==1?"en":""})</span>
                </div>
                <div style="margin-left:auto">
                    <input id="invoice-search-input" type="text" class="search-input"
                        placeholder="Suche Name / Nr. / Beschreibung\u2026"
                        style="width:240px" value="${b(e.financeInvoiceSearch||"")}">
                </div>
            </div>
            <div class="table-scroll">
            <table class="data-table">
                <thead><tr>
                    <th>Nr.</th><th>Datum</th><th class="col-receiver">Empf\xE4nger</th><th class="col-desc">Beschreibung</th>
                    <th style="text-align:right">Gesamt</th><th style="text-align:right">Offen</th>
                </tr></thead>
                <tbody>${c}${i}</tbody>
            </table>
            </div>
        </div>
    `}window.setFinanceTab=function(t){e.financeTab=t,t==="overview"&&!e.financeOverview&&!e.financeOverviewLoading?O():t==="accounts"&&e.financeAccounts.length===0&&!e.financeAccountsLoading?U():t==="invoices"&&e.financeInvoices.length===0&&!e.financeInvoicesLoading?z():r()};function O(){if(!e.selectedDept){r();return}e.financeOverviewLoading=!0,e.financeOverviewError="",r(),ae(e.selectedDept).then(t=>{e.financeOverview=t,e.financeOverviewLoading=!1,r()}).catch(t=>{e.financeOverviewError=String(t),e.financeOverviewLoading=!1,r()})}window.setFinanceAccount=function(t){e.financeSelectedAccountID=t,e.financeBookings=[],r(),loadFinanceBookings()};window.setFinanceDateFrom=function(t){e.financeBookingDateFrom=t,r()};window.setFinanceDateTo=function(t){e.financeBookingDateTo=t,r()};function F(t){if(!t||t.length<10)return t||"";const[n,a,o]=t.slice(0,10).split("-");return`${o}.${a}.${n}`}window.loadFinanceBookings=function(){const t=e.financeAccounts;if(!t||t.length===0)return;const n=e.financeSelectedAccountID||t[0].id;e.financeBookingsLoading=!0,e.financeBookingsError="",r(),Q(n,e.financeBookingDateFrom,e.financeBookingDateTo).then(a=>{e.financeBookings=a||[],e.financeBookingsLoading=!1,r()}).catch(a=>{e.financeBookingsError=String(a),e.financeBookingsLoading=!1,r()})};window.loadInvoices=function(){z(!0)};function z(t){if(!e.selectedDept){r();return}e.financeInvoicesLoading=!0,e.financeInvoicesError="",r(),(t?de:ce)(e.selectedDept).then(a=>{e.financeInvoices=a||[],e.financeInvoicesLoading=!1,t&&(e.financeOverview=null),r(),t&&O()}).catch(a=>{e.financeInvoicesError=String(a),e.financeInvoicesLoading=!1,r()})}window.toggleInvoiceItems=function(t){if(e.expandedInvoiceID===t){e.expandedInvoiceID=null,r();return}e.expandedInvoiceID=t,e.invoiceItems[t]?r():(e.invoiceItemsLoading[t]=!0,r(),ie(t).then(n=>{e.invoiceItems[t]=n||[],e.invoiceItemsLoading[t]=!1,r()}).catch(n=>{e.invoiceItems[t]=[],e.invoiceItemsLoading[t]=!1,r()}))};function U(){if(!e.selectedDept){r();return}e.financeAccountsLoading=!0,e.financeAccountsError="",r(),X(e.selectedDept).then(t=>{e.financeAccounts=t||[],e.financeAccountsLoading=!1,e.financeAccounts.length>0&&(e.financeSelectedAccountID=e.financeAccounts[0].id,e.cashPaymentModal&&!e.cashPaymentModal.bankAccountID?e.cashPaymentModal.bankAccountID=e.financeAccounts[0].id:loadFinanceBookings()),r()}).catch(t=>{e.financeAccountsError=String(t),e.financeAccountsLoading=!1,r()})}const ke=["Januar","Februar","M\xE4rz","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],Ee={id:-1,name:"Geburtstage",color:"#F5C400"};function Ie(){if(e.calLoading)return'<div class="placeholder"><span class="spinner"></span></div>';if(e.calError)return`<div class="error-box">${u(e.calError)}</div>`;const{calYear:t,calMonth:n}=e,a=[...e.calCalendars,Ee],o=new Set(a.filter(v=>e.calEnabled[v.id]!==!1).map(v=>v.id)),c=e.calEvents.filter(v=>o.has(v.calendarId)),i=a.map(v=>{const f=e.calEnabled[v.id]!==!1;return`<label class="cal-filter-item">
            <input type="checkbox" class="cal-filter-cb" data-calid="${v.id}" ${f?"checked":""}>
            <span class="cal-filter-dot" style="background:${u(v.color)}"></span>
            ${u(v.name)}
        </label>`}).join(""),s=e.calView==="month",d=`
        <div class="cal-view-toggle">
            <button class="cal-view-btn ${s?"active":""}" id="cal-view-month" title="Monatsansicht">
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
            <button class="cal-view-btn ${s?"":"active"}" id="cal-view-list" title="Listenansicht">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="6" width="12" height="2" rx=".5" fill="currentColor"/>
                    <rect x="1" y="10" width="12" height="2" rx=".5" fill="currentColor"/>
                </svg>
            </button>
        </div>`,p=`
        <div class="cal-header">
            <button class="btn-ghost cal-nav" id="cal-prev">&#8249;</button>
            <span class="cal-month-title">${ke[n-1]} ${t}</span>
            <button class="btn-ghost cal-nav" id="cal-next">&#8250;</button>
            <button class="btn-ghost" id="cal-today" style="margin-left:8px;font-size:0.86rem">Heute</button>
            ${d}
            <button class="btn-ghost" id="cal-reload" style="margin-left:auto;font-size:0.86rem">Neu laden</button>
        </div>`,g=s?Le(c,t,n):Be(c);return`
        <div class="cal-layout">
            <div class="cal-sidebar">
                <div class="cal-sidebar-title">Kalender</div>
                <div class="cal-filters">${i||'<span style="color:#aaa;font-size:0.86rem">Keine Kalender</span>'}</div>
            </div>
            <div class="cal-main">
                ${p}
                ${g}
            </div>
        </div>
    `}function Le(t,n,a){const o={};for(const g of t){const v=g.start.slice(0,10);o[v]||(o[v]=[]),o[v].push(g)}const i=(new Date(n,a-1,1).getDay()+6)%7,s=new Date(n,a,0).getDate(),d=new Date().toISOString().slice(0,10);let p="";for(let g=0;g<i;g++)p+='<div class="cal-cell cal-cell--empty"></div>';for(let g=1;g<=s;g++){const v=`${n}-${String(a).padStart(2,"0")}-${String(g).padStart(2,"0")}`,f=v===d,w=o[v]||[],m=w.slice(0,3).map(x=>`<div class="cal-pill" style="background:${u(x.color)}" title="${u(x.name)}">${u(x.name)}</div>`).join(""),$=w.length>3?`<div class="cal-pill cal-pill--more">+${w.length-3}</div>`:"";p+=`
            <div class="cal-cell ${f?"cal-cell--today":""}">
                <span class="cal-day-num">${g}</span>
                <div class="cal-pills">${m}${$}</div>
            </div>`}return`
        <div class="cal-grid">
            <div class="cal-weekday">Mo</div>
            <div class="cal-weekday">Di</div>
            <div class="cal-weekday">Mi</div>
            <div class="cal-weekday">Do</div>
            <div class="cal-weekday">Fr</div>
            <div class="cal-weekday">Sa</div>
            <div class="cal-weekday">So</div>
            ${p}
        </div>`}function Be(t){if(t.length===0)return'<div class="placeholder" style="padding:40px">Keine Termine in diesem Monat.</div>';const n=[...t].sort((d,p)=>d.start.localeCompare(p.start)),a=[];let o=null,c=[];for(const d of n){const p=d.start.slice(0,10);p!==o&&(o&&a.push({date:o,events:c}),o=p,c=[]),c.push(d)}o&&a.push({date:o,events:c});const i=new Date().toISOString().slice(0,10);return`<div class="cal-list">${a.map(d=>{const p=new Date(d.date+"T00:00:00"),g=["So","Mo","Di","Mi","Do","Fr","Sa"][p.getDay()],v=p.getDate(),f=d.date===i,w=d.events.map(m=>{const $=m.allDay?"Ganzt\xE4gig":m.start.length>10?m.start.slice(11,16)+" Uhr":"",x=!m.allDay&&m.end&&m.end.length>10?" \u2013 "+m.end.slice(11,16)+" Uhr":"",I=m.type==="birthday"?'<span class="cal-list-badge cal-list-badge--birthday">\u{1F382}</span>':"";return`
                <div class="cal-list-event">
                    <span class="cal-list-dot" style="background:${u(m.color)}"></span>
                    <div class="cal-list-event-body">
                        <span class="cal-list-name">${I}${u(m.name)}</span>
                        <span class="cal-list-meta">${u(m.calendarName)}${$?" \xB7 "+$+x:""}</span>
                    </div>
                </div>`}).join("");return`
            <div class="cal-list-row ${f?"cal-list-row--today":""}">
                <div class="cal-list-date">
                    <span class="cal-list-weekday">${g}</span>
                    <span class="cal-list-daynum ${f?"cal-list-daynum--today":""}">${v}</span>
                </div>
                <div class="cal-list-events">${w}</div>
            </div>`}).join("")}</div>`}function Me(){const t=e.settings,n=e.configLoading;if(!t&&n)return'<div class="placeholder"><span class="spinner"></span></div>';if(!t)return'<div class="placeholder">Einstellungen werden geladen\u2026</div>';const a=T();return`
        <div class="settings-grid">
            ${t.configError?`<div class="error-box">${u(t.configError)}</div>`:""}

            <div class="card">
                <div class="card-header"><span class="card-title">Darstellung</span></div>
                <div style="padding:16px">
                    <div class="settings-field">
                        <label>Schriftgr\xF6\xDFe</label>
                        <div class="settings-value" style="gap:10px;align-items:center">
                            <button class="btn-ghost font-size-btn" data-delta="-1" style="font-size:1.14rem;padding:2px 10px;line-height:1" title="Kleiner">A\u2212</button>
                            <input type="range" id="font-size-slider"
                                min="${K}" max="${G}" value="${a}"
                                style="width:120px;cursor:pointer">
                            <button class="btn-ghost font-size-btn" data-delta="1" style="font-size:1.29rem;padding:2px 10px;line-height:1" title="Gr\xF6\xDFer">A+</button>
                            <span id="font-size-label" style="min-width:32px;text-align:right;font-weight:600">${a}px</span>
                            <button class="btn-ghost" id="font-size-reset" style="font-size:0.79rem;padding:3px 8px">Zur\xFCcksetzen</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Version</span></div>
                <div style="padding:16px">
                    <div class="settings-field">
                        <label>App-Version</label>
                        <div class="settings-value"><span>${u(t.version||"\u2014")}</span></div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Schl\xFCssel & Konfiguration</span></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
                    <div class="settings-field">
                        <label>Public Key (age)</label>
                        <div class="settings-value">
                            <span>${u(t.publicKey||"\u2014")}</span>
                            ${t.publicKey?`<button class="copy-btn" data-copy="${u(t.publicKey)}">Kopieren</button>`:""}
                            ${t.publicKey?'<button class="btn-ghost" id="export-pubkey-btn" style="font-size:0.79rem;padding:3px 8px">Als Datei speichern</button>':""}
                        </div>
                    </div>
                    <div class="settings-field">
                        <label>Externe Konfiguration URL</label>
                        <div class="settings-value"><span>${u(t.configURL)}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Base URL</label>
                        <div class="settings-value"><span>${u(t.baseURL||"\u2014")}</span></div>
                    </div>
                    <div class="settings-field">
                        <label>API Token</label>
                        <div class="settings-value"><span>${u(t.tokenMasked||"\u2014")}</span></div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:4px">
                        <button class="btn-primary" id="reload-config-btn" ${n?"disabled":""}>
                            ${n?'<span class="spinner"></span> Wird geladen\u2026':"Konfiguration neu laden"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `}function Se(){const t=e.cashPaymentModal,n=e.financeAccounts||[],a=new Date().toISOString().slice(0,10),o=t.bankAccountID||(n.length>0?n[0].id:0),c=n.find(f=>f.id===o),i=t.amount!=null?t.amount:t.inv.paymentDifference,s=t.date||a,d=f=>f.toLocaleString("de-DE",{style:"currency",currency:"EUR"}),p=(t.inv.receiver||"").split(`
`)[0].trim(),g=`Barzahlung ${t.inv.invNumber||""}${t.inv.refNumber?" / Ref: "+t.inv.refNumber:""}`;if(t.confirmed)return`
        <div class="modal-backdrop" onclick="closeCashPaymentModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <span class="modal-title">Buchung best\xE4tigen</span>
                    <button class="modal-close" onclick="closeCashPaymentModal()">\u2715</button>
                </div>
                <div class="modal-body">
                    <div class="modal-confirm-intro">Bitte die Buchungsparameter pr\xFCfen und anschlie\xDFend buchen.</div>
                    <div class="modal-confirm-table">
                        <div class="modal-confirm-row"><span class="modal-label">Bankkonto</span><strong>${b(c?c.name:String(o))}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Betrag</span><strong class="amount-pos">${d(i)}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Datum</span><strong>${F(s)}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Empf\xE4nger</span><span>${b(p)}</span></div>
                        <div class="modal-confirm-row"><span class="modal-label">Beschreibung</span><span>${b(g)}</span></div>
                    </div>
                    ${e.cashPaymentError?`<div class="modal-error">${b(e.cashPaymentError)}</div>`:""}
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="cashPaymentBack()">Zur\xFCck</button>
                    <button class="btn-primary" id="cash-pay-submit" ${e.cashPaymentLoading?"disabled":""}>
                        ${e.cashPaymentLoading?'<span class="spinner"></span> Wird gebucht\u2026':"Buchen"}
                    </button>
                </div>
            </div>
        </div>`;const v=n.map(f=>`<option value="${f.id}" ${f.id===o?"selected":""}>${b(f.name)}${f.iban?" \xB7 "+b(f.iban):""}</option>`).join("");return`
    <div class="modal-backdrop" onclick="closeCashPaymentModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <span class="modal-title">Barzahlung erfassen</span>
                <button class="modal-close" onclick="closeCashPaymentModal()">\u2715</button>
            </div>
            <div class="modal-body">
                <div class="modal-invoice-info">
                    <div><span class="modal-label">Rechnung</span> <strong>${b(t.inv.invNumber||"")}</strong></div>
                    <div><span class="modal-label">Empf\xE4nger</span> ${b(p)}</div>
                    <div><span class="modal-label">Offen</span> <span class="amount-neg">${d(t.inv.paymentDifference)}</span></div>
                </div>
                <div class="modal-fields">
                    <label class="modal-field-label">Bankkonto (Handkasse)
                        <select id="cash-account-select" class="modal-input">${v}</select>
                    </label>
                    <label class="modal-field-label">Betrag (\u20AC)
                        <input id="cash-amount-input" type="number" step="0.01" min="0.01"
                            class="modal-input" value="${i.toFixed(2)}">
                    </label>
                    <label class="modal-field-label">Datum
                        <input id="cash-date-input" type="date" class="modal-input" value="${s}">
                    </label>
                </div>
                ${e.cashPaymentError?`<div class="modal-error">${b(e.cashPaymentError)}</div>`:""}
            </div>
            <div class="modal-footer">
                <button class="btn-ghost" onclick="closeCashPaymentModal()">Abbrechen</button>
                <button class="btn-primary" id="cash-pay-review">Weiter \u2192</button>
            </div>
        </div>
    </div>`}window.openCashPaymentModal=function(t){const n=(e.financeInvoices||[]).find(a=>a.id===t);!n||(e.cashPaymentModal={inv:n,bankAccountID:e.financeAccounts.length>0?e.financeAccounts[0].id:0,amount:null,date:new Date().toISOString().slice(0,10),confirmed:!1},e.cashPaymentError="",e.financeAccounts.length===0&&!e.financeAccountsLoading?U():r())};window.closeCashPaymentModal=function(){e.cashPaymentModal=null,e.cashPaymentError="",r()};window.cashPaymentBack=function(){e.cashPaymentModal.confirmed=!1,e.cashPaymentError="",r()};function Ce(){var a,o,c;const t=document.getElementById("cash-pay-review");if(t){(a=document.getElementById("cash-account-select"))==null||a.addEventListener("change",i=>{e.cashPaymentModal.bankAccountID=parseInt(i.target.value,10)}),(o=document.getElementById("cash-amount-input"))==null||o.addEventListener("input",i=>{e.cashPaymentModal.amount=parseFloat(i.target.value)||0}),(c=document.getElementById("cash-date-input"))==null||c.addEventListener("input",i=>{e.cashPaymentModal.date=i.target.value}),t.addEventListener("click",()=>{const i=parseInt(document.getElementById("cash-account-select").value,10),s=parseFloat(document.getElementById("cash-amount-input").value),d=document.getElementById("cash-date-input").value;if(!i){e.cashPaymentError="Bitte ein Bankkonto ausw\xE4hlen.",r();return}if(!s||s<=0){e.cashPaymentError="Bitte einen g\xFCltigen Betrag eingeben.",r();return}if(!d){e.cashPaymentError="Bitte ein Datum eingeben.",r();return}e.cashPaymentModal.bankAccountID=i,e.cashPaymentModal.amount=s,e.cashPaymentModal.date=d,e.cashPaymentModal.confirmed=!0,e.cashPaymentError="",r()});return}const n=document.getElementById("cash-pay-submit");!n||n.addEventListener("click",()=>{const i=e.cashPaymentModal;e.cashPaymentLoading=!0,e.cashPaymentError="",r();const s=(i.inv.receiver||"").split(`
`)[0].trim();Z(i.bankAccountID,i.inv.id,i.amount,i.date,i.inv.invNumber||"",s).then(()=>{e.cashPaymentLoading=!1,e.cashPaymentModal=null,e.cashPaymentError="",z(!0)}).catch(d=>{e.cashPaymentLoading=!1,e.cashPaymentError=String(d),r()})})}function q(){document.querySelectorAll("[data-tab]").forEach(l=>{l.addEventListener("click",()=>{e.activeTab=l.dataset.tab,e.activeTab==="settings"&&!e.settings&&H(),e.activeTab==="overview"&&!e.overview&&!e.overviewLoading&&Te(),e.activeTab==="calendar"&&!e.calLoading&&Fe(),e.activeTab==="finance"&&!e.financeOverview&&!e.financeOverviewLoading&&O(),r()})});const t=document.getElementById("dept-select");t&&t.addEventListener("change",()=>{e.selectedDept=t.value,e.members=[],e.error="",e.financeAccounts=[],e.financeBookings=[],e.financeSelectedAccountID=0,e.financeInvoices=[],e.financeOverview=null,e.expandedInvoiceID=null,e.invoiceItems={},e.invoiceItemsLoading={},r(),P(!1),e.calCalendars.length>0&&B()});const n=document.getElementById("search-input");n&&(n.addEventListener("input",l=>{e.search=l.target.value,y()}),n.focus(),n.setSelectionRange(n.value.length,n.value.length));const a=document.getElementById("finance-search-input");a&&(a.addEventListener("input",l=>{e.financeBookingSearch=l.target.value,y()}),a.focus(),a.setSelectionRange(a.value.length,a.value.length));const o=document.getElementById("invoice-search-input");o&&(o.addEventListener("input",l=>{e.financeInvoiceSearch=l.target.value,y()}),o.focus(),o.setSelectionRange(o.value.length,o.value.length));const c=document.getElementById("reload-btn");c&&c.addEventListener("click",()=>P(!0));const i=document.getElementById("excel-export-btn");i&&i.addEventListener("click",De);const s=document.getElementById("export-pubkey-btn");s&&s.addEventListener("click",Ae);const d=document.getElementById("font-size-slider");d&&d.addEventListener("input",l=>{const h=parseInt(l.target.value,10);D(h);const E=document.getElementById("font-size-label");E&&(E.textContent=h+"px")}),document.querySelectorAll(".font-size-btn").forEach(l=>{l.addEventListener("click",()=>{const h=parseInt(l.dataset.delta,10),E=T(),S=Math.min(G,Math.max(K,E+h));D(S),d&&(d.value=S);const A=document.getElementById("font-size-label");A&&(A.textContent=S+"px")})});const p=document.getElementById("font-size-reset");p&&p.addEventListener("click",()=>{D(C),d&&(d.value=C);const l=document.getElementById("font-size-label");l&&(l.textContent=C+"px")});const g=document.getElementById("col-toggle-btn");g&&g.addEventListener("click",l=>{l.stopPropagation(),e.colMenuOpen=!e.colMenuOpen,y()}),document.querySelectorAll("[data-col]").forEach(l=>{l.addEventListener("change",h=>{e.columns[parseInt(h.target.dataset.col)].visible=h.target.checked,y()})}),document.querySelectorAll("th[data-sort]").forEach(l=>{l.addEventListener("click",()=>{const h=l.dataset.sort;e.sortDir=e.sortCol===h&&e.sortDir==="asc"?"desc":"asc",e.sortCol=h,y()})}),document.querySelectorAll("[data-copy]").forEach(l=>{l.addEventListener("click",()=>{navigator.clipboard.writeText(l.dataset.copy).catch(()=>{});const h=l.textContent;l.textContent="Kopiert!",setTimeout(()=>{l.textContent=h},1500)})}),document.querySelectorAll(".overview-toggle").forEach(l=>{l.addEventListener("click",()=>{const h=l.dataset.dept;e.overviewExpanded[h]=e.overviewExpanded[h]===!1,y()})});const v=document.getElementById("reload-config-btn");v&&v.addEventListener("click",Oe);const f=document.getElementById("cal-prev");f&&f.addEventListener("click",()=>{e.calMonth--,e.calMonth<1&&(e.calMonth=12,e.calYear--),B()});const w=document.getElementById("cal-next");w&&w.addEventListener("click",()=>{e.calMonth++,e.calMonth>12&&(e.calMonth=1,e.calYear++),B()});const m=document.getElementById("cal-today");m&&m.addEventListener("click",()=>{const l=new Date;e.calYear=l.getFullYear(),e.calMonth=l.getMonth()+1,B()});const $=document.getElementById("cal-reload");$&&$.addEventListener("click",()=>B());const x=document.getElementById("cal-view-month");x&&x.addEventListener("click",()=>{e.calView="month",y()});const I=document.getElementById("cal-view-list");I&&I.addEventListener("click",()=>{e.calView="list",y()}),document.querySelectorAll(".cal-filter-cb").forEach(l=>{l.addEventListener("change",h=>{const E=parseInt(h.target.dataset.calid);e.calEnabled[E]=h.target.checked,y()})}),e.colMenuOpen&&setTimeout(()=>{document.addEventListener("click",l=>{l.target.closest(".col-toggle")||(e.colMenuOpen=!1,y())},{once:!0})},0)}function y(){const t=document.getElementById("content");t&&(t.innerHTML=j()),q()}async function De(){if(!!e.selectedDept)try{if(await W(e.selectedDept)){const n=document.getElementById("excel-export-btn");if(n){const a=n.innerHTML;n.textContent="Gespeichert!",setTimeout(()=>{n.innerHTML=a},2e3)}}}catch(t){alert("Excel-Export fehlgeschlagen: "+String(t))}}async function Ae(){try{if(await J()){const n=document.getElementById("export-pubkey-btn");if(n){const a=n.textContent;n.textContent="Gespeichert!",setTimeout(()=>{n.textContent=a},2e3)}}}catch(t){alert("Fehler beim Speichern des Public Keys: "+String(t))}}async function Pe(){try{const t=await R();e.departments=t||[],e.departments.length>0&&!e.selectedDept&&(e.selectedDept=e.departments[0]),r(),e.selectedDept&&P(!1)}catch(t){e.error=String(t),r()}}async function P(t){if(!!e.selectedDept){e.loading=!0,e.error="",r();try{const n=await(t?re:se)(e.selectedDept);e.members=n||[]}catch(n){e.error=String(n),e.members=[]}finally{e.loading=!1,r()}}}async function Te(){e.overviewLoading=!0,e.overviewError="",e.activeTab==="overview"&&y();try{e.overview=await ne()}catch(t){e.overviewError=String(t)}finally{e.overviewLoading=!1,e.activeTab==="overview"&&y()}}function _(t){t&&t.activeModules&&t.activeModules.length>0?e.activeModules=t.activeModules:e.activeModules=null;const n=["overview","members","finance","calendar"];n.includes(e.activeTab)&&!M(e.activeTab)&&(e.activeTab=n.find(a=>M(a))||"settings")}async function H(){try{e.settings=await oe(),_(e.settings),r()}catch(t){e.settings={configError:String(t),publicKey:"",baseURL:"",tokenMasked:"",configURL:""},e.activeTab==="settings"&&y()}}async function Oe(){e.configLoading=!0,e.settings=null,e.overview=null,y();try{e.settings=await le(),_(e.settings);const t=await R();e.departments=t||[],e.departments.length>0&&!e.departments.includes(e.selectedDept)&&(e.selectedDept=e.departments[0],e.members=[])}catch(t){e.settings={configError:String(t),publicKey:"",baseURL:"",tokenMasked:"",configURL:""}}finally{e.configLoading=!1,r()}}async function Fe(){if(e.calCalendars.length===0)try{const t=await te();e.calCalendars=t||[];for(const n of e.calCalendars)n.id in e.calEnabled||(e.calEnabled[n.id]=!0);-1 in e.calEnabled||(e.calEnabled[-1]=!0)}catch(t){e.calError=String(t),e.calLoading=!1,e.activeTab==="calendar"&&y();return}await B()}async function B(){e.calLoading=!0,e.calError="",e.activeTab==="calendar"&&y();try{const t=await ee(e.selectedDept||"",e.calYear,e.calMonth);e.calEvents=t||[]}catch(t){e.calError=String(t),e.calEvents=[]}finally{e.calLoading=!1,e.activeTab==="calendar"&&y()}}r();Pe();H();
