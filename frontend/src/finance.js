import { state } from './state.js';
import { esc, escHtml, formatDate } from './utils.js';
import { GetBankAccounts, GetBookings, GetOpenInvoices, ReloadOpenInvoices, GetFinanceOverview, GetInvoiceItems, CreateCashPayment } from '../wailsjs/go/main/App';

const FINANCE_TABS = ['overview', 'accounts', 'invoices'];
const FINANCE_TAB_LABELS = { overview: 'Übersicht', accounts: 'Bankkonten', invoices: 'Offene Rechnungen' };

let _render, _refreshContent;

export function init(render, refreshContent) {
    _render = render;
    _refreshContent = refreshContent;
    registerWindowFunctions();
}

function registerWindowFunctions() {
    window.setFinanceTab = function(tab) {
        state.financeTab = tab;
        if (tab === 'overview' && !state.financeOverview && !state.financeOverviewLoading) {
            loadFinanceOverview();
        } else if (tab === 'accounts' && state.financeAccounts.length === 0 && !state.financeAccountsLoading) {
            loadFinanceAccounts();
        } else if (tab === 'invoices' && state.financeInvoices.length === 0 && !state.financeInvoicesLoading) {
            loadInvoices(false);
        } else {
            _render();
        }
    };

    window.setFinanceAccount = function(id) {
        state.financeSelectedAccountID = id;
        state.financeBookings = [];
        _render();
        loadFinanceBookings();
    };

    window.setFinanceDateFrom = function(v) { state.financeBookingDateFrom = v; _render(); };
    window.setFinanceDateTo = function(v) { state.financeBookingDateTo = v; _render(); };

    window.loadFinanceBookings = loadFinanceBookings;

    window.loadInvoices = function() { loadInvoices(true); };

    window.toggleInvoiceItems = function(invoiceID) {
        if (state.expandedInvoiceID === invoiceID) {
            state.expandedInvoiceID = null;
            _render();
            return;
        }
        state.expandedInvoiceID = invoiceID;
        if (!state.invoiceItems[invoiceID]) {
            state.invoiceItemsLoading[invoiceID] = true;
            _render();
            GetInvoiceItems(invoiceID)
                .then(items => {
                    state.invoiceItems[invoiceID] = items || [];
                    state.invoiceItemsLoading[invoiceID] = false;
                    _render();
                })
                .catch(() => {
                    state.invoiceItems[invoiceID] = [];
                    state.invoiceItemsLoading[invoiceID] = false;
                    _render();
                });
        } else {
            _render();
        }
    };

    window.openCashPaymentModal = function(invoiceID) {
        const inv = (state.financeInvoices || []).find(i => i.id === invoiceID);
        if (!inv) return;
        state.cashPaymentModal = {
            inv,
            bankAccountID: state.financeAccounts.length > 0 ? state.financeAccounts[0].id : 0,
            amount: null,
            date: new Date().toISOString().slice(0, 10),
            confirmed: false,
        };
        state.cashPaymentError = '';
        if (state.financeAccounts.length === 0 && !state.financeAccountsLoading) {
            loadFinanceAccounts();
        } else {
            _render();
        }
    };

    window.closeCashPaymentModal = function() {
        state.cashPaymentModal = null;
        state.cashPaymentError = '';
        _render();
    };

    window.cashPaymentBack = function() {
        state.cashPaymentModal.confirmed = false;
        state.cashPaymentError = '';
        _render();
    };
}

export function renderFinance() {
    const tabs = FINANCE_TABS.map(t => `
        <button class="sub-tab${state.financeTab === t ? ' active' : ''}"
            onclick="setFinanceTab('${t}')">${FINANCE_TAB_LABELS[t]}</button>
    `).join('');

    let content = '';
    if (state.financeTab === 'overview') content = renderFinanceOverview();
    else if (state.financeTab === 'accounts') content = renderFinanceAccounts();
    else if (state.financeTab === 'invoices') content = renderFinanceInvoices();

    return `
        <div class="sub-tab-bar">${tabs}</div>
        ${content}
    `;
}

function renderFinanceOverview() {
    const ov = state.financeOverview;
    const loading = state.financeOverviewLoading;
    const fmt = (v) => v != null ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '—';
    const now = new Date();
    const monthLabel = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

    const card = (label, value, sub, cls) => `
        <div class="stat-card">
            <div class="stat-label">${label}</div>
            <div class="stat-value${cls ? ' ' + cls : ''}">${loading ? '<span class="spinner"></span>' : value}</div>
            <div class="stat-sub">${sub}</div>
        </div>`;

    const income   = ov ? fmt(ov.incomeMonth)  : '—';
    const expense  = ov ? fmt(Math.abs(ov.expenseMonth)) : '—';
    const balance  = ov ? fmt(ov.balanceMonth) : '—';
    const open     = ov ? fmt(ov.openInvoices) : '—';
    const invCount = ov ? `${ov.invoiceCount} offene Rechnung${ov.invoiceCount !== 1 ? 'en' : ''}` : 'Noch nicht geladen';
    const balClass = ov ? (ov.balanceMonth >= 0 ? 'amount-pos' : 'amount-neg') : '';

    return `
        <div class="stat-row">
            ${card('Einnahmen ' + monthLabel, income,  'Summe positive Buchungen', 'amount-pos')}
            ${card('Ausgaben '  + monthLabel, expense, 'Summe negative Buchungen', 'amount-neg')}
            ${card('Saldo '     + monthLabel, balance, 'Einnahmen – Ausgaben', balClass)}
            ${card('Offene Posten', open, invCount, 'amount-neg')}
        </div>
        ${state.financeOverviewError ? `<div class="error-msg">${state.financeOverviewError}</div>` : ''}
    `;
}

function renderFinanceAccounts() {
    if (state.financeAccountsLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.financeAccountsError) {
        return `<div class="error-msg">${state.financeAccountsError}</div>`;
    }
    if (!state.financeAccounts || state.financeAccounts.length === 0) {
        return `<div class="card"><div class="card-header"><span class="card-title">Bankkonten</span></div>
            <div class="placeholder" style="padding:40px">Keine Bankkonten für diese Abteilung konfiguriert.</div></div>`;
    }

    const accs = state.financeAccounts;
    const selID = state.financeSelectedAccountID || accs[0].id;
    const selAcc = accs.find(a => a.id === selID) || accs[0];
    const options = accs.map(a =>
        `<option value="${a.id}"${a.id === selID ? ' selected' : ''}>${a.name}</option>`
    ).join('');
    const balanceFormatted = selAcc.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    let bookingsSection = '';
    if (state.financeBookingsLoading) {
        bookingsSection = '<div class="placeholder"><span class="spinner"></span></div>';
    } else if (state.financeBookingsError) {
        bookingsSection = `<div class="error-msg">${state.financeBookingsError}</div>`;
    } else {
        const search = (state.financeBookingSearch || '').toLowerCase();
        const filtered = (state.financeBookings || []).filter(b => {
            if (!search) return true;
            return (b.receiver || '').toLowerCase().includes(search) ||
                   (b.description || '').toLowerCase().includes(search);
        });

        const rows = filtered.map(b => {
            const amtClass = b.amount >= 0 ? 'amount-pos' : 'amount-neg';
            const amtStr = b.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
            return `<tr>
                <td>${formatDate(b.date)}</td>
                <td class="col-receiver">${escHtml(b.receiver || '')}</td>
                <td class="col-desc">${escHtml(b.description || '')}</td>
                <td class="${amtClass}" style="text-align:right;font-variant-numeric:tabular-nums">${amtStr}</td>
            </tr>`;
        }).join('');

        const empty = filtered.length === 0
            ? '<tr><td colspan="4" style="text-align:center;padding:24px;color:#888">Keine Buchungen gefunden.</td></tr>'
            : '';

        bookingsSection = `
            <div class="table-scroll">
            <table class="data-table">
                <thead><tr>
                    <th>Datum</th><th class="col-receiver">Empfänger</th><th class="col-desc">Beschreibung</th><th style="text-align:right">Betrag</th>
                </tr></thead>
                <tbody>${rows}${empty}</tbody>
            </table>
            </div>`;
    }

    return `
        <div class="card">
            <div class="card-header">
                <span class="card-title">Bankkonten</span>
                <select class="dept-select" onchange="setFinanceAccount(parseInt(this.value))" style="margin-left:auto">
                    ${options}
                </select>
            </div>
            <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:0.86rem">Kontostand</span><br><strong style="font-size:1.14rem">${balanceFormatted}</strong></div>
                ${selAcc.iban ? `<div style="margin-left:16px"><span style="color:#888;font-size:0.86rem">IBAN</span><br><span style="font-family:monospace;font-size:0.93rem">${selAcc.iban}</span></div>` : ''}
            </div>
            <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <label style="font-size:0.86rem;color:#666">Von</label>
                <input type="date" class="search-input" style="width:140px" value="${state.financeBookingDateFrom}"
                    onchange="setFinanceDateFrom(this.value)">
                <label style="font-size:0.86rem;color:#666">Bis</label>
                <input type="date" class="search-input" style="width:140px" value="${state.financeBookingDateTo}"
                    onchange="setFinanceDateTo(this.value)">
                <button class="btn-primary" onclick="loadFinanceBookings()">Laden</button>
                <div style="margin-left:auto;position:relative">
                    <input id="finance-search-input" type="text" class="search-input"
                        placeholder="Suche Empfänger / Beschreibung…"
                        style="width:220px" value="${escHtml(state.financeBookingSearch || '')}">
                </div>
            </div>
            ${bookingsSection}
        </div>
    `;
}

function renderFinanceInvoices() {
    if (state.financeInvoicesLoading) {
        return '<div class="placeholder"><span class="spinner"></span></div>';
    }
    if (state.financeInvoicesError) {
        return `<div class="error-msg">${state.financeInvoicesError}</div>`;
    }

    const search = (state.financeInvoiceSearch || '').toLowerCase();
    const filtered = (state.financeInvoices || []).filter(inv => {
        if (!search) return true;
        return (inv.receiver || '').toLowerCase().includes(search) ||
               (inv.invNumber || '').toLowerCase().includes(search) ||
               (inv.description || '').toLowerCase().includes(search);
    });

    const totalOpen = filtered.reduce((s, inv) => s + inv.paymentDifference, 0);
    const totalOpenFmt = totalOpen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    const rows = filtered.flatMap(inv => {
        const diffFmt = inv.paymentDifference.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        const totalFmt = inv.totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
        const isExpanded = state.expandedInvoiceID === inv.id;
        const isLoading = state.invoiceItemsLoading[inv.id];
        const expandIcon = isExpanded ? '▾' : '▸';

        const cashIcon = `<button class="btn-cash-pay" title="Barzahlung erfassen" onclick="event.stopPropagation();openCashPaymentModal(${inv.id})">💵</button>`;
        const mainRow = `<tr class="invoice-row${isExpanded ? ' invoice-row-expanded' : ''}" onclick="toggleInvoiceItems(${inv.id})" style="cursor:pointer">
            <td><span style="margin-right:6px;color:#888">${expandIcon}</span>${escHtml(inv.invNumber || '')}</td>
            <td>${formatDate(inv.date)}</td>
            <td class="col-receiver">${escHtml(inv.receiver || '')}</td>
            <td class="col-desc">${escHtml(inv.description || '')}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${totalFmt}</td>
            <td class="amount-neg" style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${diffFmt}${cashIcon}</td>
        </tr>`;

        if (!isExpanded) return [mainRow];

        let innerHtml;
        if (isLoading) {
            innerHtml = `<div class="invoice-detail-loading"><span class="spinner"></span> Lade Positionen…</div>`;
        } else {
            const items = state.invoiceItems[inv.id] || [];
            const fmt = v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

            const itemRows = items.map(it => {
                const lineTotal = it.quantity * it.unitPrice;
                const taxLabel = it.taxRate > 0 ? `<span class="invoice-item-tax">${it.taxRate}% ${escHtml(it.taxName || 'MwSt.')}</span>` : '';
                return `<div class="invoice-item-row">
                    <div class="invoice-item-title">
                        ${escHtml(it.title || '')}
                        ${it.description ? `<div class="invoice-item-desc">${escHtml(it.description)}</div>` : ''}
                    </div>
                    <div class="invoice-item-qty">${it.quantity}&thinsp;×&thinsp;${fmt(it.unitPrice)}${taxLabel}</div>
                    <div class="invoice-item-total">${fmt(lineTotal)}</div>
                </div>`;
            }).join('');

            const chargeRow = inv.charge > 0 ? `<div class="invoice-item-row invoice-item-charge">
                <div class="invoice-item-title">Mahngebühr</div>
                <div class="invoice-item-qty"></div>
                <div class="invoice-item-total">${fmt(inv.charge)}</div>
            </div>` : '';

            const chargebackRow = inv.chargeback > 0 ? `<div class="invoice-item-row invoice-item-charge">
                <div class="invoice-item-title">Bankgebühr (Rücklastschrift)</div>
                <div class="invoice-item-qty"></div>
                <div class="invoice-item-total">${fmt(inv.chargeback)}</div>
            </div>` : '';

            const hasContent = items.length > 0 || inv.charge > 0 || inv.chargeback > 0;
            innerHtml = hasContent
                ? `<div class="invoice-items-panel">${itemRows}${chargeRow}${chargebackRow}</div>`
                : `<div class="invoice-detail-loading" style="color:#888">Keine Positionen gefunden.</div>`;
        }

        const detailRow = `<tr class="invoice-detail-row"><td colspan="6" class="invoice-detail-cell">${innerHtml}</td></tr>`;
        return [mainRow, detailRow];
    }).join('');

    const empty = filtered.length === 0
        ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:#888">${state.financeInvoices.length === 0 ? 'Keine offenen Rechnungen.' : 'Keine Treffer.'}</td></tr>`
        : '';

    return `
        <div class="card">
            <div class="card-header">
                <span class="card-title">Offene Rechnungen</span>
                <button class="btn-primary" style="margin-left:auto" onclick="loadInvoices()">Neu laden</button>
            </div>
            <div style="display:flex;gap:16px;padding:12px 16px;border-bottom:1px solid #f0f0f0;align-items:center;flex-wrap:wrap">
                <div><span style="color:#888;font-size:0.86rem">Offener Gesamtbetrag</span><br>
                    <strong class="amount-neg" style="font-size:1.14rem">${totalOpenFmt}</strong>
                    <span style="color:#888;font-size:0.86rem;margin-left:6px">(${filtered.length} Rechnung${filtered.length !== 1 ? 'en' : ''})</span>
                </div>
                <div style="margin-left:auto">
                    <input id="invoice-search-input" type="text" class="search-input"
                        placeholder="Suche Name / Nr. / Beschreibung…"
                        style="width:240px" value="${escHtml(state.financeInvoiceSearch || '')}">
                </div>
            </div>
            <div class="table-scroll">
            <table class="data-table">
                <thead><tr>
                    <th>Nr.</th><th>Datum</th><th class="col-receiver">Empfänger</th><th class="col-desc">Beschreibung</th>
                    <th style="text-align:right">Gesamt</th><th style="text-align:right">Offen</th>
                </tr></thead>
                <tbody>${rows}${empty}</tbody>
            </table>
            </div>
        </div>
    `;
}

export function renderCashPaymentModal() {
    const m = state.cashPaymentModal;
    const bankAccounts = state.financeAccounts || [];
    const today = new Date().toISOString().slice(0, 10);
    const selectedBankID = m.bankAccountID || (bankAccounts.length > 0 ? bankAccounts[0].id : 0);
    const selectedBank = bankAccounts.find(a => a.id === selectedBankID);
    const amount = m.amount != null ? m.amount : m.inv.paymentDifference;
    const date = m.date || today;
    const fmt = v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const receiver = (m.inv.receiver || '').split('\n')[0].trim();
    const description = `Barzahlung ${m.inv.invNumber || ''}${m.inv.refNumber ? ' / Ref: ' + m.inv.refNumber : ''}`;

    if (m.confirmed) {
        return `
        <div class="modal-backdrop" onclick="closeCashPaymentModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <span class="modal-title">Buchung bestätigen</span>
                    <button class="modal-close" onclick="closeCashPaymentModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="modal-confirm-intro">Bitte die Buchungsparameter prüfen und anschließend buchen.</div>
                    <div class="modal-confirm-table">
                        <div class="modal-confirm-row"><span class="modal-label">Bankkonto</span><strong>${escHtml(selectedBank ? selectedBank.name : String(selectedBankID))}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Betrag</span><strong class="amount-pos">${fmt(amount)}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Datum</span><strong>${formatDate(date)}</strong></div>
                        <div class="modal-confirm-row"><span class="modal-label">Empfänger</span><span>${escHtml(receiver)}</span></div>
                        <div class="modal-confirm-row"><span class="modal-label">Beschreibung</span><span>${escHtml(description)}</span></div>
                    </div>
                    ${state.cashPaymentError ? `<div class="modal-error">${escHtml(state.cashPaymentError)}</div>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="cashPaymentBack()">Zurück</button>
                    <button class="btn-primary" id="cash-pay-submit" ${state.cashPaymentLoading ? 'disabled' : ''}>
                        ${state.cashPaymentLoading ? '<span class="spinner"></span> Wird gebucht…' : 'Buchen'}
                    </button>
                </div>
            </div>
        </div>`;
    }

    const bankOptions = bankAccounts.map(a =>
        `<option value="${a.id}" ${a.id === selectedBankID ? 'selected' : ''}>${escHtml(a.name)}${a.iban ? ' · ' + escHtml(a.iban) : ''}</option>`
    ).join('');

    return `
    <div class="modal-backdrop" onclick="closeCashPaymentModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <span class="modal-title">Barzahlung erfassen</span>
                <button class="modal-close" onclick="closeCashPaymentModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="modal-invoice-info">
                    <div><span class="modal-label">Rechnung</span> <strong>${escHtml(m.inv.invNumber || '')}</strong></div>
                    <div><span class="modal-label">Empfänger</span> ${escHtml(receiver)}</div>
                    <div><span class="modal-label">Offen</span> <span class="amount-neg">${fmt(m.inv.paymentDifference)}</span></div>
                </div>
                <div class="modal-fields">
                    <label class="modal-field-label">Bankkonto (Handkasse)
                        <select id="cash-account-select" class="modal-input">${bankOptions}</select>
                    </label>
                    <label class="modal-field-label">Betrag (€)
                        <input id="cash-amount-input" type="number" step="0.01" min="0.01"
                            class="modal-input" value="${amount.toFixed(2)}">
                    </label>
                    <label class="modal-field-label">Datum
                        <input id="cash-date-input" type="date" class="modal-input" value="${date}">
                    </label>
                </div>
                ${state.cashPaymentError ? `<div class="modal-error">${escHtml(state.cashPaymentError)}</div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-ghost" onclick="closeCashPaymentModal()">Abbrechen</button>
                <button class="btn-primary" id="cash-pay-review">Weiter →</button>
            </div>
        </div>
    </div>`;
}

export function attachCashPaymentListeners() {
    const reviewBtn = document.getElementById('cash-pay-review');
    if (reviewBtn) {
        document.getElementById('cash-account-select')?.addEventListener('change', e => {
            state.cashPaymentModal.bankAccountID = parseInt(e.target.value, 10);
        });
        document.getElementById('cash-amount-input')?.addEventListener('input', e => {
            state.cashPaymentModal.amount = parseFloat(e.target.value) || 0;
        });
        document.getElementById('cash-date-input')?.addEventListener('input', e => {
            state.cashPaymentModal.date = e.target.value;
        });
        reviewBtn.addEventListener('click', () => {
            const accountID = parseInt(document.getElementById('cash-account-select').value, 10);
            const amount = parseFloat(document.getElementById('cash-amount-input').value);
            const date = document.getElementById('cash-date-input').value;
            if (!accountID) { state.cashPaymentError = 'Bitte ein Bankkonto auswählen.'; _render(); return; }
            if (!amount || amount <= 0) { state.cashPaymentError = 'Bitte einen gültigen Betrag eingeben.'; _render(); return; }
            if (!date) { state.cashPaymentError = 'Bitte ein Datum eingeben.'; _render(); return; }
            state.cashPaymentModal.bankAccountID = accountID;
            state.cashPaymentModal.amount = amount;
            state.cashPaymentModal.date = date;
            state.cashPaymentModal.confirmed = true;
            state.cashPaymentError = '';
            _render();
        });
        return;
    }

    const submitBtn = document.getElementById('cash-pay-submit');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', () => {
        const m = state.cashPaymentModal;
        state.cashPaymentLoading = true;
        state.cashPaymentError = '';
        _render();

        const receiver = (m.inv.receiver || '').split('\n')[0].trim();
        CreateCashPayment(m.bankAccountID, m.inv.id, m.amount, m.date, m.inv.invNumber || '', receiver)
            .then(() => {
                state.cashPaymentLoading = false;
                state.cashPaymentModal = null;
                state.cashPaymentError = '';
                loadInvoices(true);
            })
            .catch(err => {
                state.cashPaymentLoading = false;
                state.cashPaymentError = String(err);
                _render();
            });
    });
}

export function loadFinanceOverview() {
    if (!state.selectedDept) { _render(); return; }
    state.financeOverviewLoading = true;
    state.financeOverviewError = '';
    _render();
    GetFinanceOverview(state.selectedDept)
        .then(ov => {
            state.financeOverview = ov;
            state.financeOverviewLoading = false;
            _render();
        })
        .catch(err => {
            state.financeOverviewError = String(err);
            state.financeOverviewLoading = false;
            _render();
        });
}

function loadFinanceBookings() {
    const accs = state.financeAccounts;
    if (!accs || accs.length === 0) return;
    const id = state.financeSelectedAccountID || accs[0].id;
    state.financeBookingsLoading = true;
    state.financeBookingsError = '';
    _render();
    GetBookings(id, state.financeBookingDateFrom, state.financeBookingDateTo)
        .then(rows => {
            state.financeBookings = rows || [];
            state.financeBookingsLoading = false;
            _render();
        })
        .catch(err => {
            state.financeBookingsError = String(err);
            state.financeBookingsLoading = false;
            _render();
        });
}

function loadInvoices(forceReload) {
    if (!state.selectedDept) { _render(); return; }
    state.financeInvoicesLoading = true;
    state.financeInvoicesError = '';
    _render();
    const fn = forceReload ? ReloadOpenInvoices : GetOpenInvoices;
    fn(state.selectedDept)
        .then(rows => {
            state.financeInvoices = rows || [];
            state.financeInvoicesLoading = false;
            if (forceReload) state.financeOverview = null;
            _render();
            if (forceReload) loadFinanceOverview();
        })
        .catch(err => {
            state.financeInvoicesError = String(err);
            state.financeInvoicesLoading = false;
            _render();
        });
}

export function loadFinanceAccounts() {
    if (!state.selectedDept) { _render(); return; }
    state.financeAccountsLoading = true;
    state.financeAccountsError = '';
    _render();
    GetBankAccounts(state.selectedDept)
        .then(accs => {
            state.financeAccounts = accs || [];
            state.financeAccountsLoading = false;
            if (state.financeAccounts.length > 0) {
                state.financeSelectedAccountID = state.financeAccounts[0].id;
                if (state.cashPaymentModal && !state.cashPaymentModal.bankAccountID) {
                    state.cashPaymentModal.bankAccountID = state.financeAccounts[0].id;
                } else {
                    loadFinanceBookings();
                }
            }
            _render();
        })
        .catch(err => {
            state.financeAccountsError = String(err);
            state.financeAccountsLoading = false;
            _render();
        });
}
