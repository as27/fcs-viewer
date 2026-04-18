package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/as27/ageloader"
	"github.com/as27/easyvapi"
	"github.com/as27/easyvapi/model"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
	"gopkg.in/yaml.v3"
)

const externalConfigURL = "https://as27.github.io/fcspichdata/extern_conf.yaml.age"

const AppVersion = "0.91.16"

// KeyEntry represents a single key entry in the external configuration.
type KeyEntry struct {
	Name        string   `yaml:"name"`
	Tool        string   `yaml:"tool"`
	PublicKey   string   `yaml:"public_key"`
	Departments []string `yaml:"departments"`
	Modules     []string `yaml:"modules"`
}

// ExternalConfig represents the decrypted YAML configuration.
type ExternalConfig struct {
	Version     string       `yaml:"version"`
	GeneratedAt string       `yaml:"generated_at"`
	Departments []Department `yaml:"departments"`
	Modules     []string     `yaml:"modules"`
	Keys        map[string]KeyEntry `yaml:"keys"`
	Vars        struct {
		BaseURL string `yaml:"base_url"`
		Token   string `yaml:"token"`
	} `yaml:"vars"`
}

// Department maps a name to a list of group short IDs.
type Department struct {
	Name           string   `yaml:"name"`
	GroupIDs       []string `yaml:"group_ids"`
	BankAccountIDs []int    `yaml:"bank_account_ids"`
}

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

// FinanceOverview holds aggregated finance statistics for the overview card.
type FinanceOverview struct {
	IncomeMonth  float64 `json:"incomeMonth"`
	ExpenseMonth float64 `json:"expenseMonth"`
	BalanceMonth float64 `json:"balanceMonth"`
	OpenInvoices float64 `json:"openInvoices"`
	InvoiceCount int     `json:"invoiceCount"`
}

// MemberRow is a flat representation of a member for the frontend.
type MemberRow struct {
	ID               int    `json:"id"`
	MembershipNumber string `json:"membershipNumber"`
	FirstName        string `json:"firstName"`
	FamilyName       string `json:"familyName"`
	Age              int    `json:"age"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Mobile           string `json:"mobile"`
	DateOfBirth      string `json:"dateOfBirth"`
	Street           string `json:"street"`
	Zip              string `json:"zip"`
	City             string `json:"city"`
	JoinDate         string `json:"joinDate"`
	ResignationDate  string `json:"resignationDate"`
	Groups           string `json:"groups"`
	GroupShorts      string `json:"groupShorts"`
}

// GroupDetail holds resolved details for a single member group.
type GroupDetail struct {
	ID          int    `json:"id"`
	Short       string `json:"short"`
	Name        string `json:"name"`
	Description string `json:"description"`
	NotFound    bool   `json:"notFound"` // true if short name had no match in API
}

// DepartmentDetail combines config data with resolved group details.
type DepartmentDetail struct {
	Name   string        `json:"name"`
	Groups []GroupDetail `json:"groups"`
}

// Settings holds the current app settings for the frontend.
type Settings struct {
	Version       string   `json:"version"`
	PublicKey     string   `json:"publicKey"`
	BaseURL       string   `json:"baseURL"`
	TokenMasked   string   `json:"tokenMasked"`
	ConfigURL     string   `json:"configURL"`
	ConfigError   string   `json:"configError"`
	ActiveModules []string `json:"activeModules"`
}

// App is the main Wails application struct.
type App struct {
	ctx    context.Context
	loader *ageloader.Loader

	mu                sync.RWMutex
	extConf           *ExternalConfig
	confErr           string
	apiClient         *easyvapi.Client
	memberCache       map[string][]MemberRow  // key: department name
	invoiceCache      map[string][]InvoiceRow // key: department name
	activeModules     []string
	activeDepartments []string
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{
		memberCache:  make(map[string][]MemberRow),
		invoiceCache: make(map[string][]InvoiceRow),
	}
}

func configDir() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = "."
	}
	return filepath.Join(dir, "fcs-viewer")
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	cfgDir := configDir()
	keyPath := filepath.Join(cfgDir, "identity.age")
	cacheDir := filepath.Join(cfgDir, "cache")

	loader, err := ageloader.New(keyPath, cacheDir)
	if err != nil {
		a.confErr = fmt.Sprintf("Fehler beim Initialisieren des Schlüssels: %v", err)
		return
	}
	a.loader = loader

	a.loadExternalConfig()
}

// ReloadConfig forces a fresh download of the external configuration and
// reinitialises the API client. Returns the updated Settings.
func (a *App) ReloadConfig() Settings {
	if a.loader != nil {
		// Invalidate cache so Open fetches fresh data
		_ = a.loader.Invalidate(externalConfigURL)
	}
	// Clear caches – config may have changed
	a.mu.Lock()
	a.memberCache = make(map[string][]MemberRow)
	a.invoiceCache = make(map[string][]InvoiceRow)
	a.mu.Unlock()

	a.loadExternalConfig()
	return a.GetSettings()
}

func (a *App) loadExternalConfig() {
	if a.loader == nil {
		return
	}
	rc, err := a.loader.Open(a.ctx, externalConfigURL, false)
	if err != nil {
		a.mu.Lock()
		a.confErr = fmt.Sprintf("Externe Konfiguration konnte nicht geladen werden: %v", err)
		a.mu.Unlock()
		return
	}
	defer rc.Close()

	var conf ExternalConfig
	if err := yaml.NewDecoder(rc).Decode(&conf); err != nil {
		a.mu.Lock()
		a.confErr = fmt.Sprintf("Fehler beim Parsen der Konfiguration: %v", err)
		a.mu.Unlock()
		return
	}

	// Resolve active modules and departments from the key entry matching our public key.
	var activeModules, activeDepartments []string
	if a.loader != nil {
		pubKey := a.loader.PublicKey()
		// Strip "age1" prefix for map lookup — keys in YAML start with "age1..."
		// The YAML map key is the full public key truncated to its first segment.
		// Find matching entry by comparing public_key field.
		for _, entry := range conf.Keys {
			if entry.PublicKey == pubKey {
				activeModules = entry.Modules
				activeDepartments = entry.Departments
				break
			}
		}
	}
	// Fallback to global modules list if key has none defined (admin access).
	if len(activeModules) == 0 {
		activeModules = conf.Modules
	}

	a.mu.Lock()
	a.extConf = &conf
	a.confErr = ""
	a.activeModules = activeModules
	a.activeDepartments = activeDepartments
	if conf.Vars.Token != "" {
		a.apiClient = easyvapi.New(conf.Vars.Token,
			easyvapi.WithBaseURL(conf.Vars.BaseURL))
	}
	a.mu.Unlock()
}

// GetSettings returns the current settings for display in the frontend.
func (a *App) GetSettings() Settings {
	s := Settings{
		Version:   AppVersion,
		ConfigURL: externalConfigURL,
	}

	if a.loader != nil {
		s.PublicKey = a.loader.PublicKey()
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	s.ConfigError = a.confErr
	if a.extConf != nil {
		s.ActiveModules = a.activeModules
		s.BaseURL = a.extConf.Vars.BaseURL
		tok := a.extConf.Vars.Token
		if len(tok) > 8 {
			s.TokenMasked = tok[:4] + strings.Repeat("*", len(tok)-8) + tok[len(tok)-4:]
		} else {
			s.TokenMasked = strings.Repeat("*", len(tok))
		}
	}
	return s
}

// GetDepartments returns the list of department names from the external config.
func (a *App) GetDepartments() []string {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.extConf == nil {
		return nil
	}
	filter := make(map[string]bool, len(a.activeDepartments))
	for _, n := range a.activeDepartments {
		filter[n] = true
	}
	var names []string
	for _, d := range a.extConf.Departments {
		if len(filter) == 0 || filter[d.Name] {
			names = append(names, d.Name)
		}
	}
	return names
}

// GetDepartmentOverview returns all departments with their resolved group details.
func (a *App) GetDepartmentOverview() ([]DepartmentDetail, error) {
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

	// Load all groups once
	allGroups, err := client.MemberGroups.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Gruppen konnten nicht geladen werden: %w", err)
	}

	// Build lookup: short → group
	byShort := make(map[string]struct {
		ID          int
		Name        string
		Description string
	}, len(allGroups))
	for _, g := range allGroups {
		byShort[g.Short] = struct {
			ID          int
			Name        string
			Description string
		}{g.ID, g.Name, g.Description}
	}

	result := make([]DepartmentDetail, 0, len(conf.Departments))
	for _, dept := range conf.Departments {
		groups := make([]GroupDetail, 0, len(dept.GroupIDs))
		for _, short := range dept.GroupIDs {
			if g, ok := byShort[short]; ok {
				groups = append(groups, GroupDetail{
					ID:          g.ID,
					Short:       short,
					Name:        g.Name,
					Description: g.Description,
				})
			} else {
				groups = append(groups, GroupDetail{
					Short:    short,
					NotFound: true,
				})
			}
		}
		result = append(result, DepartmentDetail{Name: dept.Name, Groups: groups})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

// GetMembers returns the cached members for the given department.
// If the cache is empty, it fetches from the API.
func (a *App) GetMembers(department string) ([]MemberRow, error) {
	a.mu.RLock()
	cached, ok := a.memberCache[department]
	a.mu.RUnlock()
	if ok {
		return cached, nil
	}
	return a.loadMembers(department)
}

// ReloadMembers clears the cache and fetches fresh data from the API.
func (a *App) ReloadMembers(department string) ([]MemberRow, error) {
	a.mu.Lock()
	delete(a.memberCache, department)
	a.mu.Unlock()
	return a.loadMembers(department)
}

func (a *App) loadMembers(department string) ([]MemberRow, error) {
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

	// Find the department
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

	// Resolve group short names to integer IDs
	groupIDs, err := a.resolveGroupIDs(dept.GroupIDs)
	if err != nil {
		return nil, fmt.Errorf("Gruppen konnten nicht aufgelöst werden: %w", err)
	}

	// Fetch members per group separately (API uses AND for multiple group IDs)
	// and deduplicate by member ID.
	seen := make(map[int]bool)
	var rows []MemberRow
	for _, gid := range groupIDs {
		opts := &easyvapi.MemberListOptions{
			MemberGroups: []int{gid},
		}
		members, err := client.Members.ListAll(a.ctx, opts)
		if err != nil {
			return nil, fmt.Errorf("Mitglieder für Gruppe %d konnten nicht geladen werden: %w", gid, err)
		}
		today := time.Now().Format("2006-01-02")
		for _, m := range members {
			if !seen[m.ID] {
				if m.ResignationDate != "" && dateOnly(m.ResignationDate) < today {
					continue
				}
				seen[m.ID] = true
				rows = append(rows, memberToRow(m))
			}
		}
	}

	a.mu.Lock()
	a.memberCache[department] = rows
	a.mu.Unlock()

	return rows, nil
}

// resolveGroupIDs maps short names to easyvapi integer group IDs.
func (a *App) resolveGroupIDs(shorts []string) ([]int, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()

	shortSet := make(map[string]bool, len(shorts))
	for _, s := range shorts {
		shortSet[s] = true
	}

	groups, err := client.MemberGroups.ListAll(a.ctx, nil)
	if err != nil {
		return nil, err
	}

	var ids []int
	for _, g := range groups {
		if shortSet[g.Short] {
			ids = append(ids, g.ID)
		}
	}
	return ids, nil
}

// CalendarInfo is a slim calendar descriptor for the frontend.
type CalendarInfo struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// CalendarEvent is a unified event/birthday record for the calendar view.
type CalendarEvent struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Start        string `json:"start"`
	End          string `json:"end"`
	AllDay       bool   `json:"allDay"`
	CalendarID   int    `json:"calendarId"`
	CalendarName string `json:"calendarName"`
	Color        string `json:"color"`
	Type         string `json:"type"` // "event" | "birthday"
}

// GetCalendars returns all calendars from the easyVerein API.
func (a *App) GetCalendars() ([]CalendarInfo, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}
	cals, err := client.Calendars.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Kalender konnten nicht geladen werden: %w", err)
	}
	result := make([]CalendarInfo, len(cals))
	for i, c := range cals {
		color := c.Color
		if color == "" {
			color = "#6366f1"
		}
		result[i] = CalendarInfo{ID: c.ID, Name: c.Name, Color: color}
	}
	return result, nil
}

// GetCalendarEvents returns all events and (optionally) member birthdays for the
// given year/month. department may be empty to skip birthday generation.
func (a *App) GetCalendarEvents(department string, year int, month int) ([]CalendarEvent, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}

	// Date range for the requested month
	startDate := fmt.Sprintf("%04d-%02d-01T00:00:00", year, month)
	firstOfNext := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
	endDate := firstOfNext.Format("2006-01-02") + "T00:00:00"

	// Load all calendars so we can tag events with name/color
	cals, err := client.Calendars.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Kalender konnten nicht geladen werden: %w", err)
	}

	calByID := make(map[int]CalendarInfo, len(cals))
	for _, c := range cals {
		color := c.Color
		if color == "" {
			color = "#6366f1"
		}
		calByID[c.ID] = CalendarInfo{ID: c.ID, Name: c.Name, Color: color}
	}

	var events []CalendarEvent

	// Fetch events per calendar to associate each event with its calendar
	for _, cal := range cals {
		evts, err := client.Events.ListAll(a.ctx, &easyvapi.EventListOptions{
			Calendar: cal.ID,
			StartGte: startDate,
			StartLte: endDate,
		})
		if err != nil {
			return nil, fmt.Errorf("Termine für Kalender '%s' konnten nicht geladen werden: %w", cal.Name, err)
		}
		color := cal.Color
		if color == "" {
			color = "#6366f1"
		}
		for _, e := range evts {
			events = append(events, CalendarEvent{
				ID:           e.ID,
				Name:         e.Name,
				Start:        e.Start,
				End:          e.End,
				AllDay:       e.AllDay,
				CalendarID:   cal.ID,
				CalendarName: cal.Name,
				Color:        color,
				Type:         "event",
			})
		}
	}

	// Add birthdays for the selected department
	if department != "" {
		members, err := a.GetMembers(department)
		if err == nil {
			monthStr := fmt.Sprintf("%02d", month)
			for _, m := range members {
				dob := m.DateOfBirth
				if len(dob) < 10 {
					continue
				}
				if dob[5:7] != monthStr {
					continue
				}
				birthYear, _ := strconv.Atoi(dob[:4])
				age := year - birthYear
				name := fmt.Sprintf("%s %s (%d)", m.FirstName, m.FamilyName, age)
				bdDate := fmt.Sprintf("%04d-%s-%s", year, dob[5:7], dob[8:10])
				events = append(events, CalendarEvent{
					ID:           -m.ID,
					Name:         name,
					Start:        bdDate,
					End:          bdDate,
					AllDay:       true,
					CalendarID:   -1,
					CalendarName: "Geburtstage",
					Color:        "#F5C400",
					Type:         "birthday",
				})
			}
		}
	}

	return events, nil
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

	// Load all non-template invoices; filter paymentDifference client-side.
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
// bankAccountID is the physical bank/cash account.
// invoiceID is used to fetch the refNumber from the API for the booking description.
func (a *App) CreateCashPayment(bankAccountID, invoiceID int, amount float64, date, invNumber, receiver string) error {
	a.mu.RLock()
	client := a.apiClient
	conf := a.extConf
	a.mu.RUnlock()
	if client == nil {
		return fmt.Errorf("API-Client nicht initialisiert")
	}

	// Fetch refNumber from the invoice directly (not available in the list query).
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
// It uses cached invoice data and loads bookings for the current month.
func (a *App) GetFinanceOverview(department string) (FinanceOverview, error) {
	a.mu.RLock()
	conf := a.extConf
	client := a.apiClient
	a.mu.RUnlock()

	var ov FinanceOverview

	// Open invoices from cache (triggers load if not yet cached)
	invoices, err := a.GetOpenInvoices(department)
	if err == nil {
		for _, inv := range invoices {
			ov.OpenInvoices += inv.PaymentDifference
		}
		ov.InvoiceCount = len(invoices)
	}

	// Bookings for the current month across all department bank accounts
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

// ExportPublicKey opens a save-file dialog and writes the public key to the chosen file.
func (a *App) ExportPublicKey() (string, error) {
	if a.loader == nil {
		return "", fmt.Errorf("Schlüssel noch nicht initialisiert")
	}
	pubKey := a.loader.PublicKey()
	if pubKey == "" {
		return "", fmt.Errorf("Kein Public Key vorhanden")
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Public Key speichern",
		DefaultFilename: "fcs-viewer-pubkey.txt",
		Filters: []runtime.FileFilter{
			{DisplayName: "Textdateien (*.txt)", Pattern: "*.txt"},
			{DisplayName: "Alle Dateien (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil // user cancelled
	}

	if err := os.WriteFile(path, []byte(pubKey+"\n"), 0o644); err != nil {
		return "", fmt.Errorf("Datei konnte nicht gespeichert werden: %w", err)
	}
	return path, nil
}

// ExportMembersExcel exports all members of the given department as an Excel file.
func (a *App) ExportMembersExcel(department string) (string, error) {
	members, err := a.GetMembers(department)
	if err != nil {
		return "", err
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Mitgliederliste exportieren",
		DefaultFilename: fmt.Sprintf("Mitglieder_%s.xlsx", strings.ReplaceAll(department, " ", "_")),
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel-Tabelle (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil // user cancelled
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Mitglieder"
	f.SetSheetName("Sheet1", sheet)

	// ── Styles ──────────────────────────────────────────────────────────────────
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

	// ── Headers ─────────────────────────────────────────────────────────────────
	type colDef struct {
		header string
		width  float64
		getter func(MemberRow) interface{}
		center bool
	}
	cols := []colDef{
		{"Nr.", 8, func(m MemberRow) interface{} { return m.MembershipNumber }, true},
		{"Nachname", 18, func(m MemberRow) interface{} { return m.FamilyName }, false},
		{"Vorname", 16, func(m MemberRow) interface{} { return m.FirstName }, false},
		{"Alter", 7, func(m MemberRow) interface{} { return m.Age }, true},
		{"Geburtsdatum", 14, func(m MemberRow) interface{} { return m.DateOfBirth }, true},
		{"E-Mail", 28, func(m MemberRow) interface{} { return m.Email }, false},
		{"Telefon", 16, func(m MemberRow) interface{} { return m.Phone }, false},
		{"Mobil", 16, func(m MemberRow) interface{} { return m.Mobile }, false},
		{"Straße", 22, func(m MemberRow) interface{} { return m.Street }, false},
		{"PLZ", 7, func(m MemberRow) interface{} { return m.Zip }, true},
		{"Stadt", 16, func(m MemberRow) interface{} { return m.City }, false},
		{"Eintritt", 12, func(m MemberRow) interface{} { return m.JoinDate }, true},
		{"Austritt", 12, func(m MemberRow) interface{} { return m.ResignationDate }, true},
		{"Gruppen", 30, func(m MemberRow) interface{} { return m.Groups }, false},
		{"Kürzel", 14, func(m MemberRow) interface{} { return m.GroupShorts }, false},
	}

	// Set row height for header
	f.SetRowHeight(sheet, 1, 22)

	for ci, col := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellValue(sheet, cell, col.header)
		f.SetCellStyle(sheet, cell, cell, headerFill)
		f.SetColWidth(sheet, colLetter(ci+1), colLetter(ci+1), col.width)
	}

	// ── Data rows ────────────────────────────────────────────────────────────────
	for ri, m := range members {
		row := ri + 2
		f.SetRowHeight(sheet, row, 18)
		isAlt := ri%2 == 1
		for ci, col := range cols {
			cell, _ := excelize.CoordinatesToCellName(ci+1, row)
			f.SetCellValue(sheet, cell, col.getter(m))
			var style int
			if col.center {
				if isAlt { style = numberStyleAlt } else { style = numberStyle }
			} else {
				if isAlt { style = cellStyleAlt } else { style = cellStyle }
			}
			f.SetCellStyle(sheet, cell, cell, style)
		}
	}

	// ── Als Tabelle formatieren (Sortieren/Filtern) ──────────────────────────────
	lastCol, _ := excelize.CoordinatesToCellName(len(cols), len(members)+1)
	disable := false
	_ = f.AddTable(sheet, &excelize.Table{
		Range:          "A1:" + lastCol,
		Name:           "Mitglieder",
		StyleName:      "",
		ShowRowStripes: &disable,
	})
	// Kopfzeilen-Style nach AddTable nochmal setzen, damit er nicht überschrieben wird
	for ci := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellStyle(sheet, cell, cell, headerFill)
	}

	// ── Sheet tab color & freeze header ─────────────────────────────────────────
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

func colLetter(n int) string {
	result := ""
	for n > 0 {
		n--
		result = string(rune('A'+n%26)) + result
		n /= 26
	}
	return result
}

func stringPtr(s string) *string { return &s }

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// dateOnly returns the date portion (YYYY-MM-DD) of a datetime string.
func dateOnly(s string) string {
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}

func calcAge(dob string) int {
	if len(dob) < 10 {
		return 0
	}
	birthYear, err1 := strconv.Atoi(dob[:4])
	birthMonth, err2 := strconv.Atoi(dob[5:7])
	birthDay, err3 := strconv.Atoi(dob[8:10])
	if err1 != nil || err2 != nil || err3 != nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - birthYear
	if now.Month() < time.Month(birthMonth) ||
		(now.Month() == time.Month(birthMonth) && now.Day() < birthDay) {
		age--
	}
	return age
}

func memberToRow(m model.Member) MemberRow {
	var groups, shorts []string
	for _, mg := range m.MemberGroups {
		if mg.Name != "" {
			groups = append(groups, mg.Name)
		}
		if mg.Short != "" {
			shorts = append(shorts, mg.Short)
		}
	}

	var cd model.ContactDetails
	if m.ContactDetails != nil {
		cd = *m.ContactDetails
	}
	return MemberRow{
		ID:               m.ID,
		MembershipNumber: m.MembershipNumber,
		FirstName:        cd.FirstName,
		FamilyName:       cd.FamilyName,
		Age:              calcAge(cd.DateOfBirth),
		Email:            cd.PrimaryEmail,
		Phone:            cd.PrivatePhone,
		Mobile:           cd.MobilePhone,
		DateOfBirth:      cd.DateOfBirth,
		Street:           cd.Street,
		Zip:              cd.Zip,
		City:             cd.City,
		JoinDate:         dateOnly(m.JoinDate),
		ResignationDate:  dateOnly(m.ResignationDate),
		Groups:           strings.Join(groups, ", "),
		GroupShorts:      strings.Join(shorts, ", "),
	}
}
