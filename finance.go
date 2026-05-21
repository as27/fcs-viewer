package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/as27/easyvapi"
	"github.com/as27/easyvapi/model"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
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
	client, err := a.getAPIClient()
	if err != nil {
		return nil, err
	}
	a.mu.RLock()
	conf := a.extConf
	a.mu.RUnlock()
	if conf == nil {
		return nil, fmt.Errorf("externe Konfiguration nicht geladen")
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
	client, err := a.getAPIClient()
	if err != nil {
		return nil, err
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
func (a *App) GetOpenInvoices(department string) (CachedData[[]InvoiceRow], error) {
	a.mu.RLock()
	cached, ok := a.invoiceCache[department]
	a.mu.RUnlock()
	if ok && cached.IsValid() {
		return cached, nil
	}

	var diskCache CachedData[[]InvoiceRow]
	err := loadFromDiskCache(fmt.Sprintf("invoices_%s.json", department), &diskCache)
	if err == nil && diskCache.IsValid() {
		a.mu.Lock()
		a.invoiceCache[department] = diskCache
		a.mu.Unlock()
		return diskCache, nil
	}

	return a.loadOpenInvoices(department)
}

// ReloadOpenInvoices clears the cache for the department and fetches fresh data.
func (a *App) ReloadOpenInvoices(department string) (CachedData[[]InvoiceRow], error) {
	a.mu.Lock()
	delete(a.invoiceCache, department)
	a.mu.Unlock()
	return a.loadOpenInvoices(department)
}

func (a *App) loadOpenInvoices(department string) (CachedData[[]InvoiceRow], error) {
	client, err := a.getAPIClient()
	if err != nil {
		return CachedData[[]InvoiceRow]{}, err
	}

	isFalse := false
	invoices, err := client.Invoices.ListAll(a.ctx, &easyvapi.InvoiceListOptions{
		IsTemplate: &isFalse,
	})
	if err != nil {
		return CachedData[[]InvoiceRow]{}, fmt.Errorf("Rechnungen konnten nicht geladen werden: %w", err)
	}

	cachedMembers, err := a.GetMembers(department)
	if err != nil {
		return CachedData[[]InvoiceRow]{}, fmt.Errorf("Mitglieder konnten nicht geladen werden: %w", err)
	}
	members := cachedMembers.Data

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

	res := CachedData[[]InvoiceRow]{
		UpdatedAt: time.Now().Format(time.RFC3339),
		Data:      rows,
	}

	a.mu.Lock()
	a.invoiceCache[department] = res
	a.mu.Unlock()

	_ = saveToDiskCache(fmt.Sprintf("invoices_%s.json", department), res)

	return res, nil
}

// GetInvoiceItems returns all line items for the given invoice ID.
func (a *App) GetInvoiceItems(invoiceID int) ([]InvoiceItemRow, error) {
	client, err := a.getAPIClient()
	if err != nil {
		return nil, err
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
	client, err := a.getAPIClient()
	if err != nil {
		return err
	}
	a.mu.RLock()
	conf := a.extConf
	a.mu.RUnlock()

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

	_, err = client.Bookings.Create(a.ctx, model.BookingCreate{
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
	client, err := a.getAPIClient()
	if err != nil {
		return FinanceOverview{}, err
	}
	a.mu.RLock()
	conf := a.extConf
	a.mu.RUnlock()

	var ov FinanceOverview

	cached, err := a.GetOpenInvoices(department)
	if err == nil {
		for _, inv := range cached.Data {
			ov.OpenInvoices += inv.PaymentDifference
		}
		ov.InvoiceCount = len(cached.Data)
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

// ExportInvoicesExcel exports all open invoices of the given department as an Excel file.
func (a *App) ExportInvoicesExcel(department string) (string, error) {
	cached, err := a.GetOpenInvoices(department)
	if err != nil {
		return "", err
	}
	invoices := cached.Data

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Offene Rechnungen exportieren",
		DefaultFilename: fmt.Sprintf("Offene_Rechnungen_%s.xlsx", strings.ReplaceAll(department, " ", "_")),
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel-Tabelle (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Offene Rechnungen"
	f.SetSheetName("Sheet1", sheet)

	headerFill, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"111111"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "F5C400", Size: 11, Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: false},
		Border: []excelize.Border{
			{Type: "bottom", Color: "F5C400", Style: 2},
		},
	})
	cellStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	cellStyleAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F5F5F5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	numberStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	numberStyleAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F5F5F5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})

	amountStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "right"},
		NumFmt:    2, // "0.00"
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	amountStyleAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F5F5F5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "right"},
		NumFmt:    2, // "0.00"
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})

	type colDef struct {
		header string
		width  float64
		getter func(InvoiceRow) interface{}
		center bool
		isAmt  bool
	}
	cols := []colDef{
		{"Rechnungs-Nr.", 16, func(i InvoiceRow) interface{} { return i.InvNumber }, true, false},
		{"Datum", 12, func(i InvoiceRow) interface{} { return i.Date }, true, false},
		{"Empfänger", 28, func(i InvoiceRow) interface{} { return i.Receiver }, false, false},
		{"Beschreibung", 32, func(i InvoiceRow) interface{} { return i.Description }, false, false},
		{"Referenz-Nr.", 16, func(i InvoiceRow) interface{} { return i.RefNumber }, true, false},
		{"Gesamtbetrag", 14, func(i InvoiceRow) interface{} { return i.TotalPrice }, false, true},
		{"Offener Betrag", 14, func(i InvoiceRow) interface{} { return i.PaymentDifference }, false, true},
		{"Gebühr", 10, func(i InvoiceRow) interface{} { return i.Charge }, false, true},
		{"Rücklastschrift", 16, func(i InvoiceRow) interface{} { return i.Chargeback }, false, true},
	}

	f.SetRowHeight(sheet, 1, 22)

	for ci, col := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellValue(sheet, cell, col.header)
		f.SetCellStyle(sheet, cell, cell, headerFill)
		f.SetColWidth(sheet, colLetter(ci+1), colLetter(ci+1), col.width)
	}

	for ri, inv := range invoices {
		row := ri + 2
		f.SetRowHeight(sheet, row, 18)
		isAlt := ri%2 == 1
		for ci, col := range cols {
			cell, _ := excelize.CoordinatesToCellName(ci+1, row)
			f.SetCellValue(sheet, cell, col.getter(inv))
			var style int
			if col.isAmt {
				if isAlt {
					style = amountStyleAlt
				} else {
					style = amountStyle
				}
			} else if col.center {
				if isAlt {
					style = numberStyleAlt
				} else {
					style = numberStyle
				}
			} else {
				if isAlt {
					style = cellStyleAlt
				} else {
					style = cellStyle
				}
			}
			f.SetCellStyle(sheet, cell, cell, style)
		}
	}

	lastCol, _ := excelize.CoordinatesToCellName(len(cols), len(invoices)+1)
	disable := false
	_ = f.AddTable(sheet, &excelize.Table{
		Range:          "A1:" + lastCol,
		Name:           "Rechnungen",
		StyleName:      "",
		ShowRowStripes: &disable,
	})
	for ci := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellStyle(sheet, cell, cell, headerFill)
	}

	f.SetSheetProps(sheet, &excelize.SheetPropsOptions{
		TabColorRGB: stringPtr("F5C400"),
	})
	f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	if err := f.SaveAs(path); err != nil {
		return "", fmt.Errorf("Excel-Datei konnte nicht gespeichert werden: %w", err)
	}
	return path, nil
}
