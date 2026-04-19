package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/as27/easyvapi"
	"github.com/as27/easyvapi/model"
)

// BankAccountInfo is a slim bank account descriptor for the frontend.
type BankAccountInfo struct {
	ID      int     `json:"id"`
	Name    string  `json:"name"`
	IBAN    string  `json:"iban"`
	Balance float64 `json:"balance"`
}

// BookingRow is a flat booking record for the frontend.
type BookingRow struct {
	ID          int     `json:"id"`
	Date        string  `json:"date"`
	Amount      float64 `json:"amount"`
	Receiver    string  `json:"receiver"`
	Description string  `json:"description"`
}

// InvoiceRow is a flat open-invoice record for the frontend.
type InvoiceRow struct {
	ID                int     `json:"id"`
	InvNumber         string  `json:"invNumber"`
	Date              string  `json:"date"`
	Receiver          string  `json:"receiver"`
	TotalPrice        float64 `json:"totalPrice"`
	PaymentDifference float64 `json:"paymentDifference"`
	Description       string  `json:"description"`
	Charge            float64 `json:"charge"`
	Chargeback        float64 `json:"chargeback"`
	RefNumber         string  `json:"refNumber"`
}

// InvoiceItemRow is a flat invoice line-item record for the frontend.
type InvoiceItemRow struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	TaxRate     float64 `json:"taxRate"`
	TaxName     string  `json:"taxName"`
	Gross       bool    `json:"gross"`
}

// FinanceOverview holds aggregated finance statistics for the overview card.
type FinanceOverview struct {
	IncomeMonth  float64 `json:"incomeMonth"`
	ExpenseMonth float64 `json:"expenseMonth"`
	BalanceMonth float64 `json:"balanceMonth"`
	OpenInvoices float64 `json:"openInvoices"`
	InvoiceCount int     `json:"invoiceCount"`
}

// GetBankAccounts returns the bank accounts assigned to the given department in the config.
func (a *App) GetBankAccounts(department string) ([]BankAccountInfo, error) {
	a.mu.RLock()
	conf := a.extConf
	client := a.apiClient
	a.mu.RUnlock()

	if conf == nil {
		return nil, fmt.Errorf("externe Konfiguration nicht geladen")
	}
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert (kein Token)")
	}

	var dept *Department
	for i := range conf.Departments {
		if conf.Departments[i].Name == department {
			dept = &conf.Departments[i]
			break
		}
	}
	if dept == nil {
		return nil, fmt.Errorf("Abteilung '%s' nicht gefunden", department)
	}

	idSet := make(map[int]bool, len(dept.BankAccountIDs))
	for _, id := range dept.BankAccountIDs {
		idSet[id] = true
	}

	allAccounts, err := client.BankAccounts.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Bankkonten konnten nicht geladen werden: %w", err)
	}

	var result []BankAccountInfo
	for _, acc := range allAccounts {
		if idSet[acc.ID] {
			result = append(result, BankAccountInfo{
				ID:      acc.ID,
				Name:    acc.Name,
				IBAN:    acc.IBAN,
				Balance: float64(acc.Balance),
			})
		}
	}
	return result, nil
}

// GetBookings returns bookings for the given bank account, filtered by date range.
// dateFrom and dateTo are inclusive dates in YYYY-MM-DD format (empty = no filter).
func (a *App) GetBookings(bankAccountID int, dateFrom, dateTo string) ([]BookingRow, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()

	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}

	q := easyvapi.NewQuery().Fields("id", "amount", "date", "receiver", "description", "billingId")
	opts := &easyvapi.BookingListOptions{
		ListOptions: easyvapi.ListOptions{Query: q},
		BankAccount: bankAccountID,
	}
	if dateFrom != "" {
		opts.DateGt = dateFrom
	}
	if dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			opts.DateLt = t.AddDate(0, 0, 1).Format("2006-01-02")
		} else {
			opts.DateLt = dateTo
		}
	}

	bookings, err := client.Bookings.ListAll(a.ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("Kontobewegungen konnten nicht geladen werden: %w", err)
	}

	rows := make([]BookingRow, len(bookings))
	for i, b := range bookings {
		rows[i] = BookingRow{
			ID:          b.ID,
			Date:        b.Date,
			Amount:      float64(b.Amount),
			Receiver:    b.Receiver,
			Description: b.Description,
		}
	}
	return rows, nil
}

// GetOpenInvoices returns cached open invoices for the department, loading if needed.
func (a *App) GetOpenInvoices(department string) ([]InvoiceRow, error) {
	a.mu.RLock()
	cached, ok := a.invoiceCache[department]
	a.mu.RUnlock()
	if ok {
		return cached, nil
	}
	return a.loadOpenInvoices(department)
}

// ReloadOpenInvoices clears the cache for the department and fetches fresh data.
func (a *App) ReloadOpenInvoices(department string) ([]InvoiceRow, error) {
	a.mu.Lock()
	delete(a.invoiceCache, department)
	a.mu.Unlock()
	return a.loadOpenInvoices(department)
}

func (a *App) loadOpenInvoices(department string) ([]InvoiceRow, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}

	isFalse := false
	invoices, err := client.Invoices.ListAll(a.ctx, &easyvapi.InvoiceListOptions{
		IsTemplate: &isFalse,
	})
	if err != nil {
		return nil, fmt.Errorf("Rechnungen konnten nicht geladen werden: %w", err)
	}

	members, err := a.GetMembers(department)
	if err != nil {
		return nil, fmt.Errorf("Mitglieder konnten nicht geladen werden: %w", err)
	}

	type namePair struct{ first, family string }
	pairs := make([]namePair, 0, len(members))
	for _, m := range members {
		f := strings.ToLower(strings.TrimSpace(m.FirstName))
		l := strings.ToLower(strings.TrimSpace(m.FamilyName))
		if f != "" || l != "" {
			pairs = append(pairs, namePair{f, l})
		}
	}

	memberMatch := func(receiver string) bool {
		r := strings.ToLower(strings.TrimSpace(receiver))
		for _, p := range pairs {
			if p.family != "" && strings.Contains(r, p.family) &&
				(p.first == "" || strings.Contains(r, p.first)) {
				return true
			}
		}
		return false
	}

	var rows []InvoiceRow
	for _, inv := range invoices {
		if float64(inv.PaymentDifference) == 0 {
			continue
		}
		if !memberMatch(derefStr(inv.Receiver)) {
			continue
		}
		rows = append(rows, InvoiceRow{
			ID:                inv.ID,
			InvNumber:         inv.InvNumber,
			Date:              dateOnly(derefStr(inv.Date)),
			Receiver:          derefStr(inv.Receiver),
			TotalPrice:        float64(inv.TotalPrice),
			PaymentDifference: float64(inv.PaymentDifference),
			Description:       derefStr(inv.Description),
			Charge:            float64(inv.Charges.Charge),
			Chargeback:        float64(inv.Charges.ChargeBack),
			RefNumber:         inv.RefNumber,
		})
	}

	a.mu.Lock()
	a.invoiceCache[department] = rows
	a.mu.Unlock()

	return rows, nil
}

// GetInvoiceItems returns all line items for the given invoice ID.
func (a *App) GetInvoiceItems(invoiceID int) ([]InvoiceItemRow, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}

	items, err := client.InvoiceItems.ListAll(a.ctx, &easyvapi.InvoiceItemListOptions{
		RelatedInvoice: invoiceID,
	})
	if err != nil {
		return nil, fmt.Errorf("Rechnungspositionen konnten nicht geladen werden: %w", err)
	}

	rows := make([]InvoiceItemRow, 0, len(items))
	for _, it := range items {
		rows = append(rows, InvoiceItemRow{
			ID:          it.ID,
			Title:       it.Title,
			Description: it.Description,
			Quantity:    float64(it.Quantity),
			UnitPrice:   float64(it.UnitPrice),
			TaxRate:     float64(it.TaxRate),
			TaxName:     it.TaxName,
			Gross:       it.Gross,
		})
	}
	return rows, nil
}

// CreateCashPayment books a cash payment for an open invoice.
func (a *App) CreateCashPayment(bankAccountID, invoiceID int, amount float64, date, invNumber, receiver string) error {
	a.mu.RLock()
	client := a.apiClient
	conf := a.extConf
	a.mu.RUnlock()
	if client == nil {
		return fmt.Errorf("API-Client nicht initialisiert")
	}

	refNumber := ""
	if inv, err := client.Invoices.Get(a.ctx, invoiceID, nil); err == nil && inv != nil {
		refNumber = inv.RefNumber
	}

	desc := fmt.Sprintf("Barzahlung %s", invNumber)
	if refNumber != "" {
		desc = fmt.Sprintf("%s / Ref: %s", desc, refNumber)
	}

	var relatedInvoice []string
	if invoiceID != 0 && conf != nil {
		baseURL := strings.TrimRight(conf.Vars.BaseURL, "/")
		relatedInvoice = []string{fmt.Sprintf("%s/invoice/%d", baseURL, invoiceID)}
	}

	_, err := client.Bookings.Create(a.ctx, model.BookingCreate{
		Amount:         amount,
		BankAccount:    bankAccountID,
		Date:           date,
		Description:    desc,
		Receiver:       receiver,
		RelatedInvoice: relatedInvoice,
	})
	if err != nil {
		return fmt.Errorf("Buchung konnte nicht erstellt werden: %w", err)
	}
	return nil
}

// GetFinanceOverview returns aggregated statistics for the finance overview card.
func (a *App) GetFinanceOverview(department string) (FinanceOverview, error) {
	a.mu.RLock()
	conf := a.extConf
	client := a.apiClient
	a.mu.RUnlock()

	var ov FinanceOverview

	invoices, err := a.GetOpenInvoices(department)
	if err == nil {
		for _, inv := range invoices {
			ov.OpenInvoices += inv.PaymentDifference
		}
		ov.InvoiceCount = len(invoices)
	}

	if conf != nil && client != nil {
		var dept *Department
		for i := range conf.Departments {
			if conf.Departments[i].Name == department {
				dept = &conf.Departments[i]
				break
			}
		}
		if dept != nil && len(dept.BankAccountIDs) > 0 {
			now := time.Now()
			dateFrom := fmt.Sprintf("%04d-%02d-01", now.Year(), now.Month())
			firstOfNext := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
			dateTo := firstOfNext.Format("2006-01-02")

			q := easyvapi.NewQuery().Fields("id", "amount", "date", "receiver", "description", "billingId")
			for _, accID := range dept.BankAccountIDs {
				bookings, err := client.Bookings.ListAll(a.ctx, &easyvapi.BookingListOptions{
					ListOptions: easyvapi.ListOptions{Query: q},
					BankAccount: accID,
					DateGt:      dateFrom,
					DateLt:      dateTo,
				})
				if err != nil {
					continue
				}
				for _, b := range bookings {
					amt := float64(b.Amount)
					if amt >= 0 {
						ov.IncomeMonth += amt
					} else {
						ov.ExpenseMonth += amt
					}
				}
			}
			ov.BalanceMonth = ov.IncomeMonth + ov.ExpenseMonth
		}
	}

	return ov, nil
}
