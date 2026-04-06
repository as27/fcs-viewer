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
	"gopkg.in/yaml.v3"
)

const externalConfigURL = "https://as27.github.io/fcspichdata/extern_conf.yaml.age"

// ExternalConfig represents the decrypted YAML configuration.
type ExternalConfig struct {
	Version     string       `yaml:"version"`
	GeneratedAt string       `yaml:"generated_at"`
	Departments []Department `yaml:"departments"`
	Vars struct {
		BaseURL string `yaml:"base_url"`
		Token   string `yaml:"token"`
	} `yaml:"vars"`
}

// Department maps a name to a list of group short IDs.
type Department struct {
	Name     string   `yaml:"name"`
	GroupIDs []string `yaml:"group_ids"`
}

// MemberRow is a flat representation of a member for the frontend.
type MemberRow struct {
	ID               int    `json:"id"`
	MembershipNumber string `json:"membershipNumber"`
	FirstName        string `json:"firstName"`
	FamilyName       string `json:"familyName"`
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

	mu         sync.RWMutex
	extConf    *ExternalConfig
	confErr    string
	apiClient  *easyvapi.Client
	memberCache map[string][]MemberRow // key: department name
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{
		memberCache: make(map[string][]MemberRow),
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
	// Clear member cache – config may have changed
	a.mu.Lock()
	a.memberCache = make(map[string][]MemberRow)
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

	a.mu.Lock()
	a.extConf = &conf
	a.confErr = ""
	if conf.Vars.Token != "" {
		a.apiClient = easyvapi.New(conf.Vars.Token,
			easyvapi.WithBaseURL(conf.Vars.BaseURL))
	}
	a.mu.Unlock()
}

// GetSettings returns the current settings for display in the frontend.
func (a *App) GetSettings() Settings {
	s := Settings{
		ConfigURL: externalConfigURL,
	}

	if a.loader != nil {
		s.PublicKey = a.loader.PublicKey()
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	s.ConfigError = a.confErr
	if a.extConf != nil {
		s.ActiveModules = Conf.ActiveModules
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
	filter := make(map[string]bool, len(Conf.ActiveDepartments))
	for _, n := range Conf.ActiveDepartments {
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

// dateOnly returns the date portion (YYYY-MM-DD) of a datetime string.
func dateOnly(s string) string {
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}

func memberToRow(m model.Member) MemberRow {
	var groups, shorts []string
	for _, mg := range m.MemberGroups {
		if mg.MemberGroup.Name != "" {
			groups = append(groups, mg.MemberGroup.Name)
		}
		if mg.MemberGroup.Short != "" {
			shorts = append(shorts, mg.MemberGroup.Short)
		}
	}

	cd := m.ContactDetails
	return MemberRow{
		ID:               m.ID,
		MembershipNumber: m.MembershipNumber,
		FirstName:        cd.FirstName,
		FamilyName:       cd.FamilyName,
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
